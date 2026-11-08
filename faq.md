# DayZ Server Operator Cheatsheet & FAQ

A comprehensive operational guide for managing, configuring, and maintaining DayZ Dedicated Servers with DayZ Server Manager (DSM).

---

## 1. Dedicated Server Network Ports & Firewall Rules

DayZ Dedicated Servers communicate across distinct UDP and TCP protocols for game traffic, master browser queries, remote console management, and DSM orchestration.

### Port Matrix

| Port        | Protocol | Direction       | Purpose                | Notes / NAT Guidance                                                                                                                                                 |
| :---------- | :------- | :-------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`2302`**  | `UDP`    | Inbound         | **Game Port**          | Default gameplay port. Client game traffic connects here. If running multiple server instances on the same host, increment by at least +2 (e.g., 2302, 2304).        |
| **`27016`** | `UDP`    | Inbound         | **Steam Query Port**   | Steam Master Server browser query port. Defined via `steamQueryPort = 27016;` in `serverDZ.cfg`. Essential for server discovery in the in-game and launcher browser. |
| **`2310`**  | `UDP`    | Inbound / Local | **BattlEye RCON Port** | Remote administration port defined in `battleye/BEServer.cfg` via `RConPort 2310`. Restrict access to `127.0.0.1` or authorized admin subnets.                       |
| **`4200`**  | `TCP`    | Inbound / Local | **DSM Web Console**    | HTTP frontend UI port for DayZ Server Manager dashboard.                                                                                                             |
| **`5000`**  | `TCP`    | Inbound / Local | **DSM Backend API**    | Fastify REST API and Server-Sent Events (SSE) telemetry daemon.                                                                                                      |

### Firewall Configuration Tips

- Ensure your OS firewall (Windows Advanced Firewall or Linux `iptables`/`ufw`) permits inbound UDP traffic on ports `2302` and `27016`.
- For home or NAT environments, forward UDP `2302-2305` and UDP `27016` to your host machine's static local IP.
- Never expose the BattlEye RCON port (`2310`) to the public internet without IP whitelisting.

---

## 2. Process Lifecycle & Graceful Persistence Flush

DayZ manages world persistence via an in-memory transactional database that flushes state to disk periodically and on server termination.

### The Dangers of Ungraceful Termination (`SIGKILL` / Task Manager "End Task")

- DayZ writes character positioning, inventory items, vehicle states, and base buildings to disk under `mpmissions/<mission_name>/storage_1/`.
- If the `DayZServer_x64.exe` process is killed abruptly using `SIGKILL`, `taskkill /F`, or an unexpected power cut, pending database writes are interrupted.
- Result: **Hive rollback** (players lose recent loot and revert to previous positions) or **corrupted `.bin` storage files** that prevent the server from starting cleanly.

### The Graceful Shutdown Protocol

Always trigger a shutdown via BattlEye RCON rather than terminating the process:

1. **Broadcast Warning:** Notify connected survivors ahead of time:
   ```text
   #say -1 Server restart in 5 minutes. Please find safe shelter.
   ```
2. **Execute RCON `#shutdown`:** Issue the `#shutdown` command through BattlEye RCON:
   ```text
   #shutdown
   ```
3. **World Persistence Flush:** DayZ disengages connected clients, writes out all active player transactions, flushes the `storage_1` hive to disk, and closes file handles.
4. **Process Exit:** The process terminates naturally with exit code `0`.
5. **Supervisor Watchdog:** DSM monitors process exit for up to 60 seconds after `#shutdown`. If the process fails to exit after this timeout, a fallback graceful `SIGTERM` is dispatched before any forced kill.

---

## 3. Mod Signature Keys (`.bikey`) & Distribution

DayZ verifies mod integrity using Bohemia Interactive's digital signatures (`.bisign`) paired with public verification keys (`.bikey`).

### How Mod Key Verification Works

1. Mod creators sign their compiled `.pbo` archives using a private key (`.biprivatekey`), generating a signature file (e.g., `modname.pbo.modcreator.bisign`).
2. The matching public key (`modcreator.bikey`) is packaged in the mod's `keys/` or `Key/` directory.
3. When a server boots with `verifySignatures = 2;` enabled in `serverDZ.cfg`, it loads all public keys from the server's root `keys/` directory into memory.
4. When a player connects, their client presents their local `.bisign` files. If the server does not have the corresponding `.bikey` in `keys/`, the player is kicked with the error:
   ```text
   Connection failed: Mod signature verification failed (key not accepted)
   ```

### Key Management Best Practices

- **Automated Copying:** Whenever a mod is installed or updated via Steam Workshop, extract its `.bikey` file and place it into the root `keys/` folder of the DayZ server.
- **Orphan Key Cleanup:** When removing a mod from your server's `-mod=` launch parameter, remove its associated `.bikey` from `keys/` unless another mod shares the same author key. Leftover keys unnecessarily increase signature verification overhead during client connections.
- **Do Not Delete Default Keys:** Always preserve `dayz.bikey` and official Bohemia keys in the `keys/` folder.

---

## 4. Scoped Backup Geometries & Disaster Recovery

Backing up a DayZ server does not require archiving tens of gigabytes of static game binaries on every snapshot. DSM categorizes backups into granular scopes:

### Recommended Backup Scopes

| Backup Scope                 | Target Directories                     | Typical Size    | Frequency                 | Description                                                                                                                             |
| :--------------------------- | :------------------------------------- | :-------------- | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Persistence Hive**         | `mpmissions/<mission>/storage_1/`      | ~10 MB – 250 MB | Every 2–4 hours           | Contains player locations, inventories, base building objects, and vehicles. Crucial for disaster recovery after bad wipes or griefing. |
| **Mission & Economy Config** | `mpmissions/<mission>/*.xml`, `*.c`    | < 5 MB          | Before any XML edit       | Contains `types.xml`, `cfgspawnabletypes.xml`, `events.xml`, and custom mission init scripts.                                           |
| **Server Configuration**     | `serverDZ.cfg`, `battleye/*`, profiles | < 1 MB          | Daily / On change         | Server settings, admin passwords, whitelist, and port configurations.                                                                   |
| **Full Server Snapshot**     | Entire root excluding `*.log`, `*.RPT` | 2 GB – 15 GB    | Before major DayZ updates | Complete snapshot excluding volatile log files.                                                                                         |

### Recovery Recommendations

- **Pre-Wipe Snapshot:** Always execute an automatic persistence snapshot prior to performing any scheduled server wipe.
- **Atomic Rollback:** When restoring `storage_1`, ensure the server process is completely stopped. Replacing storage files while the server is running causes fatal binary conflicts and corrupts the hive.
