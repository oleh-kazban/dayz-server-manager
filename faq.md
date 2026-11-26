# DayZ Server Operator Cheatsheet & FAQ

A comprehensive operational guide for managing, configuring, and maintaining DayZ Dedicated Servers with Aegis (the DayZ Server Manager).

---

## 1. Dedicated Server Network Ports & Firewall Rules

DayZ Dedicated Servers communicate across distinct UDP and TCP protocols for game traffic, master browser queries, remote console management, and Aegis.

### Port Matrix

| Port        | Protocol | Direction       | Purpose                             | Notes / NAT Guidance                                                                                                                                                                                                                          |
| :---------- | :------- | :-------------- | :---------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`2302`**  | `UDP`    | Inbound         | **Game Port**                       | Default gameplay port. Client game traffic connects here. If running multiple server instances on the same host, increment by at least +2 (e.g., 2302, 2304).                                                                                 |
| **`27016`** | `UDP`    | Inbound         | **Steam Query Port**                | Steam Master Server browser query port. Defined via `steamQueryPort = 27016;` in `serverDZ.cfg`. Essential for server discovery in the in-game and launcher browser.                                                                          |
| **`2310`**  | `UDP`    | Inbound / Local | **BattlEye RCON Port**              | Remote administration port defined in the BattlEye config (`profiles/BattlEye/BEServer_x64.cfg`, or `beserver_x64.cfg` on Linux) with `RConPort 2310`. Aegis generates this file. Restrict access to `127.0.0.1` or authorized admin subnets. |
| **`4200`**  | `TCP`    | Inbound / Local | **Aegis web console (development)** | Development server of the web console. A production install will serve the console and the API on one port, which is not decided yet.                                                                                                         |
| **`5000`**  | `TCP`    | Inbound / Local | **Aegis backend API**               | Fastify REST API and Server-Sent Events (SSE). Keep it on the local network or behind a reverse proxy.                                                                                                                                        |

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
5. **Watchdog:** Aegis waits up to 60 seconds after `#shutdown` for the process to exit. If it is still running, Aegis ends it: on Linux with `SIGTERM` to the process group and then `SIGKILL` after a grace period, on Windows by force. The wait time is the setting `DSM_SERVER_STOP_TIMEOUT_MS`.

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

- **Copying (not automated yet):** Aegis does not manage keys yet, so copy them by hand until it does (planned).
- **When a mod is installed or updated:** Whenever a mod is installed or updated via Steam Workshop, extract its `.bikey` file and place it into the root `keys/` folder of the DayZ server.
- **Orphan Key Cleanup:** When removing a mod from your server's `-mod=` launch parameter, remove its associated `.bikey` from `keys/` unless another mod shares the same author key. Leftover keys unnecessarily increase signature verification overhead during client connections.
- **Do Not Delete Default Keys:** Always preserve `dayz.bikey` and official Bohemia keys in the `keys/` folder.

---

## 4. Scoped Backup Geometries & Disaster Recovery

Backing up a DayZ server does not require archiving tens of gigabytes of static game binaries on every snapshot. Aegis has no backup feature yet (it is planned). Until it does, these are the scopes worth backing up by hand:

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

## 5. Running Aegis in Production

### HTTPS

- **Put HTTPS in front of Aegis.** Run a reverse proxy (for example nginx, Caddy or Traefik) that serves the web console over HTTPS and forwards requests to the Aegis daemon.
- **Certificates are yours.** Aegis does not manage certificates. The reverse proxy obtains and renews them.
- **Restrict direct access.** Set `HOST=127.0.0.1` when the proxy runs on the same machine, so only the proxy can reach the daemon. With the default `0.0.0.0`, the daemon logs a warning at start.
- **Session key.** Leave `SESSION_SECRET` empty and Aegis creates and keeps a key in `manager-data/.session.key`. Back this file up with the rest of `manager-data/`.

### First start and lost setup credentials

On the first start Aegis writes a temporary username and password to `manager-data/setup-credentials.txt`; the console shows the location. Sign in with them, then create the root account on the setup screen. The credentials expire after 60 minutes. If you lost them or they expired, restart Aegis: it creates new setup credentials.
