# Appliance, Updater and Backups

|              |                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------- |
| **Status**   | _Planned_. Nothing in this document is implemented                                                 |
| **Verified** | Against commit `4118d1e`: the code has no packaging, service, CLI, updater or backup code          |
| **Source**   | The backlog epics below and the earlier design (RFC-002), compared with the code and the decisions |
| **Audience** | Maintainers and AI agents                                                                          |

This is the plan for how Aegis is shipped, installed, updated and backed up on someone's server. Every statement describes the target, not the current state. Where the earlier design, the backlog and the decisions disagree, the section says so.

## 1. Backlog map

| Epic                                                     | Items                                 | State   |
| :------------------------------------------------------- | :------------------------------------ | :------ |
| `DSM-00144` Appliance packaging, services, CLI (P0)      | `DSM-00271` to `DSM-00276`            | Backlog |
| `DSM-00145` Self-updater with reconnection               | `DSM-00277` to `DSM-00284`            | Backlog |
| `DSM-00118` Backups, snapshots, controlled wipe          | `DSM-00214` to `DSM-00220` (and more) | Backlog |
| `DSM-00146` Clean-install wizard                         | `DSM-00285` to `DSM-00287`            | Backlog |
| `DSM-00147` Ports: allocation, probe, reachability       | `DSM-00288` and following             | Backlog |
| `DSM-00159` SteamCMD health, auto-detect, guided install | `DSM-00340` to `DSM-00347`            | Backlog |

## 2. Decisions that apply

- **Production serving.** One Fastify process serves the built web app and `/api/v1` on one port, same origin. An optional reverse proxy adds HTTPS and must not buffer SSE ([overview](overview.md#decided)). The static-file serving is not written yet, and it belongs to `DSM-00271` and `DSM-00272`.
- **Node.js.** The latest LTS, pinned, and bundled with the appliance.
- **First run.** An empty database opens a setup screen that creates the `root` account. A host command resets a lost root password (`DSM-00275`).
- **Game servers outlive Aegis.** Stopping or updating Aegis never stops DayZ. Aegis finds the running server again at boot (`reconcile`, see the [backend](backend.md#1-startup-and-shutdown)).

## 3. Undecided

- **Distribution format.** The backlog and the earlier design describe an archive with a bundled Node runtime (an "appliance directory"). A Docker image and a source install were also named. The choice is open.
- **Exposure and TLS.** Whether Aegis listens on the LAN only or on the internet, the default `HOST`, the default port, and whether Aegis terminates TLS itself.
- **Backup scopes.** The earlier design names four scopes (economy files, persistence storage, configuration, full install and database). The backlog names three (profiles, configs, full install, `DSM-00218`). They differ.
- **Update signing.** Archives are checksummed (SHA-256) and signed (`DSM-00276`, `DSM-00279`). The signature scheme and key handling are not chosen.

## 4. Appliance layout

The shape in the backlog and the earlier design: the code is disposable and the data is kept.

```text
<install root>/
├── bin/                # launcher and bundled Node runtime (the CLI: aegis / aegis.exe)
├── app/                # the application: server bundle, built web app, production node_modules
└── manager-data/       # database, backups, logs, update staging; kept across updates
```

Reasons the design gives for a directory and not a single executable:

- **`noexec` temp folders.** Hardened Linux hosts mount `/tmp` with `noexec`, and self-extracting executables unpack there.
- **Native module.** `better-sqlite3` is a compiled `.node` file that the loader needs as a real file.
- **Small updates.** Only `app/` (a few megabytes) is replaced, not the Node runtime.
- **Safe state.** Replacing code cannot delete the database or the backups.

The CLI is named `aegis` in the backlog (`bin/aegis`, `aegis.exe`). The earlier design called it `dsm`; use `aegis`.

### Services

- **Windows:** the service is managed with WinSW. WinSW must not end child processes when the service stops, and the DSM process must be stopped alone: `taskkill /T` on it would end DayZ too, because DayZ is a descendant by parent pid even when detached (`DSM-00162` verified this).
- **Linux:** a generated systemd unit with `KillMode=process`, so a restart leaves the DayZ process running.
- **CLI:** run in the background, install and remove the service (`DSM-00273`, `DSM-00274`), and reset a password without the web app (`DSM-00275`).

## 5. Self-updater

The flow in `DSM-00145`:

1. The `/settings/app` page shows whether a newer release exists on GitHub Releases (`DSM-00277`).
2. **Apply** downloads the bundle into `manager-data/staging`, verifies the SHA-256 checksum and the signature (`DSM-00278`, `DSM-00279`).
3. Aegis takes a snapshot of the SQLite database (`DSM-00280`): a WAL checkpoint, then the SQLite online backup API.
4. Aegis starts a detached swap helper, announces the restart over SSE and exits cleanly.
5. The helper waits for the old process to end, moves `app/` aside, puts the new `app/` in place and restarts the service (`DSM-00281`).
6. The browser shows a blocking overlay (`DSM-00282`, `DSM-00283`), polls `GET /api/v1/health` with `no-store` about every 1.5 s, and reloads when the health answer reports the new version.
7. If the new version fails its health check, the old `app/` and the snapshot come back (`DSM-00284`).

Windows and Linux differ because Windows locks files that are in use. Windows needs the detached helper (a script that waits for the pid to exit, then swaps the folders). Linux can swap the folder or a symlink atomically while the process runs.

Facts about the code that this plan must take into account:

- **The health endpoint has no version.** `GET /api/v1/health` returns `status`, `uptime` and `timestamp`. The reload handshake needs a `version` field (a contract change in `libs/api-contracts`). The web app knows its own version as `APP_VERSION`.
- **Migrations are not all additive.** The design says migrations must only add, so a rollback stays possible. Existing migrations already change data (`0008` normalizes roles and paths) and drop a column (`0009` drops `launch_parameters`). A rollback therefore relies on restoring the snapshot, not on the old code reading the new schema.
- **Database backup does not exist.** See [persistence](persistence.md#5-backups).

## 6. Backups

`DSM-00118` and its items (`DSM-00214` to `DSM-00220`): create an on-demand backup, list, download and delete backups, choose a scope, restore, and keep only the last N backups per server.

The restore rules from the earlier design, which still hold:

1. **Stop the server first.** DayZ writes its persistence on shutdown, so restoring over a running server corrupts it. If the server runs, Aegis stops it through RCON `#shutdown` and waits for the exit.
2. **Safety copy.** Before extracting, Aegis zips the files it is about to overwrite.
3. **Atomic extraction** with path-traversal guards in the archive reader.
4. **Record** who restored what, with the archive checksum (this needs the audit trail, which is an open question in [vision](../product/vision-and-scope.md)).
5. **Broadcast** the result to the connected consoles.

Backup archives live in `manager-data/backups`. The old design listed the folder layout `economy`, `storage`, `configs` and `full`, which depends on the undecided scopes in section 3.

## 7. Other epics in this area

- **Clean install** (`DSM-00146`): install the DayZ server files with SteamCMD into an empty folder (`DSM-00285`), generate a baseline `serverDZ.cfg` and BattlEye config (`DSM-00286`), and create the server from the create dialog (`DSM-00287`). It builds on the [Steam](steam.md) runner, which cannot download yet.
- **Ports** (`DSM-00147`): refuse overlapping ports between servers (`DSM-00288`), check that ports are free before start (`DSM-00289`), and probe reachability.
- **SteamCMD health** (`DSM-00159`): let the SteamCMD path be "not configured", detect and install SteamCMD, check it at startup and before every operation, and disable Steam features with an explanation.

## 8. Order of work

The epics depend on each other:

1. Static serving and the packaging items (`DSM-00271`, `DSM-00272`) make a runnable product. The services and the password reset CLI follow.
2. The first-run root setup needs the role change and belongs with the CLI, because the reset command and the setup screen both create or change the root account.
3. The updater needs the appliance layout, the health `version` field and the database snapshot.
4. Backups, the install wizard and the port checks are independent of the packaging and can go in any order.
