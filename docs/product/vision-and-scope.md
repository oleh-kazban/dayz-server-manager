# Vision and Scope

|              |                                                                             |
| :----------- | :-------------------------------------------------------------------------- |
| **Status**   | Draft for product owner review                                              |
| **Audience** | Maintainers and AI agents                                                   |
| **Related**  | [Architecture overview](../architecture/overview.md), [Backlog](backlog.md) |

## 1. Vision

Aegis is a self-hosted web console for administering DayZ Dedicated Servers. It replaces batch scripts, hand-edited XML and log digging with one console that supervises the server, edits its configuration safely, and tells the operator what happened.

The product purpose is the **DayZ Server Manager (DSM)**. `Aegis` is the product name and the package scope (`@aegis/*`).

Aegis runs on the host of the game server, on Windows x64 or Linux x64. Server data and credentials stay under the operator's control. There is no cloud component.

## 2. Pillars

Every feature is judged against four pillars.

| Pillar           | What it means in practice                                                                                                                                                                                       |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**     | Secrets are encrypted at rest. Credentials never appear in URLs or logs. Processes start from argument arrays, never shell strings.                                                                             |
| **Consistency**  | One way to do each thing: naming, API contracts, forms, feedback, UI components. A deviation is a defect.                                                                                                       |
| **Comfort**      | Every action gives explicit feedback. Destructive or disruptive actions are confirmed, recoverable and observable.                                                                                              |
| **Modern UI/UX** | Modern means more than a responsive layout. The console is fast, accessible and themeable, works on a desktop and on a phone, animates smoothly, and includes thoughtful touches that make routine work easier. |

## 3. Operating principles

These follow from the pillars and apply to every operational feature.

1. **Safe changes.** Validate, show a diff, back up, apply atomically, record the revision.
2. **Safe shutdown.** Stop the game through BattlEye RCON `#shutdown` first, so DayZ flushes persistence. Force-kill only after a timeout.
3. **Files stay native.** Game files remain in the DayZ layout on disk. The database holds only Aegis state and projections.
4. **Honest status.** Show missing or unsupported capabilities as such. Never present an unavailable integration as healthy.
5. **OS independence.** Domain logic does not depend on Windows or Linux specifics. OS differences sit behind platform adapters.
6. **Multi-server.** One installation manages several server instances on the same host. Each instance has a stable ID.

## 4. Users

The users are **operators**: people who administer DayZ servers, such as a server owner or a community admin. Aegis has two fixed roles. It is not a content management system and has no custom roles or permission bundles.

| Role      | Who                                                              | Can do                                                                                                                          |
| :-------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Root**  | The person who installs Aegis. Created on first run, exactly one | Everything an admin can, plus manage operators: create, disable and delete admins, reset their passwords, revoke their sessions |
| **Admin** | Added by root                                                    | Full access to servers, mods, configuration, Steam and maintenance. No access to operator management                            |

Rules:

- Root is the first account, created by a setup screen on an empty database. A one-time token printed to the server log protects that screen. There is no default password.
- Root cannot be deleted or demoted, and root cannot be transferred for now.
- A lost root password is reset with a CLI command run on the host. The CLI belongs to the appliance epic (`DSM-00144`). Until it exists, recovery means editing the database by hand.
- An admin sees only their own sessions. Root sees all operators and their sessions.

## 5. Scope

### In scope

Each area maps to epics in the [backlog](backlog.md). The [feature map](feature-map.md) shows what is built.

| Area                 | Capability                                                                              |
| :------------------- | :-------------------------------------------------------------------------------------- |
| Operator access      | Sign-in, sessions, profile, themes                                                      |
| Server registry      | Register servers, validate paths, select the active server                              |
| Process supervision  | Start, graceful stop, restart, force stop, crash detection, re-adoption after a restart |
| Server configuration | `serverDZ.cfg` editor with locks and revisions, BattlEye config, launch parameters      |
| Steam and mods       | SteamCMD integration, Workshop search, mod list and load order, `.bikey` keys           |
| Monitoring           | Dashboard, host and process telemetry, logs (`.RPT`, `.ADM`, script)                    |
| Economy              | `types.xml` and related files: large-file editing, validation, diff                     |
| Players              | Roster, kick and ban, messages through RCON                                             |
| Maintenance          | Restart scheduler, backups, restore, wipe                                               |
| Audit                | Record of administrative actions                                                        |
| Notifications        | Discord webhooks and bot                                                                |
| World                | Player map and loot heatmap                                                             |
| Appliance            | Packaging as a service, self-update, clean-install wizard                               |

### Out of scope

- Replacing the DayZ engine, Steam Workshop, BattlEye or third-party mod behavior.
- Custom roles, fine-grained permissions and multi-tenant isolation. Aegis has two fixed roles; see [Users](#4-users).
- Managing servers on other hosts. This is undecided; see open question 6. For now one installation manages the servers on its own host.
- Simulating data a game server does not provide. Missing data is reported as unavailable.

## 6. Open questions

These need a product decision. The old specs assumed answers that conflict with the current direction, so nothing below is stated as fact.

1. **Server groups and fleet view.** The old spec had server groups, an all-servers view and per-server permissions. The code supports several servers but has no groups. Keep groups in scope, or drop them?
2. **Game-side telemetry.** The old spec made the map, loot heatmap and server FPS depend on a separately installed DSM DayZ telemetry mod. Is that mod planned, or do these features rely on logs and RCON only?
3. **Audit integrity.** The old spec asked for tamper-evident audit logs (hash chaining). Keep that requirement or use a plain append-only table?
4. **Multi-factor authentication.** The old spec listed MFA as planned. In scope?
5. **Support access.** The old spec had a temporary, audited access role for support. With two fixed roles, drop it?
6. **Multi-host.** The old spec left multi-host management and remote agents undecided. Confirm that single host is the scope for now.
7. **Task orchestration.** The old spec required a managed task system with resource locks for long-running actions (restore, wipe, mod deployment). The `tasks` table in the old persistence draft does not exist. Confirm this is wanted before the maintenance epics start.
