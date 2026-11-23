# Product Backlog: DayZ Server Manager (`DSM`)

> **Project Acronym:** `DSM`
> **Last Updated:** `2026-11-18 22:30`
> **Next Available ID:** `DSM-00358`

---

## 1. Backlog Summary Matrix

| PBI ID      | Title                                                                                    | Type    | Priority        | Status        | Depends On                                                      |
| :---------- | :--------------------------------------------------------------------------------------- | :------ | :-------------- | :------------ | :-------------------------------------------------------------- |
| `DSM-00101` | Instant Pre-Bootstrap Animated Splash Screen                                             | `Story` | `P0 (Critical)` | `DONE`        | `None`                                                          |
| `DSM-00102` | Theme-Aware Pre-Bootstrap Loading State and Accessibility                                | `Story` | `P1 (High)`     | `DONE`        | `DSM-00101`                                                     |
| `DSM-00103` | Seamless In-App Bootstrapping and Route Transition Continuity                            | `Story` | `P1 (High)`     | `DONE`        | `DSM-00101`                                                     |
| `DSM-00104` | Full-Stack Monorepo Architecture and Application Bootstrapping                           | `Task`  | `P0 (Critical)` | `DONE`        | `None`                                                          |
| `DSM-00105` | Aegis Design System UI Kit Component Library                                             | `Story` | `P0 (Critical)` | `DONE`        | `DSM-00104`                                                     |
| `DSM-00106` | Storybook Component Catalog and Interactive Documentation                                | `Task`  | `P2 (Medium)`   | `DONE`        | `DSM-00105`                                                     |
| `DSM-00107` | Operator Authentication and Secure Sign-In Experience                                    | `Story` | `P0 (Critical)` | `DONE`        | `DSM-00104`, `DSM-00105`                                        |
| `DSM-00108` | Unified Toast Notification Dispatcher and Error Translation                              | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`, `DSM-00105`                                        |
| `DSM-00109` | Personal Settings Workbench and Stateful Active Sessions                                 | `Story` | `P1 (High)`     | `DONE`        | `DSM-00107`, `DSM-00108`                                        |
| `DSM-00110` | Dual Visual Theme Palette and Dynamic Style Switching                                    | `Story` | `P2 (Medium)`   | `DONE`        | `DSM-00105`, `DSM-00109`                                        |
| `DSM-00111` | Comprehensive Multilingual i18n Localization and Language Switcher (Epic)                | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00322`–`DSM-00327`                                         |
| `DSM-00112` | Server Operational Overview and Live Telemetry Dashboard (Epic)                          | `Epic`  | `P0 (Critical)` | `TODO`        | `DSM-00184`–`DSM-00188`                                         |
| `DSM-00113` | Server Process Supervisor and OS Lifecycle Engine (Epic)                                 | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00160`–`DSM-00172`                                         |
| `DSM-00114` | Steam A2S Query Engine and Tri-Vector Server Watchdog (Epic)                             | `Epic`  | `P3 (Low)`      | `BACKLOG`     | `DSM-00189`–`DSM-00193`                                         |
| `DSM-00115` | Server-Sent Events (SSE) Real-Time Telemetry and Event Dispatcher (Epic)                 | `Epic`  | `P3 (Low)`      | `BACKLOG`     | `DSM-00173`–`DSM-00175`                                         |
| `DSM-00116` | In-Game Players Workbench and Live RCON Moderation Console (Epic)                        | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00194`–`DSM-00205`                                         |
| `DSM-00117` | Real-Time Streaming Logs and Combat Forensics Console (Epic)                             | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00206`–`DSM-00213`                                         |
| `DSM-00118` | Scoped Server Backups, Snapshots, and Controlled Wipe Engine (Epic)                      | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00214`–`DSM-00221`                                         |
| `DSM-00119` | Steam Workshop Mod Management, Load Order, and Key Distribution (Phase 1)                | `Story` | `P1 (High)`     | `DONE`        | `DSM-00105`, `DSM-00126`                                        |
| `DSM-00120` | Central Economy XML Workbench and Schema Validator (Epic)                                | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00222`–`DSM-00231`                                         |
| `DSM-00121` | Static Documentation Pipeline, FAQ Modal, and Release History Integration                | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`, `DSM-00105`                                        |
| `DSM-00122` | OS-Agnostic Hardware Resource Telemetry and Adaptive Sampling Windows (Epic)             | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00176`–`DSM-00183`                                         |
| `DSM-00123` | Server Filesystem Inspector and Mission Discovery Service                                | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`                                                     |
| `DSM-00124` | serverDZ.cfg Raw Editor, Validator, Edit Locks, Revisions, and BattlEye Sync             | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`, `DSM-00123`, `DSM-00136`                           |
| `DSM-00125` | DayZ CLI Launch Parameter Compiler and Process Execution Contract                        | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`, `DSM-00124`                                        |
| `DSM-00126` | Steam Integration Workbench, Interactive Authentication, and Credential Vault            | `Story` | `P0 (Critical)` | `DONE`        | `DSM-00104`, `DSM-00105`, `DSM-00107`, `DSM-00108`              |
| `DSM-00127` | Host Filesystem Directory Picker and BrowseInput Component (Epic)                        | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00328`–`DSM-00333`                                         |
| `DSM-00128` | Aegis Console Rebrand, Namespace Migration (`@aegis/*`), and Brand Header UX             | `Story` | `P1 (High)`     | `DONE`        | `DSM-00101`, `DSM-00105`                                        |
| `DSM-00129` | Toolchain Modernization, Parallel CI/PR Workflows, and Automated PR Summary              | `Task`  | `P1 (High)`     | `DONE`        | `DSM-00104`                                                     |
| `DSM-00130` | Multi-Line Release History Sync and Static Content Parser Hardening                      | `Bug`   | `P1 (High)`     | `DONE`        | `DSM-00121`                                                     |
| `DSM-00131` | Multi-Agent SKILL.md Presets, UI/UX Design, and Security Audit Workflows                 | `Task`  | `P2 (Medium)`   | `DONE`        | `DSM-00104`                                                     |
| `DSM-00132` | Animated Unread Notification Bell, Notification Store, and Popup Positioning             | `Story` | `P1 (High)`     | `DONE`        | `DSM-00105`, `DSM-00108`, `DSM-00121`                           |
| `DSM-00133` | SteamCMD Workshop Mod Downloading, Progress Streaming, and `.bikey` Keys (P2) (Epic)     | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00334`–`DSM-00339`                                         |
| `DSM-00134` | Aegis Theme Token Resolution (`@theme inline`), Contrast, and Motion Freeze              | `Bug`   | `P1 (High)`     | `DONE`        | `DSM-00105`, `DSM-00106`, `DSM-00110`                           |
| `DSM-00135` | DayZ 6-Pair Theme Palette System (Cold, Neutral, Warm) and 3x2 Selector Grid             | `Story` | `P2 (Medium)`   | `DONE`        | `DSM-00110`, `DSM-00134`                                        |
| `DSM-00136` | Shared CodeMirror 6 `CodeEditor` with Inline Diagnostics and Read-Only Ranges            | `Story` | `P1 (High)`     | `DONE`        | `DSM-00105`                                                     |
| `DSM-00137` | Form UX Conventions: Change-Aware Save, Submit-Time Validation, Result Toasts            | `Story` | `P1 (High)`     | `DONE`        | `DSM-00105`, `DSM-00108`                                        |
| `DSM-00138` | Unsaved-Changes Navigation Guard for Create/Update Forms                                 | `Story` | `P2 (Medium)`   | `DONE`        | `DSM-00137`                                                     |
| `DSM-00139` | Interactive System Telemetry Workbench and Historical Performance Analytics (Epic)       | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00232`–`DSM-00238`                                         |
| `DSM-00140` | Server Maintenance Operations, Automated Restart Scheduler, and Join Locks (Epic)        | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00239`–`DSM-00246`                                         |
| `DSM-00141` | Tactical GIS Interactive World Map and Real-Time Entity Tracking (Epic)                  | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00247`–`DSM-00255`                                         |
| `DSM-00142` | Central Economy Spatial Loot Distribution and Zone Heatmap (Epic)                        | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00256`–`DSM-00261`                                         |
| `DSM-00143` | Multi-Channel Discord Webhooks and Event Dispatcher (Epic)                               | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00262`–`DSM-00270`                                         |
| `DSM-00144` | Cross-Platform Appliance Packaging, Daemon Services (WinSW/systemd), CLI (Epic)          | `Epic`  | `P0 (Critical)` | `BACKLOG`     | `DSM-00271`–`DSM-00276`                                         |
| `DSM-00145` | Staged Blue-Green In-App Self-Updater with Heartbeat Reconnection Protocol (Epic)        | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00277`–`DSM-00284`                                         |
| `DSM-00146` | Automated DayZ Server Clean Installation Wizard & Path Scaffolding (Epic)                | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00285`–`DSM-00287`                                         |
| `DSM-00147` | Host Port Allocation, Socket Availability Probe, and NAT Reachability Checker (Epic)     | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00288`–`DSM-00290`                                         |
| `DSM-00148` | Bidirectional Discord Bot with Role-Guarded Slash Command Execution (Epic)               | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00291`–`DSM-00297`                                         |
| `DSM-00149` | Scheduled RCON In-Game Chat Broadcast and Periodic Message Announcer (Epic)              | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00298`–`DSM-00300`                                         |
| `DSM-00150` | Tebex / Custom Storefront Integration and Automated VIP Priority Queue Billing (Epic)    | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00301`–`DSM-00306`                                         |
| `DSM-00152` | AI-Powered Crash Diagnostics, Error Forensics, and Natural Language Economy (Epic)       | `Epic`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00311`–`DSM-00315`                                         |
| `DSM-00159` | SteamCMD Dependency Health: Auto-Detect, Guided Install, and Graceful Degradation (Epic) | `Epic`  | `P1 (High)`     | `BACKLOG`     | `DSM-00340`–`DSM-00347`                                         |
| `DSM-00160` | ProcessManager Platform Adapter (Windows Process Tree / Linux Process Groups)            | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`                                                     |
| `DSM-00161` | BattlEye RCON packet codec and login handshake                                           | `Story` | `P1 (High)`     | `DONE`        | `DSM-00104`                                                     |
| `DSM-00162` | Server Lifecycle State Machine, Start, and Force-Stop                                    | `Story` | `P1 (High)`     | `DONE`        | `DSM-00124`, `DSM-00125`, `DSM-00160`                           |
| `DSM-00163` | Gracefully stop a running server via RCON #shutdown                                      | `Story` | `P1 (High)`     | `DONE`        | `DSM-00162`, `DSM-00165`                                        |
| `DSM-00164` | Show live server status in the shell                                                     | `Story` | `P1 (High)`     | `DONE`        | `DSM-00162`, `DSM-00173`                                        |
| `DSM-00165` | Send an RCON command and receive its full response                                       | `Story` | `P1 (High)`     | `DONE`        | `DSM-00161`                                                     |
| `DSM-00166` | Keep an RCON session alive and disconnect cleanly                                        | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00161`                                                     |
| `DSM-00167` | Delay a graceful stop with an in-game warning and cancellation                           | `Story` | `P1 (High)`     | `DONE`        | `DSM-00163`                                                     |
| `DSM-00168` | Restart a server (graceful stop, then start)                                             | `Story` | `P1 (High)`     | `DONE`        | `DSM-00167`                                                     |
| `DSM-00169` | Start the active server from the UI                                                      | `Story` | `P1 (High)`     | `DONE`        | `DSM-00164`                                                     |
| `DSM-00170` | Force-stop the active server with a warning confirmation                                 | `Story` | `P1 (High)`     | `DONE`        | `DSM-00164`                                                     |
| `DSM-00171` | Gracefully stop the active server with a delay choice                                    | `Story` | `P1 (High)`     | `DONE`        | `DSM-00164`, `DSM-00167`                                        |
| `DSM-00172` | Restart the active server from the UI                                                    | `Story` | `P1 (High)`     | `DONE`        | `DSM-00171`, `DSM-00168`                                        |
| `DSM-00173` | Shared web SSE subscription that updates the query cache                                 | `Task`  | `P1 (High)`     | `DONE`        | `None`                                                          |
| `DSM-00174` | Replay missed SSE events after reconnect (Last-Event-ID)                                 | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00173`                                                     |
| `DSM-00175` | Move the Steam auth challenge onto the shared SSE subscription                           | `Task`  | `P3 (Low)`      | `BACKLOG`     | `DSM-00173`                                                     |
| `DSM-00176` | Spike: process and host resource sampling on Windows and Linux                           | `Spike` | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00177` | Sample the DayZ server process's CPU and memory                                          | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00176`, `DSM-00162`                                        |
| `DSM-00178` | Sample host CPU, memory and disk headroom                                                | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00177`                                                     |
| `DSM-00179` | Push telemetry samples over SSE at a selectable interval                                 | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00177`                                                     |
| `DSM-00180` | Add telemetry rollup table (migration)                                                   | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00181` | Persist per-minute telemetry rollups and query them by range                             | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00177`, `DSM-00180`                                        |
| `DSM-00182` | Sample process disk I/O, network traffic and handle count                                | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00177`                                                     |
| `DSM-00183` | Telemetry update-interval selector in the console header                                 | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00179`, `DSM-00173`                                        |
| `DSM-00184` | Dashboard hero with server identity, connection info and uptime                          | `Story` | `P0 (Critical)` | `TODO`        | `None`                                                          |
| `DSM-00185` | Dashboard CPU and memory KPI cards                                                       | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00184`, `DSM-00178`, `DSM-00179`                           |
| `DSM-00186` | Dashboard player count KPI card                                                          | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00184`, `DSM-00190`                                        |
| `DSM-00187` | Dashboard quick lifecycle actions                                                        | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00184`, `DSM-00169`, `DSM-00171`, `DSM-00172`, `DSM-00170` |
| `DSM-00188` | Dashboard recent alerts and running tasks panel                                          | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00184`, `DSM-00334`                                        |
| `DSM-00189` | Steam A2S_INFO query client                                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00190` | Expose live query info for a running server                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00189`, `DSM-00162`                                        |
| `DSM-00191` | Mark a server running only once it answers A2S                                           | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00189`, `DSM-00162`                                        |
| `DSM-00192` | A2S_PLAYER and A2S_RULES queries                                                         | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00189`                                                     |
| `DSM-00193` | Detect a frozen server and raise an alert                                                | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00189`, `DSM-00166`                                        |
| `DSM-00194` | List connected players via RCON                                                          | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00165`                                                     |
| `DSM-00195` | Players page: read-only table of connected players                                       | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00194`                                                     |
| `DSM-00196` | Broadcast a global in-game message                                                       | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00165`, `DSM-00195`                                        |
| `DSM-00197` | Kick a player with a reason                                                              | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00195`                                                     |
| `DSM-00198` | Ban a player with duration and reason                                                    | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00195`                                                     |
| `DSM-00199` | List and lift bans                                                                       | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00198`                                                     |
| `DSM-00200` | Send a direct message to one player                                                      | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00195`                                                     |
| `DSM-00201` | Spike: resolve Steam64 and DayZ IDs for connected players                                | `Spike` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00194`                                                     |
| `DSM-00202` | Show Steam64 and Steam persona / avatar for players                                      | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00201`                                                     |
| `DSM-00203` | Show player country from IP                                                              | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00195`                                                     |
| `DSM-00204` | Manage the server whitelist                                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00123`                                                     |
| `DSM-00205` | Manage the priority queue list                                                           | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00123`                                                     |
| `DSM-00206` | Stream the active RPT log over SSE                                                       | `Story` | `P1 (High)`     | `DONE`        | `DSM-00162`                                                     |
| `DSM-00207` | LogViewer component in @aegis/ui                                                         | `Task`  | `P1 (High)`     | `IN_PROGRESS` | `None`                                                          |
| `DSM-00208` | Live RPT viewer at /logs/rpt                                                             | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00206`, `DSM-00173`, `DSM-00207`                           |
| `DSM-00209` | Follow the RPT log to the new file after a restart                                       | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00206`                                                     |
| `DSM-00210` | Filter log lines by severity and text                                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00208`                                                     |
| `DSM-00211` | Download the full current log file                                                       | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00206`                                                     |
| `DSM-00212` | Live ADM log view at /logs/adm                                                           | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00208`                                                     |
| `DSM-00213` | Live script log view at /logs/script                                                     | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00208`                                                     |
| `DSM-00214` | Create an on-demand backup of server persistence                                         | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00162`                                                     |
| `DSM-00215` | Backups page: list backups and create one                                                | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00214`                                                     |
| `DSM-00216` | Download a backup archive                                                                | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00215`                                                     |
| `DSM-00217` | Delete a backup with confirmation                                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00215`                                                     |
| `DSM-00218` | Choose backup scope: profiles, configs or full install                                   | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00215`                                                     |
| `DSM-00219` | Restore a persistence backup                                                             | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00215`                                                     |
| `DSM-00220` | Keep only the last N backups per server                                                  | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00217`                                                     |
| `DSM-00221` | Wipe server persistence with keyword confirmation                                        | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00214`                                                     |
| `DSM-00222` | Spike: parse and edit a large types.xml in a Web Worker without losing formatting        | `Spike` | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00223` | View types.xml in a read-only editor                                                     | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00123`, `DSM-00136`                                        |
| `DSM-00224` | Edit and save types.xml in the raw editor                                                | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00223`                                                     |
| `DSM-00225` | Virtualised rows for the Table component                                                 | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00226` | Browse types.xml as a virtualised table                                                  | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00222`, `DSM-00223`, `DSM-00225`                           |
| `DSM-00227` | Filter types by name, category, usage and tier                                           | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00226`                                                     |
| `DSM-00228` | Edit one type's values from the table                                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00226`, `DSM-00224`                                        |
| `DSM-00229` | Batch-edit nominal, min and lifetime for selected types                                  | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00228`                                                     |
| `DSM-00230` | Validate types.xml values and references                                                 | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00224`                                                     |
| `DSM-00231` | View and edit cfgspawnabletypes.xml in the raw editor                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00224`                                                     |
| `DSM-00232` | TimeSeriesChart component in @aegis/ui                                                   | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00233` | Live CPU and memory charts at /system                                                    | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00178`, `DSM-00179`, `DSM-00173`, `DSM-00232`              |
| `DSM-00234` | Historical time-range selector (15m, 1h, 6h, 24h)                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00233`, `DSM-00181`                                        |
| `DSM-00235` | Disk I/O and network charts                                                              | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00233`, `DSM-00182`                                        |
| `DSM-00236` | Per-core host CPU chart                                                                  | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00233`                                                     |
| `DSM-00237` | Server process tree inspector                                                            | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00233`                                                     |
| `DSM-00238` | Memory-growth warning for the server process                                             | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00234`                                                     |
| `DSM-00239` | Add restart schedule table (migration)                                                   | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00240` | Create daily restart times and see the next run                                          | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00239`                                                     |
| `DSM-00241` | Run scheduled restarts                                                                   | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00240`, `DSM-00168`                                        |
| `DSM-00242` | Countdown warnings before scheduled restarts                                             | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00241`, `DSM-00165`                                        |
| `DSM-00243` | Edit, disable and delete restart schedules                                               | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00240`                                                     |
| `DSM-00244` | Back up persistence before each scheduled restart                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00241`, `DSM-00214`                                        |
| `DSM-00245` | Lock the server to new joins during maintenance                                          | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00165`                                                     |
| `DSM-00246` | Emergency kill that preserves diagnostics                                                | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00170`                                                     |
| `DSM-00247` | Spike: map tile source and licensing                                                     | `Spike` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00248` | MapCanvas component with DayZ coordinate system                                          | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `DSM-00247`                                                     |
| `DSM-00249` | Show the Chernarus map at /world/map                                                     | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00247`, `DSM-00248`                                        |
| `DSM-00250` | Cursor coordinate readout and click-to-copy                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00249`                                                     |
| `DSM-00251` | Switch between Livonia, Sakhal and Namalsk                                               | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00249`                                                     |
| `DSM-00252` | Toggle topographic and satellite layers                                                  | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00249`                                                     |
| `DSM-00253` | Measure distance on the map                                                              | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00249`                                                     |
| `DSM-00254` | Spike: source of player positions without mods                                           | `Spike` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00212`                                                     |
| `DSM-00255` | Plot last known player positions on the map                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00249`, `DSM-00254`, `DSM-00212`                           |
| `DSM-00256` | Spike: derive loot spawn points from mission files                                       | `Spike` | `P3 (Low)`      | `BACKLOG`     | `DSM-00249`                                                     |
| `DSM-00257` | Loot spawn-point density heatmap overlay                                                 | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00256`, `DSM-00249`                                        |
| `DSM-00258` | Filter the loot heatmap by category                                                      | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00257`                                                     |
| `DSM-00259` | Show spawn clusters for one item classname                                               | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00257`                                                     |
| `DSM-00260` | Overlay economy tier zones                                                               | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00256`, `DSM-00249`                                        |
| `DSM-00261` | Per-tier loot summary panel                                                              | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00260`                                                     |
| `DSM-00262` | Store Discord webhook settings with encrypted URLs (migration)                           | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00263` | Configure the staff webhook and send a test message                                      | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00262`                                                     |
| `DSM-00264` | Post server crash alerts to the staff webhook                                            | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00263`, `DSM-00162`                                        |
| `DSM-00265` | Post server online / offline to a community webhook                                      | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00263`                                                     |
| `DSM-00266` | Choose which events each webhook receives                                                | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00265`, `DSM-00264`                                        |
| `DSM-00267` | Retry and rate-limit outbound webhook posts                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00263`                                                     |
| `DSM-00268` | Post scheduled restart warnings to the community webhook                                 | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00265`, `DSM-00242`                                        |
| `DSM-00269` | Post backup results to the staff webhook                                                 | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00263`, `DSM-00214`                                        |
| `DSM-00270` | Post kick and ban events to the staff webhook                                            | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00263`, `DSM-00197`, `DSM-00198`                           |
| `DSM-00271` | Build a self-contained Windows appliance                                                 | `Story` | `P0 (Critical)` | `BACKLOG`     | `None`                                                          |
| `DSM-00272` | Build a self-contained Linux appliance                                                   | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00271`                                                     |
| `DSM-00273` | Install and remove DSM as a Windows service                                              | `Story` | `P0 (Critical)` | `BACKLOG`     | `DSM-00271`                                                     |
| `DSM-00274` | Install and remove DSM as a systemd service                                              | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00272`                                                     |
| `DSM-00275` | Reset an operator password from the CLI                                                  | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00271`                                                     |
| `DSM-00276` | Publish signed appliance archives to GitHub Releases                                     | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00271`, `DSM-00272`                                        |
| `DSM-00277` | Show whether a newer release is available                                                | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00276`                                                     |
| `DSM-00278` | Download and checksum-verify an update bundle                                            | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00277`                                                     |
| `DSM-00279` | Verify the update bundle's signature                                                     | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00278`                                                     |
| `DSM-00280` | Back up the SQLite database before applying an update                                    | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00278`                                                     |
| `DSM-00281` | Apply an update through a detached swap while game servers keep running                  | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00279`, `DSM-00280`, `DSM-00273`                           |
| `DSM-00282` | BlockingOverlay component in @aegis/ui                                                   | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00283` | Update-in-progress overlay that reconnects when DSM is back                              | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00281`, `DSM-00282`                                        |
| `DSM-00284` | Roll back when the updated DSM fails its health check                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00281`                                                     |
| `DSM-00285` | Install DayZ server files via SteamCMD into an empty directory                           | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00334`, `DSM-00345`                                        |
| `DSM-00286` | Generate baseline serverDZ.cfg and BattlEye config for a fresh install                   | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00285`                                                     |
| `DSM-00287` | Create a server from a fresh install in the Create Server dialog                         | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00286`                                                     |
| `DSM-00288` | Refuse overlapping ports between registered servers                                      | `Story` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00289` | Check ports are free on the host before start                                            | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00162`                                                     |
| `DSM-00290` | Spike: public reachability check for server ports                                        | `Spike` | `P3 (Low)`      | `BACKLOG`     | `None`                                                          |
| `DSM-00291` | Connect a Discord bot and show its connection status                                     | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00262`                                                     |
| `DSM-00292` | /status slash command                                                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00291`                                                     |
| `DSM-00293` | Restrict bot commands to mapped Discord roles                                            | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00291`                                                     |
| `DSM-00294` | /restart slash command                                                                   | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00293`, `DSM-00168`                                        |
| `DSM-00295` | /players slash command                                                                   | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00293`, `DSM-00194`                                        |
| `DSM-00296` | /say slash command                                                                       | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00293`, `DSM-00165`                                        |
| `DSM-00297` | /kick and /ban slash commands                                                            | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00293`, `DSM-00197`, `DSM-00198`                           |
| `DSM-00298` | Store announcement messages (migration)                                                  | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00299` | Manage rotating announcement messages                                                    | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00298`                                                     |
| `DSM-00300` | Broadcast announcements in rotation while the server runs                                | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00299`, `DSM-00165`                                        |
| `DSM-00301` | Spike: Tebex webhook model and exposure of a public endpoint                             | `Spike` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00302` | Grant priority queue from a verified Tebex purchase                                      | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00301`, `DSM-00205`                                        |
| `DSM-00303` | Revoke priority queue when a Tebex subscription ends                                     | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00302`                                                     |
| `DSM-00304` | Grant whitelist from a Tebex purchase                                                    | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00302`, `DSM-00204`                                        |
| `DSM-00305` | Purchase grant / revoke audit log                                                        | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00302`                                                     |
| `DSM-00306` | Generic signed payment webhook                                                           | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00302`                                                     |
| `DSM-00311` | Configure a BYOK AI provider and test the connection                                     | `Story` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00312` | Explain an RPT crash with the likely faulting mod                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00311`, `DSM-00206`                                        |
| `DSM-00313` | Support additional AI providers including local Ollama                                   | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00311`                                                     |
| `DSM-00314` | Natural-language economy tuning as a reviewable types.xml diff                           | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00311`, `DSM-00228`                                        |
| `DSM-00315` | Ask natural-language questions about ADM combat logs                                     | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00311`, `DSM-00212`                                        |
| `DSM-00322` | Move shell, navigation and breadcrumb strings into the en-US dictionary                  | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00323` | Ukrainian translation for shell, navigation and common actions                           | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00322`                                                     |
| `DSM-00324` | Persist the operator's interface language                                                | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00325` | Choose interface language in Personal Settings                                           | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00323`, `DSM-00324`                                        |
| `DSM-00326` | Move form labels and feedback messages into the dictionary                               | `Task`  | `P3 (Low)`      | `BACKLOG`     | `DSM-00322`                                                     |
| `DSM-00327` | German and French translations                                                           | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00325`, `DSM-00326`                                        |
| `DSM-00328` | List host directories for the picker (admin only)                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00329` | BrowseInput component in @aegis/ui                                                       | `Task`  | `P2 (Medium)`   | `CANCELLED`   | `None`                                                          |
| `DSM-00330` | DirectoryList component in @aegis/ui                                                     | `Task`  | `P2 (Medium)`   | `BACKLOG`     | `None`                                                          |
| `DSM-00331` | Host directory picker dialog                                                             | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00328`, `DSM-00330`                                        |
| `DSM-00332` | Browse for Steam settings paths                                                          | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00331`                                                     |
| `DSM-00333` | Browse for server settings paths                                                         | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00331`                                                     |
| `DSM-00334` | Background task registry with progress events                                            | `Story` | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00335` | Download one Workshop mod via SteamCMD                                                   | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00334`, `DSM-00345`                                        |
| `DSM-00336` | Show mod download progress in the mods list                                              | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00335`, `DSM-00173`                                        |
| `DSM-00337` | Copy a mod's .bikey into the server keys folder on enable                                | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00119`                                                     |
| `DSM-00338` | Remove a mod's key when it is disabled or removed                                        | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00337`                                                     |
| `DSM-00339` | Running-tasks indicator in the header                                                    | `Story` | `P3 (Low)`      | `BACKLOG`     | `DSM-00334`, `DSM-00173`                                        |
| `DSM-00340` | Allow the SteamCMD path to be 'not configured'                                           | `Task`  | `P1 (High)`     | `BACKLOG`     | `None`                                                          |
| `DSM-00341` | Show 'Not configured' and live path status in Steam settings                             | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00340`                                                     |
| `DSM-00342` | Auto-detect SteamCMD installations                                                       | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00340`                                                     |
| `DSM-00343` | Install SteamCMD for me                                                                  | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00340`                                                     |
| `DSM-00344` | Check SteamCMD at startup and expose dependency health                                   | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00340`                                                     |
| `DSM-00345` | Preflight SteamCMD check before every SteamCMD operation                                 | `Story` | `P1 (High)`     | `BACKLOG`     | `DSM-00340`                                                     |
| `DSM-00346` | Disable SteamCMD features with an explanation                                            | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00344`                                                     |
| `DSM-00347` | Startup health notification and dashboard banner                                         | `Story` | `P2 (Medium)`   | `BACKLOG`     | `DSM-00344`, `DSM-00184`                                        |
| `DSM-00348` | Keep access tokens out of SSE URLs and request logs                                      | `Story` | `P1 (High)`     | `DONE`        | `DSM-00173`                                                     |
| `DSM-00349` | Confirmation dialogs open with focus on Cancel, not the close button                     | `Bug`   | `P2 (Medium)`   | `BACKLOG`     | `DSM-00105`                                                     |
| `DSM-00350` | Show how a stopped server last ended on the Maintenance page                             | `Story` | `P3 (Low)`      | `DONE`        | `DSM-00164`                                                     |
| `DSM-00351` | Import the shared Vitest config with a file extension                                    | `Task`  | `P3 (Low)`      | `DONE`        | `None`                                                          |
| `DSM-00352` | Keep a stopping server stopping when it is re-adopted after a DSM restart                | `Bug`   | `P3 (Low)`      | `BACKLOG`     | `DSM-00168`                                                     |
| `DSM-00353` | FileUploader UI Kit Component with Drop Zone and Drag-and-Drop                           | `Story` | `P1 (High)`     | `DONE`        | `DSM-00105`                                                     |
| `DSM-00354` | Mod Preset Contracts, Batched Hydration, and Atomic Server Import API                    | `Story` | `P1 (High)`     | `DONE`        | `DSM-00119`                                                     |
| `DSM-00355` | Import Mods Modal with Dual-Input, Strategy Selector, and Diff Preview                   | `Story` | `P1 (High)`     | `DONE`        | `DSM-00353`, `DSM-00354`                                        |
| `DSM-00356` | Export Mod Preset Action in Mods Management Console                                      | `Story` | `P2 (Medium)`   | `DONE`        | `DSM-00354`                                                     |
| `DSM-00357` | Measure `.ts` Files in Web App Coverage (not a defect)                                   | `Task`  | `P1 (High)`     | `DONE`        | `None`                                                          |

---

## 2. Product Backlog Items (PBIs)

### [DSM-00101] Instant Pre-Bootstrap Animated Splash Screen

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `None`
- **High-Level Requirements**:
  When a user opens the application on slow network connections, an animated Aegis logo is displayed immediately in the center of the viewport before JavaScript bundles are downloaded and executed. The pre-bootstrap markup renders with critical self-contained styles to avoid any blank white screen or flash of unstyled content, providing clear visual confirmation that the application is launching. Once React mounts, the initial splash screen seamlessly yields to the mounting application root without visual breakage.
- **Scope Boundaries**:
  - **Included**:
    - Critical inline SVG and CSS assets in `apps/web/index.html` (`#dsm-splash`, `.aegis-logo.is-loading`, `@keyframes aegis-tent-loading` / `aegis-bridge-loading` with `perspective: 900px`).
    - Clean React root mounting handoff in `apps/web/src/main.tsx` (`__dsmRoot` replacing `#dsm-splash` inside `#root`).
  - **Excluded / Deferred**: Pre-bootstrap theme persistence detection (`DSM-00102`), in-app route pending fallback visual alignment (`DSM-00103`).
- **Implementation Notes**: Splash markup and CSS live directly in `apps/web/index.html` so it renders before Vite module chunks load; `apps/web/src/styles/animations/logo.css` mirrors the in-app logo motion classes.

---

### [DSM-00102] Theme-Aware Pre-Bootstrap Loading State and Accessibility

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00101`
- **High-Level Requirements**:
  When a user with an active dark theme preference or system dark mode launches the application, the pre-bootstrap splash screen displays matching background and logo palette colors instantly to prevent jarring white-screen flashes. The pre-bootstrap loader respects user motion preferences by disabling spinning 3D animations when reduced motion is preferred. Accessible labeling informs screen readers and assistive technology that the application is currently loading.
- **Scope Boundaries**:
  - **Included**:
    - Synchronous pre-bootstrap script in `apps/web/index.html` reading `localStorage` (`dsm-theme-settings` / `dsm-theme-preference`) and setting `data-theme` on `documentElement` before first paint.
    - Light/dark/preferred-scheme CSS custom properties (`--splash-bg`, `--splash-fg-main`, `--splash-fg-secondary`) plus `@media (prefers-reduced-motion: reduce)` animation suppression.
    - Screen-reader accessible status semantics (`role="status"`, `aria-live="polite"`, `.sr-only`) on `#dsm-splash`.
  - **Excluded / Deferred**: In-app React router loading transitions and hydration coordination (`DSM-00103`).
- **Implementation Notes**: Keep the inline head script and CSS under the 4 KB splash budget enforced by Vitest (`splash.spec.ts`); superseded light/dark theme IDs were later expanded into the 12-theme map in `DSM-00135`.

---

### [DSM-00103] Seamless In-App Bootstrapping and Route Transition Continuity

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00101`
- **High-Level Requirements**:
  When the JavaScript bundle finishes bootstrapping React, TanStack Router, and TanStack Query, the visual experience transitions smoothly from the pre-bootstrap splash into the application shell. The in-app root pending fallback (`RootLoader`) is aligned with the animated Aegis logo identity to prevent layout shift or generic spinner regressions while initial authentication or route data resolves. A subtle reveal/fade transition eliminates abrupt visual jumps as the final UI renders.
- **Scope Boundaries**:
  - **Included**:
    - `RootLoader` and `RootErrorFallback` in `apps/web/src/components/layout/RootFallback.tsx`.
    - `AppErrorBoundary`, `InnerApp`, and `RouterProvider` context wiring (`{ auth, features }`) in `apps/web/src/App.tsx` and `apps/web/src/router.tsx`.
  - **Excluded / Deferred**: Pre-bootstrap inline HTML markup (`DSM-00101`), pre-bootstrap theme detection script (`DSM-00102`).
- **Implementation Notes**: `InnerApp` triggers `router.invalidate()` on auth user/session transitions so protected routes re-evaluate `beforeLoad` cleanly without blank-screen flicker during HMR or initial mount.

---

### [DSM-00104] Full-Stack Monorepo Architecture and Application Bootstrapping

- **Priority**: `P0 (Critical)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `None`
- **High-Level Requirements**:
  Establish the foundational Nx monorepo architecture, developer tooling, and baseline application runtime shells for the DSM platform. Configure the Fastify backend server (`apps/server`) with environment schema validation, healthcheck probes (`/api/v1/health`), and modular Drizzle ORM database decorators. Configure the React 19 single-page application (`apps/web`) with Vite, TanStack Router topology, TanStack Query client, Tailwind CSS, and strict cross-package compile-time boundary enforcement (`libs/api-contracts`, `libs/api-client`, `libs/database`).
- **Scope Boundaries**:
  - **Included**:
    - Nx + `pnpm` workspace setup (`nx.json`, `tsconfig.base.json`, `package.json`) with module boundary enforcement and `check:cycles` (Madge).
    - Fastify backend bootstrap (`apps/server/src/main.ts`, `app/app.ts`, `config/env.ts`) and health endpoint (`GET /api/v1/health` in `apps/server/src/routes/health.ts`).
    - Drizzle ORM + `better-sqlite3` WAL persistence and `runMigrations()` (`libs/database/src/lib/{db.ts,migrations.ts,schema.ts}`).
    - Shared Zod contracts (`libs/api-contracts`), type-safe fetch client (`libs/api-client/src/lib/http-client.ts`), and React 19 + TanStack Router/Query shell (`apps/web/src/router.tsx`, `core/query/query-client.ts`).
  - **Excluded / Deferred**: Authentication routes (`DSM-00107`), splash screen (`DSM-00101`), UI kit components (`DSM-00105`).
- **Implementation Notes**: `buildApp` decorates Fastify with `db`, `sqlite`, `closeDb`, `sseHub`, and `authenticate`; client apps and `libs/api-contracts` cannot import backend packages (`better-sqlite3`, `fastify`, `node:*`).

---

### [DSM-00105] Aegis Design System UI Kit Component Library

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  Implement a cohesive, accessible, and lightweight design system component library (`libs/ui`) aligned with the Aegis pastel visual tokens. Provide foundational interactive primitives (`Button`, `Input`, `PasswordInput`, `Checkbox`, `Toggle`, `Select`, `Tag`, `TagInput`, `TagSelect`, `StatusTag`, `Badge`), feedback containers (`Card`, `HeroBanner`, `Notice`, `ProgressBar`, `Skeleton`, `Tooltip`, `EmptyState`, `KpiCard`), data presentation surfaces (`Tabs`, `Pagination`, `Breadcrumbs`, `Table`, `TableBulkActions`, `TableColumnVisibility`), and safety dialogs (`ConfirmationDialog`, `KeywordConfirmationDialog`). Ensure every component satisfies WCAG contrast, ARIA specifications, keyboard focus management, and comprehensive Vitest unit tests.
- **Scope Boundaries**:
  - **Included**:
    - Reusable component library exported from `libs/ui/src/index.ts` (`autosuggest`, `breadcrumbs`, `button`, `card`, `checkbox`, `confirmation`, `date-picker`, `empty-state`, `hero-banner`, `input`, `kpi-card`, `loader`, `menu`, `notice`, `notification-menu`, `pagination`, `progress-bar`, `select`, `skeleton`, `status-tag`, `table`, `tabs`, `tag`, `tag-input`, `toast`, `toggle`, `tooltip`).
    - Shared UI hooks (`libs/ui/src/hooks/{useDebounce.ts,usePopup.ts,useSortableList.ts}`) and design tokens/keyframes (`libs/ui/src/styles/{theme.css,themes.css,keyframes.css,fonts.css}`).
    - Vitest + React Testing Library specs alongside every primitive in `libs/ui/src/**`.
  - **Excluded / Deferred**: Storybook documentation stories (`DSM-00106`), application-level shell layouts (`PageContainer`, `Sidebar`, `Header`).
- **Implementation Notes**: Consumer apps import primitives directly from `@aegis/ui` (no intermediate `apps/web/src/components/ui` re-export layer); application shell components live in `apps/web/src/components/layout/`.

---

### [DSM-00106] Storybook Component Catalog and Interactive Documentation

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`
- **High-Level Requirements**:
  Establish an interactive Storybook environment for `libs/ui` that acts as a living style guide and visual documentation catalog for all design system primitives. Build dedicated story files for each UI component covering variant matrices, responsive viewports, state modifiers (hover, focus, disabled, loading), and dynamic theme token rendering. Configure static asset delivery to properly display brand imagery and iconography across stories.
- **Scope Boundaries**:
  - **Included**:
    - Storybook Vite setup in `libs/ui/.storybook/{main.ts,preview.tsx,StorybookThemeFrame.tsx}`.
    - Interactive CSF3 `.stories.tsx` suites colocated across all `libs/ui/src/*` component directories with Controls table bindings.
  - **Excluded / Deferred**: Automated visual regression testing CI workflows (e.g. Chromatic or Playwright screenshot comparisons).
- **Implementation Notes**: `StorybookThemeFrame.tsx` synchronizes `data-theme` on `documentElement` with the Storybook toolbar selector so all 12 Aegis palettes preview accurately (`pnpm nx run ui:build-storybook`).

---

### [DSM-00107] Operator Authentication and Secure Sign-In Experience

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00105`
- **High-Level Requirements**:
  Deliver an end-to-end authentication and operator login workflow securing the DSM management console. Provide Fastify authentication REST endpoints (`/api/v1/auth/login`, `/api/v1/auth/logout`) with SQLite operator verification and secure `scrypt` password hashing. Build the dedicated `/sign-in` view in `apps/web` featuring the branded `SignInHero`, react-hook-form + Zod validated `SignInForm`, client-side `AuthProvider` session state, and TanStack Router `beforeLoad` redirection guards.
- **Scope Boundaries**:
  - **Included**:
    - Zod contracts (`libs/api-contracts/src/lib/auth.contract.ts`) and SDK client (`libs/api-client/src/lib/endpoints/auth.ts`).
    - Fastify endpoints in `apps/server/src/routes/auth.ts` (`POST /api/v1/auth/login` rate-limited `10 / 1 min`, `/refresh`, `/logout`), `scrypt` helpers + `0001_initial_users` migration (`libs/database`), and JWT + stateful session check (`fastify.authenticate` in `apps/server/src/app/app.ts`).
    - Frontend `/sign-in` workbench (`apps/web/src/features/auth/{SignIn.tsx,AuthProvider.tsx,auth.storage.ts,signIn.schema.ts}`, `components/{SignInHero.tsx,SignInForm.tsx}`) and TanStack Router `beforeLoad` guards (`apps/web/src/router.tsx`).
  - **Excluded / Deferred**: Two-factor / multi-factor authentication (TOTP/2FA), OAuth2/OIDC identity providers, multi-session device revocation (`DSM-00109`).
- **Implementation Notes**: Auth uses `Authorization: Bearer` tokens backed by `sessions.id` (`sid` claim); `fastify.authenticate` throttles `sessions.last_active_at` SQLite writes to once per 60s to prevent WAL write contention.

---

### [DSM-00108] Unified Toast Notification Dispatcher and Error Translation

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00105`
- **High-Level Requirements**:
  Establish a unified toast notification architecture that transforms low-level REST errors and asynchronous operational mutations into clear, user-facing feedback toasts. Define structured API error contracts (`ApiErrorCode`, `ApiErrorParams`, `ApiFieldErrorsMap`) in `libs/api-contracts` and emit structured error payloads from Fastify route handlers. Mount a global `Toaster` component in `apps/web`, integrate `i18next` localized error dictionaries, and provide high-level notification helpers (`notifySuccess`, `notifyApiError`, `showToast`) that wire directly into TanStack Query mutations and form validation bindings.
- **Scope Boundaries**:
  - **Included**:
    - Structured error envelope & `ApiErrorCode` registry (`libs/api-contracts/src/lib/error.contract.ts`) plus Fastify helpers (`sendApiError`, `formatZodFieldErrors` in `apps/server/src/utils/api-error.ts`).
    - Toast primitives in `libs/ui/src/toast/{Toaster.tsx,CustomToast.tsx,toast.utils.tsx}`.
    - Frontend `i18next` error dictionaries (`apps/web/src/core/i18n/{i18n.ts,locales/en-US.ts}`) and notification dispatchers (`notifySuccess`, `notifyApiError`, `showToast` in `apps/web/src/core/notifications/notify.ts`).
  - **Excluded / Deferred**: In-app persistent notification history center; outbound Discord/webhook push notifications.
- **Implementation Notes**: API `error.params` values are intentionally constrained to flat `string | number | boolean` scalars for direct `i18next` interpolation; empty HTTP response bodies (e.g. `204` or empty `DELETE` bodies) are handled in `http-client.ts` and Fastify `addContentTypeParser`.

---

### [DSM-00109] Personal Settings Workbench and Stateful Active Sessions

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00107`, `DSM-00108`
- **High-Level Requirements**:
  Implement the Operator Profile and Personal Settings workbench (`/profile`) allowing logged-in operators to manage their credentials and regional preferences. Provide `ProfileIdentityCard` for editing callsign (display name), notification email, regional timezone, and 12h/24h time formatting. Include `PasswordRotationCard` with strict complexity requirements and a real-time password strength meter, alongside `ActiveSessionsCard` displaying stateful session tokens, parsed user-agent device signatures, client IP addresses, and remote session revocation controls.
- **Scope Boundaries**:
  - **Included**:
    - SQLite migration `0003_profile_and_sessions` (`users.display_name`, `timezone`, `time_format` + `sessions` table in `libs/database/src/lib/migrations.ts`).
    - Zod contracts (`profile.contract.ts`, `session.contract.ts`), client endpoints (`endpoints/{profile.ts,sessions.ts}`), and Fastify routes (`/api/v1/profile`, `/api/v1/auth/profile`, `/api/v1/auth/sessions` in `apps/server/src/routes/{profile.ts,sessions.ts}` + `utils/user-agent.ts`).
    - Frontend workbench at `/profile` (`apps/web/src/features/profile/{views/ProfileView.tsx,api/profile.queries.ts,api/profile.mutations.ts}`, `components/{ProfileIdentityCard.tsx,PasswordRotationCard.tsx,PasswordStrengthBar.tsx,ActiveSessionsCard.tsx}`).
  - **Excluded / Deferred**: Visual theme selection (`DSM-00110`), full UI runtime language switcher (`DSM-00111`).
- **Implementation Notes**: Profile PATCH enforces a strict field whitelist (`username` and `role` are immutable) and validates `timezone` via `Intl.DateTimeFormat`; `parseUserAgent` summarizes OS/browser per session with `isCurrent` highlighting.

---

### [DSM-00110] Dual Visual Theme Palette and Dynamic Style Switching

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`, `DSM-00109`
- **High-Level Requirements**:
  Provide a theme selection engine supporting paired light and dark palettes (e.g. Vanilla and Obsidian) with live theme switching without page reloads. Deliver `ThemeSelectorCard` within the Personal Settings workbench displaying interactive palette swatches, system preference synchronizers, and instant DOM attribute updates. Ensure operator theme preferences are persisted across browser sessions via local storage and synchronized with the backend operator profile record.
- **Scope Boundaries**:
  - **Included**:
    - Semantic CSS custom property tokens and `data-theme` definitions in `libs/ui/src/styles/{theme.css,themes.css}`.
    - React theme state & toggle (`apps/web/src/features/theme/{ThemeProvider.tsx,theme.context.ts,theme.types.ts,ThemeToggleButton.tsx}`).
    - Persistence hook (`apps/web/src/features/profile/hooks/useThemePreference.ts`) and `ThemeSelectorCard` (`apps/web/src/features/profile/components/ThemeSelectorCard.tsx`) in `/profile`.
  - **Excluded / Deferred**: Custom user-defined CSS overrides; high-contrast monochrome accessibility themes.
- **Implementation Notes**: `ThemeProvider` applies a 1-frame `.theme-switching` freeze to prevent color-transition smearing and persists selections in `localStorage` (`dsm-theme-settings`), synced with the pre-bootstrap splash script (`DSM-00102`) and expanded to 6 light/dark pairs in `DSM-00135`.

---

### [DSM-00111] Comprehensive Multilingual i18n Localization and Language Switcher

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00322`–`DSM-00327`
- **Child Items**: `DSM-00322` (Move shell, navigation and breadcrumb strings into the en-US dictionary), `DSM-00323` (Ukrainian translation for shell, navigation and common actions), `DSM-00324` (Persist the operator's interface language), `DSM-00325` (Choose interface language in Personal Settings), `DSM-00326` (Move form labels and feedback messages into the dictionary), `DSM-00327` (German and French translations).
- **High-Level Requirements**:
  Expand the DSM internationalization subsystem from the initial `en-US` error dictionary into a comprehensive multilingual localization framework. Add an interactive Language Selector in the Personal Settings workbench (`ProfileIdentityCard`), allowing operators to select their preferred interface language (e.g., English, Ukrainian, German, French). Deliver structured translation bundles for application shell navigation, breadcrumbs, common button actions, error envelopes, and workbench headers with live language switching without page reloads.
- **Scope Boundaries**:
  - **Included**: Language selection control in Personal Settings; operator profile locale persistence; additional locale translation dictionaries (`uk-UA`, `de-DE`, etc.); localized navigation, form labels, and common feedback messages.
  - **Excluded / Deferred**: Dynamic DayZ RPT/ADM log stream translation; localized Central Economy XML node definitions.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Only the `en-US` dictionary exists today (`apps/web/src/core/i18n/locales/en-US.ts`); the matrix previously showed this item as `DONE` by mistake.

---

### [DSM-00112] Server Operational Overview and Live Telemetry Dashboard

- **Priority**: `P0 (Critical)`
- **Type**: `Epic`
- **Status**: `TODO`
- **Depends On**: `DSM-00184`–`DSM-00188`
- **Child Items**: `DSM-00184` (Dashboard hero with server identity, connection info and uptime), `DSM-00185` (Dashboard CPU and memory KPI cards), `DSM-00186` (Dashboard player count KPI card), `DSM-00187` (Dashboard quick lifecycle actions), `DSM-00188` (Dashboard recent alerts and running tasks panel).
- **High-Level Requirements**:
  Deliver the operational Server Information & Overview Dashboard at `/dashboard`, replacing placeholder connectivity stubs with live operational telemetry for the active DayZ server. Render the Chernarus panorama hero banner with connection metadata (IP, query port, game port, server status indicator), KPI metric cards (live player count / queue capacity, simulation tickrate/FPS, server uptime, CPU/RAM utilization), and a quick lifecycle action toolbar (start, graceful stop, restart). Surface recent critical alerts and active background DSM task progress bars.
- **Scope Boundaries**:
  - **Included**: Operational dashboard view at `/dashboard` bound to active server context; Chernarus hero banner and connection metadata; real-time KPI telemetry cards (players, FPS, host/process CPU/RAM); quick action lifecycle controls (start, stop, restart); active task indicators.
  - **Excluded / Deferred**: Tactical GIS interactive world map (`/world/map`), historical long-term telemetry graphs (`/system`), RPT/ADM streaming log console (`/logs`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Server FPS / tickrate has no data source yet (A2S does not report it); left out until one is chosen.

---

### [DSM-00113] Server Process Supervisor and OS Lifecycle Engine

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00104`, `DSM-00123`, `DSM-00124`, `DSM-00125`
- **Child Items**: `DSM-00160` (ProcessManager adapter), `DSM-00161` (RCON codec and login), `DSM-00162` (lifecycle state machine, start / force-stop), `DSM-00163` (graceful stop), `DSM-00164` (live status in the shell), `DSM-00165` (Send an RCON command and receive its full response), `DSM-00166` (Keep an RCON session alive and disconnect cleanly), `DSM-00167` (Delay a graceful stop with an in-game warning and cancellation), `DSM-00168` (Restart a server (graceful stop, then start)), `DSM-00169` (Start the active server from the UI), `DSM-00170` (Force-stop the active server with a warning confirmation), `DSM-00171` (Gracefully stop the active server with a delay choice), `DSM-00172` (Restart the active server from the UI). The epic is `DONE` when all children are `DONE`; dependents point at the child they actually need.
- **High-Level Requirements**:
  Build the backend OS process supervisor responsible for executing and managing dedicated DayZ server instances across Windows and Linux. Spawn server instances using explicit argument arrays, assign Windows Job Objects or Linux process groups to prevent detached zombie processes, and expose Fastify REST lifecycle execution endpoints (`/api/v1/servers/:id/start`, `stop`, `restart`). Enforce safe DayZ data persistence by executing BattlEye RCON `#shutdown` first, awaiting clean world persistence flush, and gracefully falling back to OS force-kill only after timeout expiration.
- **Scope Boundaries**:
  - **Included**: Cross-platform process supervision adapter; Windows Job Object / POSIX process group lifecycle isolation; BattlEye RCON graceful shutdown sequence; launch via the `DSM-00125` execution contract (`buildLaunchCommandPreview` / `compileLaunchCommand` → `spawn(command.executable, command.args, { cwd: command.cwd, shell: false })`, refusing to start when `command.ready` is false); server start lock guard calling `assertNoActiveEditLock(serverId)` before launching the process (refusing with `409 SERVER_CONFIG_EDIT_IN_PROGRESS` while an active `serverDZ.cfg` edit lock is held); lifecycle REST endpoints and server status machine transitions (`starting`, `running`, `stopping`, `stopped`, `crashed`).
  - **Excluded / Deferred**: Steam A2S UDP query polling (`DSM-00114`), SSE real-time telemetry streaming (`DSM-00115`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00114] Steam A2S Query Engine and Tri-Vector Server Watchdog

- **Priority**: `P3 (Low)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00189`–`DSM-00193`
- **Child Items**: `DSM-00189` (Steam A2S_INFO query client), `DSM-00190` (Expose live query info for a running server), `DSM-00191` (Mark a server running only once it answers A2S), `DSM-00192` (A2S_PLAYER and A2S_RULES queries), `DSM-00193` (Detect a frozen server and raise an alert).
- **High-Level Requirements**:
  Implement a lightweight, high-performance UDP socket query engine in Node.js implementing the binary Steam A2S protocol (`A2S_INFO`, `A2S_PLAYER`, `A2S_RULES`) for DayZ dedicated servers. Deliver the Tri-Vector Watchdog background daemon that cross-references OS process footprint, Steam network responsiveness, and BattlEye RCON socket health. Detect silent server freeze states where the process PID exists but game tick execution has stalled, automatically updating server status and dispatching recovery alerts.
- **Scope Boundaries**:
  - **Included**: Binary UDP socket client implementing Steam A2S protocol; round-trip latency (ping), player counts, server title, and version parsing; tri-vector health assessment daemon; automated zombie freeze detection.
  - **Excluded / Deferred**: Fastify SSE streaming dispatcher (`DSM-00115`), in-game moderation workbench (`DSM-00116`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. No new `unresponsive` status value: freeze detection raises an alert only.

---

### [DSM-00115] Server-Sent Events (SSE) Real-Time Telemetry and Event Dispatcher

- **Priority**: `P3 (Low)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00173`–`DSM-00175`
- **Child Items**: `DSM-00173` (Shared web SSE subscription that updates the query cache), `DSM-00174` (Replay missed SSE events after reconnect (Last-Event-ID)), `DSM-00175` (Move the Steam auth challenge onto the shared SSE subscription).
- **High-Level Requirements**:
  Deliver a resilient Server-Sent Events (SSE) streaming infrastructure in Fastify broadcasting live operational telemetry and background task events to connected web clients (`/api/v1/servers/:id/telemetry/stream`). Implement bounded ring buffers, heartbeat keep-alive pings, and reconnection resume cursors (`Last-Event-ID`). Build the frontend `useServerTelemetry` hook in `apps/web` that feeds incoming telemetry frames directly into the TanStack Query cache without DOM thrashing or redundant polling.
- **Scope Boundaries**:
  - **Included**: Fastify SSE streaming route plugin with heartbeat and clean connection teardown; telemetry metric streaming payload contracts; React SSE subscription hook with TanStack Query cache synchronization.
  - **Excluded / Deferred**: RPT and ADM plain-text log streaming (`DSM-00117`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. The SSE hub (`/api/v1/realtime/sse`, 15 s heartbeat, `broadcast`) already exists in `apps/server/src/services/realtime/sse-hub.ts`; remaining scope is the shared client and replay. Telemetry streaming moved to `DSM-00122` (`DSM-00179`).

---

### [DSM-00116] In-Game Players Workbench and Live RCON Moderation Console

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00194`–`DSM-00205`
- **Child Items**: `DSM-00194` (List connected players via RCON), `DSM-00195` (Players page: read-only table of connected players), `DSM-00196` (Broadcast a global in-game message), `DSM-00197` (Kick a player with a reason), `DSM-00198` (Ban a player with duration and reason), `DSM-00199` (List and lift bans), `DSM-00200` (Send a direct message to one player), `DSM-00201` (Spike: resolve Steam64 and DayZ IDs for connected players), `DSM-00202` (Show Steam64 and Steam persona / avatar for players), `DSM-00203` (Show player country from IP), `DSM-00204` (Manage the server whitelist), `DSM-00205` (Manage the priority queue list).
- **High-Level Requirements**:
  Deliver the operational player moderation workbench at `/players`. Display the real-time connected player table with Steam avatar/persona, Steam64, DayZ Bohemia ID, and BattlEye GUID resolution alongside connection duration, IP/country geolocation, and network ping. Provide live in-game broadcast messaging (`#say` global or direct message), player kick and ban actions (custom kick reasons, ban duration presets, reason tracking), whitelist configuration, and priority queue management with role-based authorization guards.
- **Scope Boundaries**:
  - **Included**: Fastify RCON command execution endpoints; `/players` route workbench with search, pagination, and status filters; moderation action dialogs with confirmation guards (Kick, Ban, Unban, Whitelist, Priority); player identity resolver (Steam64, Bohemia ID, BattlEye GUID); live in-game broadcast message modal (`#say`).
  - **Excluded / Deferred**: Tactical GIS map coordinate tracking (`/world/map`, `DSM-00141`), historical combat forensics (`DSM-00117`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Only the `admin` role exists today (`users.role`); role-based moderation permissions are out of scope until more roles are defined.

---

### [DSM-00117] Real-Time Streaming Logs and Combat Forensics Console

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00206`–`DSM-00213`
- **Child Items**: `DSM-00206` (Stream the active RPT log over SSE), `DSM-00207` (LogViewer component in @aegis/ui), `DSM-00208` (Live RPT viewer at /logs/rpt), `DSM-00209` (Follow the RPT log to the new file after a restart), `DSM-00210` (Filter log lines by severity and text), `DSM-00211` (Download the full current log file), `DSM-00212` (Live ADM log view at /logs/adm), `DSM-00213` (Live script log view at /logs/script).
- **High-Level Requirements**:
  Deliver the real-time log investigation console at `/logs` for streaming DayZ server execution logs. Provide dedicated sub-views for Server RPT logs (`/logs/rpt`), Admin/Combat logs (`/logs/adm`), and Enforce script logs (`/logs/script`). Include continuous SSE log tailing, auto-scrolling with pause-on-scroll user detection, severity level filtering (Info, Warning, Error), high-throughput regex search, log file download, and backend log rotation detection with bounded ring buffers.
- **Scope Boundaries**:
  - **Included**: Backend log file watcher with bounded ring buffers and rotation detection; SSE log streaming endpoint; virtualized high-throughput log viewer in `apps/web` across `/logs/rpt`, `/logs/adm`, and `/logs/script`; severity filtering, timestamp parsing, regex search, and full log file download action.
  - **Excluded / Deferred**: Historical cold-storage log archiving, external Discord log forwarders (`DSM-00143`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. "Combat forensics" beyond viewing the ADM log is not specified; see `DSM-00152`.

---

### [DSM-00118] Scoped Server Backups, Snapshots, and Controlled Wipe Engine

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00214`–`DSM-00221`
- **Child Items**: `DSM-00214` (Create an on-demand backup of server persistence), `DSM-00215` (Backups page: list backups and create one), `DSM-00216` (Download a backup archive), `DSM-00217` (Delete a backup with confirmation), `DSM-00218` (Choose backup scope: profiles, configs or full install), `DSM-00219` (Restore a persistence backup), `DSM-00220` (Keep only the last N backups per server), `DSM-00221` (Wipe server persistence with keyword confirmation).
- **High-Level Requirements**:
  Implement automated and on-demand backup management and controlled server wipe orchestration at `/maintenance`. Enable granular scoped snapshots (DayZ storage/mission persistence, server profiles, configuration files, or complete installations) with gzip compression and retention policies. Deliver safe restore and wipe workflows guarded by keyword confirmation dialogs (`CONFIRM_WIPE`) and mandatory pre-wipe safety snapshots.
- **Scope Boundaries**:
  - **Included**: Backup creation, download, and deletion REST endpoints; granular backup scope selection (persistence, profiles, configs, full); atomic restore engine; controlled wipe orchestrator with automatic pre-wipe snapshots; keyword confirmation UI (`CONFIRM_WIPE`).
  - **Excluded / Deferred**: External S3/cloud object storage synchronization, automated restart scheduler and player join locks (`DSM-00140`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Restore, delete, retention and wipe each get their own PBI because they destroy or overwrite data.

---

### [DSM-00119] Steam Workshop Mod Management, Load Order, and Key Distribution (Phase 1)

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`, `DSM-00126`
- **High-Level Requirements**:
  Deliver the foundational mod lifecycle workbench at `/mods` alongside Steam Workshop lookup/search APIs and server-scoped mod persistence (`server_mods` SQLite schema & migration `0005`). Provide drag-and-drop and keyboard load order sequencing (`useSortableList`), batch/local/Workshop mod CRUD, encrypted Steam Web API key storage (`steam_settings`), upstream Workshop update detection, sortable columns with column visibility persistence, and a read-only `-mod=` / `-serverMod=` launch parameter preview.
- **Scope Boundaries**:
  - **Included**:
    - Server-scoped mod inventory (`server_mods` SQLite schema & migration `0005`) and Zod contracts/client endpoints in `libs/api-contracts` and `libs/api-client`.
    - Steam Workshop item/collection lookup, keyword search, and encrypted Steam Web API key storage in `steam_settings`.
    - Interactive `/mods` workbench with single/batch/local mod CRUD (`AddModModal`, `EditModModal`), upstream update detection & sync acknowledgement, drag-and-drop/keyboard load order sequencing (`useSortableList`), sortable columns, column configurator, and read-only `-mod=` / `-serverMod=` launch flag preview.
  - **Excluded / Deferred**:
    - SteamCMD Workshop binary downloading, async task progress streaming, and automated `.bikey` public key distribution (`DSM-00133`).
    - Custom client-side mod pack repackaging.
- **Implementation Notes**: Backend routes in `apps/server/src/routes/{server-mods.ts,workshop.ts}` and `apps/server/src/services/steam/steam-workshop.service.ts`; contracts/client in `libs/api-contracts/src/lib/mod.contract.ts` and `libs/api-client/src/lib/endpoints/mods.ts`; UI in `apps/web/src/features/mods/`.

---

### [DSM-00120] Central Economy XML Workbench and Schema Validator

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00222`–`DSM-00231`
- **Child Items**: `DSM-00222` (Spike: parse and edit a large types.xml in a Web Worker without losing formatting), `DSM-00223` (View types.xml in a read-only editor), `DSM-00224` (Edit and save types.xml in the raw editor), `DSM-00225` (Virtualised rows for the Table component), `DSM-00226` (Browse types.xml as a virtualised table), `DSM-00227` (Filter types by name, category, usage and tier), `DSM-00228` (Edit one type's values from the table), `DSM-00229` (Batch-edit nominal, min and lifetime for selected types), `DSM-00230` (Validate types.xml values and references), `DSM-00231` (View and edit cfgspawnabletypes.xml in the raw editor).
- **High-Level Requirements**:
  Deliver a high-throughput XML editing workbench at `/economy/types` for managing DayZ Central Economy (`types.xml`) and spawnable types (`cfgspawnabletypes.xml`). Offload XML parsing and schema validation to a dedicated Web Worker to maintain 60 FPS UI responsiveness across 20,000+ items. Provide virtualized table windowing, category and tier filters, batch nominal/min/lifetime editing, CodeMirror raw editor toggle (`DSM-00136`), and atomic file write with pre-commit backups (`.bak_{timestamp}`).
- **Scope Boundaries**:
  - **Included**: Web Worker XML parser/validator; virtualized data table for large item inventories; batch editing controls; CodeMirror raw XML editor view mode; atomic temporary write with rollback; `economyWorkbench` feature flag gate.
  - **Excluded / Deferred**: Spatial loot heatmap projection on GIS Leaflet maps (`/world/loot`, `DSM-00142`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00121] Static Documentation Pipeline, FAQ Modal, and Release History Integration

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00105`
- **High-Level Requirements**:
  Establish an automated static documentation packaging pipeline and deliver an accessible in-app FAQ / Help modal in `apps/web`. Maintain root `faq.md` as the single source of truth for DayZ operator cheatsheets, referenced directly in `README.md` alongside release version history links. Implement `scripts/sync-static-content.ts` to copy `faq.md` and dynamically generate `history.md` from `BACKLOG.md` into `apps/web/public/assets/content/`. Deliver `FaqModal` in `apps/web` rendering formatted markdown via `marked` with instant keyword search filtering, triggered via the header `(?)` button and keyboard shortcut (`Shift + ?`).
- **Scope Boundaries**:
  - **Included**: Root `faq.md` cheatsheet; `README.md` references to FAQ and version history; `scripts/sync-static-content.ts` asset sync and history generator; pre-build integration in `apps/web`; `useStaticDoc` TanStack Query hook; accessible `FaqModal` with `marked` rendering and search filtering; header `(?)` button integration.
  - **Excluded / Deferred**: Dynamic database-backed wiki CMS (`system_documents`), in-app WYSIWYG editor.
- **Implementation Notes**: UI lives in `apps/web/src/features/faq/{FaqModal.tsx,useFaqStore.ts,useStaticDoc.ts}` and `apps/web/src/core/markdown/{MarkdownViewer.tsx,markdown.utils.ts}`; `pnpm run docs:sync` runs `scripts/sync-static-content.ts`.

---

### [DSM-00122] OS-Agnostic Hardware Resource Telemetry and Adaptive Sampling Windows

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00176`–`DSM-00183`
- **Child Items**: `DSM-00176` (Spike: process and host resource sampling on Windows and Linux), `DSM-00177` (Sample the DayZ server process's CPU and memory), `DSM-00178` (Sample host CPU, memory and disk headroom), `DSM-00179` (Push telemetry samples over SSE at a selectable interval), `DSM-00180` (Add telemetry rollup table (migration)), `DSM-00181` (Persist per-minute telemetry rollups and query them by range), `DSM-00182` (Sample process disk I/O, network traffic and handle count), `DSM-00183` (Telemetry update-interval selector in the console header).
- **High-Level Requirements**:
  Implement an OS-agnostic hardware telemetry collector in `apps/server` (via `libs/platform`) sampling DayZ dedicated server process and host resources (core-normalized vs host CPU %, RSS working set and private committed RAM, storage headroom, disk I/O throughput, UDP network bandwidth/PPS, and open handle count) across Windows (`Win32` APIs / `pidusage`) and Linux (`/proc` pseudo-filesystem) without third-party CLI tooling or game mods. Expose configurable telemetry streaming and polling windows (e.g., 2s Live, 5s Standard, 30s Ambient) with backend ring-buffering, batched SQLite WAL persistence rollups, and frontend adaptive client throttling.
- **Scope Boundaries**:
  - **Included**: Cross-platform OS process & host hardware telemetry samplers (`SystemTelemetry` adapter); in-memory circular buffer with batched persistence; configurable update window contracts (`interval=2000 | 5000 | 30000`); console header update window selector UI controls and adaptive throttling.
  - **Excluded / Deferred**: Dedicated `/system` time-series telemetry charts and analytics workbench (`DSM-00139`), in-game player coordinate telemetry (`IngameReportDTO`), custom Enforce Script server mods, Steam A2S query polling (`DSM-00114`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Metrics the spike finds infeasible are dropped, not estimated.

---

### [DSM-00123] Server Filesystem Inspector and Mission Discovery Service

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  Build a dedicated server filesystem inspection and validation engine in `apps/server` (via `libs/platform`). Verify the physical existence and binary execution permissions of the DayZ server executable (`DayZServer_x64.exe` on Windows, `DayZServer` on Linux) under `installPath`. Automatically scan and discover installed missions under `mpmissions/` (e.g. `dayzOffline.chernarusplus`, `dayzOffline.enoch`, `dayzOffline.sakhal`), inspect the profile directory structure (`profiles/`, `profiles/BattlEye`), and verify OS write permissions. Expose validation REST endpoints (`POST /api/v1/servers/:id/validate-paths`) returning structured diagnostic issue reports for missing directories, invalid binaries, or permission errors.
- **Scope Boundaries**:
  - **Included**: Filesystem validator inspecting `installPath`, executable binary presence, profile structure, and mission folders; auto-discovery of valid DayZ missions; REST endpoint and Zod contract for server path validation; diagnostic issue codes (`MISSING_EXECUTABLE`, `MISSING_MISSION`, `PERMISSION_DENIED`).
  - **Excluded / Deferred**: Mod archive (`.pbo`) scanning (`DSM-00119`), automatic SteamCMD installation of missing files.
- **Implementation Notes**: Implemented in `apps/server/src/services/server/{server-fs-inspector.service.ts,server-path-safety.ts}`, `POST /api/v1/servers/:id/validate-paths` (`apps/server/src/routes/servers.ts`), `validateServerPathsRequestSchema` / `serverFsInspectionResultSchema` (`libs/api-contracts/src/lib/server.contract.ts`), and `StoragePathsCard.tsx` / `CreateServerModal.tsx`; enforces relative `profilePath` & `missionPath` safety inside `installPath`.

---

### [DSM-00124] serverDZ.cfg Raw Editor, Validator, Edit Locks, Revisions, and BattlEye Sync

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00123`, `DSM-00136`
- **High-Level Requirements**:
  Replace per-field gameplay UI controls with a raw text editor for `serverDZ.cfg`: the physical file is the source of truth for every key it contains (including plaintext `password` and `passwordAdmin`), while the database keeps only a read-only parsed projection for `steamQueryPort` and `maxPlayers` (`servers.missionPath` stays DB-owned and is edited via the `Active Mission` `<Select id="missionPath">` dropdown in `StoragePathsCard`, not overwritten from `serverDZ.cfg` `template`). `hostname` lives only in `serverDZ.cfg` and is decoupled from the internal DSM server `name`; the game port remains a DB-owned launch parameter (`-port=`, `DSM-00125`). Under the admin-only operator model (`'admin'` single role in Zod contracts, SQLite migration `0008_admin_only_and_unredacted_revisions`, and `apps/web` UI while preserving fail-closed `ensureAdminRole` / `requireAdmin` + `AUTH_FORBIDDEN_ADMIN_REQUIRED` backend JWT invariants), secrets in `serverDZ.cfg` are edited unmasked without sentinel redaction, `SecurityCredentialsCard` is removed, and decrypted `rconPassword: string | null` (`serverDetailSchema`, `500 VAULT_KEY_UNAVAILABLE` on vault error) is managed via `#server-rcon-password` in `Network & BattlEye RCON`. Editing `serverDZ.cfg` is allowed only while the server is stopped and opens read-only by default (`CodeEditor` `aria-readonly="true"`, `EditorView.editable.of(false)`) until clicking `Edit` acquires a pessimistic per-editor-session DB lease lock with TTL and heartbeat (`Done` restores read-only state); server start is blocked while a lock is held. Every committed write is recorded as a plaintext revision (`server_config_revisions.content`) with author, timestamp, and source. The BattlEye RCON file (`beserver_x64.cfg` / `beserver.cfg` in `<profilePath>/BattlEye/`) remains DSM-generated from `RConPassword`, `RConPort`, and `RConIP`.
- **Scope Boundaries**:
  - **Included**:
    - **Parser + validator** (pure TypeScript shared lib `libs/dayz-config` / `@aegis/dayz-config`, importable by `apps/web` and `apps/server`): Layer 1 syntax (Bohemia C-style grammar, nested `class Missions { class DayZ { template = "..."; }; };`, diagnostics with line/column); Layer 2 schema (known-key types and ranges; unknown keys → warning); Layer 3 server-side semantics (mission folder exists via `DSM-00123` inspector, `steamQueryPort` conflicts across servers). Diagnostics carry `error | warning` severity; errors block saves. Missing or unparseable `class Missions` template is an error. Client lints live; the server re-validates authoritatively.
    - **Byte fidelity**: preserve comments, formatting, CRLF/LF line endings, and UTF-8 BOM; 64 KB size cap.
    - **Plaintext config & RCON vault handling**: unmasked `serverDZ.cfg` editing and revisions (`SECRET_PLACEHOLDER`, `libs/dayz-config/src/lib/secrets.ts`, `toSecretReadOnlyRanges`, and encrypted `serverPassword` / `passwordAdmin` DB columns removed); `rconPassword` stored vault-encrypted and returned decrypted in `serverDetailSchema` for `#server-rcon-password` in `Network & BattlEye RCON`; retention cap on `.bak_{timestamp}` files.
    - **Edit locks** (`config_edit_locks` table): explicit lock acquisition when clicking `Edit` in the read-only-by-default editor (only when server is stopped), ~2 min TTL renewed by ~30 s heartbeat, release on `Done` or unmount/unload via `fetch(..., { keepalive: true })`, keyed per editor session; conflict response names holder and acquisition time (_"Being edited by X since HH:MM"_); read-only view for non-holders; admin force-takeover recorded as an audit event. Server start rejected while a non-expired lock exists.
    - **Running-server guard**: editing rejected with `SERVER_RUNNING_CONFIG_LOCKED` while the server is in any active status; status re-checked at both lock acquisition and save. Editor opens read-only when the server is running.
    - **Optimistic hash check** retained as a second line of defence: `PUT` carries the content hash it loaded; mismatch against disk (out-of-band RDP/SSH edits) returns `409`.
    - **Revisions** (`server_config_revisions` table): `server_id`, `file_kind`, `content`, `content_hash`, `updated_by`, `updated_at`, `source` (`editor | template | restore | external`); "last updated by/at" derived from the latest row; external disk drift detected on load and recorded with `source = external` (syncing `queryPort` and `maxPlayers` SQLite projection without overwriting `servers.missionPath`); retention ~50 revisions per file; diff view and one-click restore.
    - **Template bootstrap & zero-duplication create flow**: generate `serverDZ.cfg` from a baseline template when missing; `CreateServerModal` and `ServerSettingsView` omit `Max Players`, `Steam Query Port`, and duplicated create-time `Profile Path` / `Mission Path` inputs, while `POST /api/v1/servers` auto-resolves omitted fields atomically inside `sqlite.transaction(...).immediate()`.
    - **Storage & paths normalization**: migration `0009_normalize_server_profile_path` normalizes `servers.profile_path = 'profiles'` (and `POST /:id/validate-paths` uses `overrides.profilePath ?? 'profiles'`); `StoragePathsCard` uses a 1-per-row vertical stack (`grid-cols-1 gap-4`), removes `DiscoveredMissionsSection`, and exposes an auto-discovered `Active Mission` `<Select id="missionPath">` (with `\`/`/` deduplication via `normalizedMissionPath`) persisted via `PATCH /api/v1/servers/:id` inside `sqlite.transaction(...).immediate()` with `LOCKED_CONFIG_KEYS` protection.
    - **API (contract-first)**: `GET /api/v1/servers/:id/config/server-dz` (plaintext content, hash, projection, lock state, last revision); `PUT` (content + loaded hash, requires held lock); `POST .../validate` (dry-run diagnostics); lock acquire / heartbeat / release / takeover endpoints; revisions list / get / restore.
    - **UI**: `serverDZ.cfg` editor screen built on `CodeEditor` (`DSM-00136`, read-only by default via `aria-readonly="true"` and `EditorView.editable.of(false)`) with inline diagnostics, lock banner, running-server read-only state, revision history with diff and restore; header `Save changes` button (`type="submit" form="server-settings-form"`) placed next to `Add new server`. Removal of `GameplayRulesCard`, `SecurityCredentialsCard`, `Sidebar`/`ServerSelector`/`ModsView` non-admin role gates, and `router.tsx` non-admin redirects.
  - **Excluded / Deferred**: Central Economy XML editing (`DSM-00120`), live in-memory config hot-reloading, generic cross-feature audit log, multi-role RBAC UI (`moderator`/`viewer`), OS-level ACL hardening of config and backup directories (Windows service account ACLs, Linux `0600`), editing of `beserver_x64.cfg` by operators.
- **Implementation Notes**: Shared parser/validator/projection live in `libs/dayz-config` (`@aegis/dayz-config`); backend orchestration in `apps/server/src/services/server/{server-dz-config.service.ts,config-edit-lock.service.ts,battleye-config.service.ts,config-atomic-writer.ts}` and `apps/server/src/routes/{server-config.ts,servers.ts}`; migrations `0006`–`0009` (`0008_admin_only_and_unredacted_revisions`, `0009_normalize_server_profile_path`) in `libs/database`; UI in `apps/web/src/features/server-settings/` (`ServerSettingsView.tsx`, `StoragePathsCard.tsx`, `components/server-config/`).

---

### [DSM-00125] DayZ CLI Launch Parameter Compiler and Process Execution Contract

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00124`
- **High-Level Requirements**:
  Construct a sanitized, OS-agnostic command-line argument compiler that transforms server configuration, port allocations, profile paths, engine flags (`-doLogs`, `-adminLog`, `-freezeCheck`, `-scriptDebug`), and CPU/FPS clamps into a clean argument array (`string[]`) ready for `child_process.spawn()`. Enforce strict input validation preventing shell parameter injection, path traversal, or unescaped characters, and expose an inspection endpoint/helper allowing administrators to preview the exact compiled command line before launching.
- **Scope Boundaries**:
  - **Included**: Strongly typed launch argument compiler; sanitization against argument injection; compilation of standard Bohemia server flags (`-config=`, `-port=`, `-profiles=`, `-cpuCount=`, `-limitFPS=`); CLI preview DTO and REST endpoint.
  - **Excluded / Deferred**: Active OS process spawning and supervision (`DSM-00113`), Steam Workshop `-mod=` compilation (`DSM-00119`).

---

### [DSM-00126] Steam Integration Workbench, Interactive Authentication, and Credential Vault

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`, `DSM-00105`, `DSM-00107`, `DSM-00108`
- **High-Level Requirements**:
  Deliver the dedicated Steam integration workbench at `/settings/steam` in `apps/web` alongside backend SteamCMD process orchestration, encrypted credential storage, and reactive Steam Guard handling. Enable operators to configure SteamCMD binary paths (`steamCmdPath`), high-capacity workshop storage directories (`steamWorkshopPath`), metadata caches (`steamMetaPath`), and DayZ Steam application IDs (vanilla server `223350`, experimental server `1042420`, workshop content `221100`). Manage authenticated Steam sessions securely by storing passwords with AES-256-GCM encryption in SQLite (`steam_settings` table) and caching SteamCMD session tickets (`ssfn` / `config.vdf`) to prevent plaintext exposure. Reactively handle Steam Guard 2FA by monitoring child process stdout for both 5-character OTP prompts and Steam Mobile App push confirmations, dispatching info toast notifications and presenting an interactive challenge modal to complete verification.
- **Scope Boundaries**:
  - **Included**:
    - Dedicated route `/settings/steam` with grouped configuration cards (Account & Authentication, Storage Paths & SteamCMD Runtime, Application IDs & Branch Selection), `Fingerprint` session banner/actions, and dynamic Workshop storage partition capacity `ProgressBar`.
    - Dual-Scope Navigation (`server` vs. `appliance`) with a single polymorphic `Sidebar`, contextual top switcher (`<ServerSelector />` vs. `[ ← Server Name ]`), appliance breadcrumbs, and search query parameter isolation.
    - Zod API contracts and DTO schemas in `libs/api-contracts` (`SteamSettingsDto`, `UpdateSteamSettingsDto`, `SteamChallengeEventDto`, `SteamChallengeResponseDto`, `SteamChallengeAbortDto`, `SteamDiagnosticsResultDto`, `StorageStats`).
    - Encrypted credential vault using AES-256-GCM in SQLite (`steam_settings` singleton table in `libs/database`) with hybrid master key resolution (`STEAM_VAULT_KEY` / `DSM_VAULT_KEY` / `.vault.key`) and atomic TOCTOU-safe key generation (`flag: 'wx'`).
    - Defensive timestamp self-healing in migration `0004_steam_settings` and `toSafeIsoDate` route guard.
    - Fastify REST controllers in `apps/server` (`GET /api/v1/settings/steam`, `PATCH /api/v1/settings/steam`, `POST /api/v1/settings/steam/session/login`, `POST /api/v1/settings/steam/session/clear`, `POST /api/v1/settings/steam/challenge/respond`, `POST /api/v1/settings/steam/challenge/abort`, `POST /api/v1/settings/steam/diagnostics`).
    - Headless SteamCMD runner (`apps/server/src/services/steam/steam-runner.service.ts`) with cached session ticket prioritization, bidirectional `stdin`/`stdout` streams, timeout guards (90s challenge extension), process tree termination, and dual Steam Guard detection (5-character OTP vs Mobile App push).
    - Real-time Server-Sent Events (`/api/v1/realtime/sse`) broadcasting Steam challenge and session status events to the reactive Steam Guard modal and diagnostics/toast notifications in `apps/web`.
  - **Excluded / Deferred**:
    - Automated Steam Workshop mod catalog synchronization and downloading (`DSM-00119`).
    - Automated DayZ server binary installation runner.
- **Implementation Notes**: Frontend views in `apps/web/src/features/steam/{SteamSettingsView.tsx,hooks/useSteamAuthChallenge.ts,components/{SteamGuardChallengeModal,SteamDiagnosticsModal}.tsx}`; backend SSE hub in `apps/server/src/services/realtime/sse-hub.ts`.

---

### [DSM-00127] Host Filesystem Directory Picker and BrowseInput Component

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00328`–`DSM-00333`
- **Child Items**: `DSM-00328` (List host directories for the picker (admin only)), `DSM-00329` (BrowseInput component in @aegis/ui), `DSM-00330` (DirectoryList component in @aegis/ui), `DSM-00331` (Host directory picker dialog), `DSM-00332` (Browse for Steam settings paths), `DSM-00333` (Browse for server settings paths).
- **High-Level Requirements**:
  Deliver an accessible, reusable `BrowseInput` component in `@aegis/ui` featuring an integrated folder icon trigger button, coupled with an interactive host filesystem directory picker modal (`HostDirectoryPickerModal`) in `apps/web` and a defensive Fastify backend inspection endpoint (`GET /api/v1/system/fs?path=...`) in `apps/server`. Enable operators to visually inspect server host drive volumes (`C:\`, `D:\` on Windows, `/` on Linux), navigate folder hierarchies, and select host paths with one click for SteamCMD, workshop downloads, DayZ installation, profile, and mission roots. Handle OS permissions defensively (`EACCES`/`EPERM`) by marking restricted directories as locked without crashing, and enforce defense-in-depth security invariants denying traversal into sensitive system roots (`C:\Windows`, `/proc`, `/sys`).
- **Scope Boundaries**:
  - **Included**:
    - `BrowseInput` in `@aegis/ui`: composable input wrapping `Input` with trailing `FolderOpen` action button, accessibility labels, and `onBrowse` event handler.
    - `HostDirectoryPickerModal` in `apps/web`: keyboard-navigable directory tree explorer, drive selector, breadcrumb path bar, new folder creation (optional), and path selection handoff.
    - Backend FS inspection endpoint `GET /api/v1/system/fs` in `apps/server`: reads host volumes and directories, categorizes entries (`isDirectory`, `isAccessible`, `sizeBytes`), and handles permissions defensively.
    - Security boundaries: admin-only role guard, path traversal normalization (`path.resolve`), and deny-list for sensitive OS directories.
    - Integration into `SteamSettingsView` (SteamCMD, Workshop, Cache paths) and `ServerSettingsView` (Install, Profile, Mission paths).
  - **Excluded / Deferred**:
    - Remote file content editing or deletion (handled in log/config inspection features).
    - Client-side drag-and-drop file upload.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Creating folders from the picker is deferred (write operation).

---

### [DSM-00128] Aegis Console Rebrand, Namespace Migration (`@aegis/*`), and Brand Header Interaction

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00101`, `DSM-00105`
- **High-Level Requirements**:
  Rebrand the workspace and runtime console from `@dsm/*` / Outlive to `@aegis/*` / Aegis Console across `apps/web`, `apps/server`, `libs/*`, TypeScript path mappings, Vite/Vitest/Storybook resolvers, and agent documentation. Clean up the footer layout by removing the duplicate animated logo and elevate the brand header lockup into a `/dashboard` navigation link featuring an SVG-isolated 3D hover animation easter egg.
- **Scope Boundaries**:
  - **Included**:
    - Full package/import migration from `@dsm/*` to `@aegis/*` across `tsconfig.base.json`, `eslint.config.js`, `libs/ui/package.json`, `apps/web`, `apps/server`, and `libs/*`.
    - Aegis Console branding across `index.html`, `Sidebar`, and `libs/ui` stories.
    - SVG-isolated `.aegis-logo.animate-on-hover:hover` 3D rotation easter egg, clickable `/dashboard` brand header link with mobile drawer close, and duplicate footer logo removal.
  - **Excluded / Deferred**:
    - Dynamic custom logo upload per server.
- **Implementation Notes**:

---

### [DSM-00129] Toolchain Modernization, Parallel CI/PR Workflows, and Automated PR Summary

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  Upgrade critical runtime, security, Storybook 10.x, ESLint, and Vitest dependencies with exact version pinning, split CI and PR validation pipelines into parallel check jobs with job-scoped Nx caching and path filters, fix cycle-check path alias resolution, and modernize the automated PR architectural summary generator script.
- **Scope Boundaries**:
  - **Included**:
    - Dependency updates across `package.json` and `pnpm-lock.yaml`, plus shared `.github/actions/setup-workspace/action.yml`.
    - Parallelized `.github/workflows/ci.yaml` and `.github/workflows/pr-validation.yaml` pipelines, CodeQL/Sonar/Storybook workflow hardening, and removal of redundant `sonar-fork-pr.yaml`.
    - Updated `.github/scripts/generate-pr-summary.cjs` and `.github/scripts/normalize-lcov.cjs`, plus cycle-check path alias fixes (`Header.tsx`).
  - **Excluded / Deferred**:
    - Self-hosted GitHub Actions runners.
- **Implementation Notes**:

---

### [DSM-00130] Multi-Line Release History Sync and Static Content Parser Hardening

- **Priority**: `P1 (High)`
- **Type**: `Bug`
- **Status**: `DONE`
- **Depends On**: `DSM-00121`
- **High-Level Requirements**:
  Harden `scripts/sync-static-content.ts` so `history.md` generation reliably preserves multi-line nested Markdown bullet lists, blank lines, CRLF normalization, and single trailing EOF newlines across consecutive runs. Ensure `parseDoneBacklogItems` also handles annotated `DONE` status suffixes and parenthetical scope qualifiers (`Included (...)` / `Excluded / Deferred (...)`) without silently dropping merged PBIs.
- **Scope Boundaries**:
  - **Included**:
    - Multi-line block extraction (`extractContinuationLines`, `dedentBlockLines`), CRLF/LF normalization, and idempotent `history.md` output in `scripts/sync-static-content.ts`.
    - Support for annotated `DONE` statuses and parenthetical `Included (...)` / `Excluded / Deferred (...)` labels in `parseBacklogSection` and `parseScopeField`.
    - Comprehensive Vitest unit coverage in `scripts/__tests__/sync-static-content.spec.ts`.
  - **Excluded / Deferred**:
    - GitHub API release tag publishing automation.
- **Implementation Notes**: Parser lives in `scripts/sync-static-content.ts`; `- **Implementation Notes**:` lines placed at indent `0` are intentionally ignored by `parseScopeField`.

---

### [DSM-00131] Multi-Agent SKILL.md Presets, UI/UX Design, and Security Audit Workflows

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  Migrate workspace agent skills into standardized `.agents/skills/*/SKILL.md` directories, wire `.agents/skills.json` to `sdlc-skills-repo` presets, and introduce DSM-specific `ui-ux-design` and `security-audit` skill specifications synchronized with `.github/copilot-instructions.md`.
- **Scope Boundaries**:
  - **Included**:
    - Migration of `code-convention`, `code-review`, `feature-implementation`, `react-styleguide`, `tests-implementation`, `typescript-styleguide`, and `webapp-testing` to `SKILL.md` folders.
    - New `.agents/skills/ui-ux-design/SKILL.md` (Aegis `h-9` geometry, dual-theme tokens, 9-pass redline protocol) and `.agents/skills/security-audit/SKILL.md`.
    - Updated `.agents/skills.json` and `.github/copilot-instructions.md`.
  - **Excluded / Deferred**:
    - CI enforcement hooks running automated Playwright redline checks on PRs.

---

### [DSM-00132] Animated Unread Notification Bell, Notification Store, and Popup Positioning

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`, `DSM-00108`, `DSM-00121`
- **High-Level Requirements**:
  Replace the static header notification bell with a live `NotificationMenu` backed by a bounded client notification store (`notification.store.ts`) bridged from toast dispatches (`notify.ts`). Add a `prefers-reduced-motion`-safe bell-ring keyframe animation when unread notifications exist, deliver a persisted per-user FAQ greeting notification in `Header`, and eliminate popup coordinate fly-in glitches in `usePopup` via compositor `popup-enter` animation and pre-placement display deferral.
- **Scope Boundaries**:
  - **Included**:
    - Bounded client notification store (`notification.store.ts`), toast-to-notification bridge (`notify.ts`), and per-user FAQ greeting persistence (`greeting.storage.ts`).
    - Animated unread bell keyframes (`keyframes.css`), `NotificationMenu` unread/action wiring, and `Header` integration.
    - `usePopup` coordinate reset on close, `offsetWidth` placement lock, and compositor `popup-enter` animation with full Vitest test suites.
  - **Excluded / Deferred**:
    - Server-persisted cross-device notification inbox synchronization via SSE.
- **Implementation Notes**: Client store in `apps/web/src/core/notifications/{notification.store.ts,notify.ts,greeting.storage.ts}`; popup positioning hook in `libs/ui/src/hooks/usePopup.ts`.

---

### [DSM-00133] SteamCMD Workshop Mod Downloading, Progress Streaming, and `.bikey` Distribution (Phase 2)

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00334`–`DSM-00339`
- **Child Items**: `DSM-00334` (Background task registry with progress events), `DSM-00335` (Download one Workshop mod via SteamCMD), `DSM-00336` (Show mod download progress in the mods list), `DSM-00337` (Copy a mod's .bikey into the server keys folder on enable), `DSM-00338` (Remove a mod's key when it is disabled or removed), `DSM-00339` (Running-tasks indicator in the header).
- **High-Level Requirements**:
  Extend `/mods` from catalog & load-order management into automated SteamCMD Workshop binary downloading, async task queue execution with live SSE `task.progress` streaming, and automated `.bikey` public key extraction/symlinking into the active DayZ server `keys/` directory with orphan key cleanup.
- **Scope Boundaries**:
  - **Included**:
    - Headless SteamCMD `+workshop_download_item` runner and async background task queue integration.
    - Real-time SSE progress streaming into `/mods` rows and global task indicator.
    - Automated `.bikey` signature distribution and orphan key cleanup on mod disable/uninstall.
  - **Excluded / Deferred**:
    - Custom client-side mod pack bundling or P2P mirror distribution.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00134] Aegis Theme Token Resolution (`@theme inline`), Contrast Hardening, and Transition Freeze

- **Priority**: `P1 (High)`
- **Type**: `Bug`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`, `DSM-00106`, `DSM-00110`
- **High-Level Requirements**:
  Resolve systemic Tailwind v4 `@theme` `:root` scoping leaks, hardcoded `text-white` overrides on dark accents, missing `--color-info*`/`--color-success-fg`/`--color-surface-elevated` tokens, translucent dark toasts, undefined CSS variables (`--color-primary-subtle`, `--color-danger-soft`, `ui-card`), and theme-toggle color smearing identified during live Playwright + semantic redline audits.
- **Scope Boundaries**:
  - **Included**:
    - `@theme inline` migration in `libs/ui/src/styles/theme.css` and root `data-theme` synchronization in Storybook (`StorybookThemeFrame`).
    - Semantic `*-fg` foreground tokens across `Button`, `Tag`, `StatusTag`, `NotificationMenu`, `Pagination`, `TagSelect`, `DatePicker`, and `RootFallback`, plus opaque base backing on `CustomToast`.
    - Cleanup of undefined tokens, raw Tailwind palette leaks, and chrome emojis across `apps/web` and `libs/ui`.
    - 1-frame `.theme-switching` transition freeze in `ThemeProvider` and replacement of all 17 `transition-all` declarations with explicit compositor/color transitions.
  - **Excluded / Deferred**:
    - Custom user-authored theme JSON import/export.
- **Implementation Notes**: Theme tokens in `libs/ui/src/styles/theme.css` (`@theme inline`) and `themes.css`; Storybook wrapper `libs/ui/.storybook/StorybookThemeFrame.tsx`.

---

### [DSM-00135] DayZ 6-Pair Theme Palette System (Cold, Neutral, Warm) and 3x2 Selector Grid

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00110`, `DSM-00134`
- **High-Level Requirements**:
  Replace the near-identical cool-blue theme clones with 6 distinct DayZ-inspired light/dark theme pairs organized evenly into 2 Cold (`Namalsk Day`/`Namalsk Night` preserving the `vanilla`/`obsidian` color schemes, `Frostline Day`/`Sakhal Night`), 2 Neutral (`Chernarus Overcast`/`Tisy Bunker`, `Livonia Clearing`/`Nadbor Pine`), and 2 Warm (`Badlands Sun`/`Badlands Dusk`, `Krasno Dawn`/`Signal Flare`) palettes. Preserve pure `#ffffff` card surfaces across light themes while tinting canvas, sidebar, subtle wells, borders, and accents with $\ge 4.5:1$ WCAG AA contrast, and upgrade `ThemeSelectorCard` to a balanced 3x2 (`lg:grid-cols-3`) grid with legacy `localStorage` ID migration.
- **Scope Boundaries**:
  - **Included**:
    - Complete 12-theme CSS variable definitions in `libs/ui/src/styles/themes.css` and synchronized Storybook toolbar items (`libs/ui/.storybook/preview.tsx`).
    - Updated `lightThemeIdSchema` / `darkThemeIdSchema` and legacy ID preprocessing in `apps/web/src/features/theme/theme.types.ts`.
    - Updated `LIGHT_THEMES` / `DARK_THEMES` metadata (`useThemePreference.ts`), 3x2 `ThemePaletteGrid` (`ThemeSelectorCard.tsx`), and compact per-theme splash backgrounds in `apps/web/index.html` within the 4KB `GUARD-01` budget.
    - Updated unit tests across `ThemeProvider.test.tsx`, `useThemePreference.test.ts`, `ThemeSelectorCard.test.tsx`, and `splash.spec.ts`.
  - **Excluded / Deferred**:
    - High-contrast forced-colors OS mode (`forced-colors: active`) overrides.
- **Implementation Notes**: Palette tokens defined in `libs/ui/src/styles/themes.css`; legacy ID migration & schemas in `apps/web/src/features/theme/theme.types.ts` and `useThemePreference.ts`; 3x2 grid in `ThemeSelectorCard.tsx`; pre-bootstrap splash backgrounds in `apps/web/index.html`.

---

### [DSM-00136] Shared CodeMirror 6 `CodeEditor` with Inline Diagnostics and Read-Only Ranges

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`
- **High-Level Requirements**:
  Deliver a reusable, lazily-loaded `CodeEditor` component in `libs/ui` built on CodeMirror 6, serving as the single text-editing surface for game configuration files across the console (`serverDZ.cfg` in `DSM-00124`, Central Economy XML in `DSM-00120`, future JSON views). The component accepts a pluggable language extension, renders externally supplied diagnostics inline (gutter markers, underlines, hover messages) with `error | warning` severity, supports protected read-only ranges (e.g. DSM-managed secret lines), a global read-only mode, and consumes semantic Aegis CSS variables so all 12 themes render correctly without hardcoded colors.
- **Scope Boundaries**:
  - **Included**:
    - `CodeEditor` controlled component (`value`, `onChange`, `language`, `diagnostics`, `readOnly`, `readOnlyRanges`, `containerClassName`) with React 19 `ref` prop exposing an imperative handle (focus, scroll-to-line).
    - Route-level code splitting so CodeMirror never enters the main bundle.
    - Aegis theme extension mapped to CSS variables; line numbers, bracket matching, search, undo history.
    - Lightweight `StreamLanguage` mode for Bohemia `.cfg` syntax (comments, strings, numbers, `class` blocks).
    - Storybook CSF3 stories and Vitest/RTL tests.
  - **Excluded / Deferred**:
    - Language-server features (autocomplete of DayZ keys, hover docs), collaborative real-time editing, Monaco.
- **Implementation Notes**: Component lives in `libs/ui/src/code-editor/{CodeEditor.tsx,CodeDiffView.tsx,CodeEditor.extensions.ts,CodeEditor.types.ts,CodeEditor.utils.ts,aegis-theme.ts,bohemia-cfg.language.ts}`; lazy-loaded via `apps/web/src/features/server-settings/components/server-config/code-editor.lazy.ts` into a separate chunk (`code-editor.lazy-*.js`).

---

### [DSM-00137] Form UX Conventions: Change-Aware Save, Submit-Time Validation, Inline Errors, and Result Toasts

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`, `DSM-00108`
- **High-Level Requirements**:
  Make every create/update form behave consistently: the save/update control is disabled while the form has no changes relative to the last saved values; validation runs when the admin tries to save and then re-validates live; every invalid field (client or server `fieldErrors`) is highlighted with a specific message and the first one receives focus; every server-side create/update/save ends in a green or red toast. The conventions are enforced by QA via `GEMINI.md` §5.
- **Scope Boundaries**:
  - **Included**:
    - Shared change-tracking / submit-validation / focus-first-invalid hook in `apps/web/src/core`.
    - Adoption in `ServerSettingsForm`, `SteamSettingsView`, `ProfileIdentityCard`, `PasswordRotationCard`, `EditModModal`, `CreateServerModal`, `AddModModal` (Local Mod); verification of `ServerConfigCard`.
    - "No changes to save" tooltip on disabled submit controls; tests per form.
  - **Excluded / Deferred**:
    - Unsaved-changes navigation guard; sign-in, Steam Guard and Workshop lookup/search forms.
- **Implementation Notes**:

---

### [DSM-00138] Unsaved-Changes Navigation Guard for Create/Update Forms

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00137`
- **High-Level Requirements**:
  When an update form has unsaved changes (as defined by `DSM-00137` change tracking), warn the admin before the change is lost: a confirmation dialog on in-app route changes (TanStack Router blocker) and the browser's native prompt on tab close/reload (`beforeunload`).
- **Scope Boundaries**:
  - **Included**: Route-change blocking with a `Confirmation` dialog; `beforeunload` for tab close; reuse of the `DSM-00137` change state.
  - **Excluded / Deferred**: Draft autosave/restore.
- **Implementation Notes**: Split out of `DSM-00137` (decision 2026-11-15). Also covers form-modal close controls (Cancel/X/Escape/backdrop) and sign-out. Shared `UnsavedChangesProvider` in `AuthedLayout`, registration via `useEditableForm`.

---

### [DSM-00139] Interactive System Telemetry Workbench and Historical Performance Analytics

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00232`–`DSM-00238`
- **Child Items**: `DSM-00232` (TimeSeriesChart component in @aegis/ui), `DSM-00233` (Live CPU and memory charts at /system), `DSM-00234` (Historical time-range selector (15m, 1h, 6h, 24h)), `DSM-00235` (Disk I/O and network charts), `DSM-00236` (Per-core host CPU chart), `DSM-00237` (Server process tree inspector), `DSM-00238` (Memory-growth warning for the server process).
- **High-Level Requirements**:
  Deliver the dedicated system telemetry analysis workbench at `/system` in `apps/web`. Render multi-metric time-series visualizations for the active DayZ server and host operating system (per-core and aggregate CPU load, RSS memory working set vs private commit bytes, disk I/O throughput in MB/s, and UDP network traffic / packets per second). Provide dynamic time-range controls (15m, 1h, 6h, 24h), an active process tree inspector (server child processes, SteamCMD, Watchdog), and automated health indicators flagging memory leaks, tick desync, or resource starvation.
- **Scope Boundaries**:
  - **Included**:
    - Dedicated `/system` route workbench consuming telemetry streaming from `DSM-00122`.
    - Multi-metric time-series visualizations (CPU core-by-core & host %, RSS memory working set vs private bytes, disk I/O read/write MB/s, network throughput / PPS) styled with semantic Aegis design tokens.
    - Time-range selector (15m, 1h, 6h, 24h) with resolution downsampling.
    - Host vs DayZ process footprint comparison and active child process inspector.
    - Health indicators and threshold warnings (memory growth rate / leak alert, tick rate degradation).
  - **Excluded / Deferred**:
    - In-game player coordinate telemetry (`IngameReportDTO`), custom game engine Enforce script hooks.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Tick-desync health indicators wait for an FPS data source (see `DSM-00112`).

---

### [DSM-00140] Server Maintenance Operations, Automated Restart Scheduler, and Join Locks

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00239`–`DSM-00246`
- **Child Items**: `DSM-00239` (Add restart schedule table (migration)), `DSM-00240` (Create daily restart times and see the next run), `DSM-00241` (Run scheduled restarts), `DSM-00242` (Countdown warnings before scheduled restarts), `DSM-00243` (Edit, disable and delete restart schedules), `DSM-00244` (Back up persistence before each scheduled restart), `DSM-00245` (Lock the server to new joins during maintenance), `DSM-00246` (Emergency kill that preserves diagnostics).
- **High-Level Requirements**:
  Deliver the operational maintenance and lifecycle management workbench at `/maintenance`. Provide an automated cron-based restart scheduler with staged in-game countdown warnings (30m, 15m, 5m, 1m broadcast via BattlEye RCON `#say`), player join lock toggle (maintenance mode rejecting non-admin connections with custom disconnect banner), emergency process termination with diagnostic memory dump preservation, and automated pre-restart snapshot hooks.
- **Scope Boundaries**:
  - **Included**:
    - Operational `/maintenance` workbench with sub-views/cards for Lifecycle & Scheduling, Maintenance Locks, and Emergency Controls.
    - Automated cron-like restart scheduler configuration with operator timezone display and next-run countdown timers.
    - Automated RCON `#say` broadcast sequence warning active players at 30m, 15m, 5m, and 1m intervals before server restarts.
    - Player join lock toggle (`maintenanceMode: boolean`) with custom rejection message.
    - Emergency process freeze termination action (`kill -9` / Job Object kill) with diagnostic state preservation.
    - Pre-restart safety snapshot coordination linking with `DSM-00118`.
  - **Excluded / Deferred**:
    - Automated cloud backup offsite replication, OS bare-metal reboot.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Cron expressions are deferred: fixed daily times first. A custom join-rejection message is not offered by BattlEye `#lock` (to confirm in `DSM-00245`).

---

### [DSM-00141] Tactical GIS Interactive World Map and Real-Time Entity Tracking

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00247`–`DSM-00255`
- **Child Items**: `DSM-00247` (Spike: map tile source and licensing), `DSM-00248` (MapCanvas component with DayZ coordinate system), `DSM-00249` (Show the Chernarus map at /world/map), `DSM-00250` (Cursor coordinate readout and click-to-copy), `DSM-00251` (Switch between Livonia, Sakhal and Namalsk), `DSM-00252` (Toggle topographic and satellite layers), `DSM-00253` (Measure distance on the map), `DSM-00254` (Spike: source of player positions without mods), `DSM-00255` (Plot last known player positions on the map).
- **High-Level Requirements**:
  Deliver the tactical GIS interactive world map at `/world/map` in `apps/web`. Implement the Leaflet-based DayZ coordinate reference system (`DayZCRS` 1:1 projection mapping Cartesian game coordinates `[X, Z]` with South-West `(0, 0)` origin to inverted GIS tiles) supporting Chernarus, Livonia, Sakhal (Frostline), and Namalsk. Display multi-layer map views (topographic terrain and satellite imagery), real-time player tracking pins plotted from ADM combat coordinates and RCON telemetry with heading indicators, player identity tooltips, distance measurement ruler, coordinate navigator, and role-based operator visibility guards.
- **Scope Boundaries**:
  - **Included**:
    - Dedicated `/world/map` route workbench gated by `worldMap` feature flag.
    - Leaflet GIS map canvas with custom `DayZCRS.Simple` coordinate transformation and map boundary configs for Chernarus (15360m), Livonia (12800m), Sakhal, and Namalsk.
    - Multi-map selector and tile layer toggles (topographic vs satellite).
    - Live player pin tracking layer with directional heading icons, player name, health, and BattlEye GUID tooltip.
    - Interactive map utilities: distance measurement ruler, South-West Cartesian coordinate readout, coordinate search / click-to-copy.
    - Admin-only role visibility guards for player positions.
  - **Excluded / Deferred**:
    - Central Economy loot density heatmap overlays (`DSM-00142`), custom client-side 3D elevation rendering.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Player positions are only as fresh as the ADM log provides; real-time tracking needs a mod and is out of scope.

---

### [DSM-00142] Central Economy Spatial Loot Distribution and Zone Heatmap

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00256`–`DSM-00261`
- **Child Items**: `DSM-00256` (Spike: derive loot spawn points from mission files), `DSM-00257` (Loot spawn-point density heatmap overlay), `DSM-00258` (Filter the loot heatmap by category), `DSM-00259` (Show spawn clusters for one item classname), `DSM-00260` (Overlay economy tier zones), `DSM-00261` (Per-tier loot summary panel).
- **High-Level Requirements**:
  Deliver the Central Economy spatial loot analysis console at `/world/loot`. Overlay interactive loot density heatmaps and economy tier zones (Tier 1 Coast to Tier 4 Extreme Military, contaminated / toxic zones) directly onto the GIS world map. Enable operators to filter heatmap density by item category (weapons, ammunition, medical, gear, food, vehicles), search for specific item classnames (e.g. `M4A1`, `NVGoggles`) to inspect their spatial spawn clusters, and cross-reference configured `types.xml` nominal/min values against terrain spawn capacity.
- **Scope Boundaries**:
  - **Included**:
    - Dedicated `/world/loot` route workbench gated by `worldMap` feature flag.
    - Leaflet heatmap overlay layer rendering loot point density clusters across the terrain.
    - Economy Tier zone polygon overlays (Tier 1 Coast through Tier 4 Military) and dynamic contaminated area markers.
    - Item classname search with auto-complete and category filters (military, civilian, industrial, medical, food).
    - Spatial loot summary panel displaying item counts and density metrics per tier zone.
  - **Excluded / Deferred**:
    - Real-time item entity tracking inside active player inventories.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00143] Multi-Channel Discord Webhooks and Event Dispatcher

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00262`–`DSM-00270`
- **Child Items**: `DSM-00262` (Store Discord webhook settings with encrypted URLs (migration)), `DSM-00263` (Configure the staff webhook and send a test message), `DSM-00264` (Post server crash alerts to the staff webhook), `DSM-00265` (Post server online / offline to a community webhook), `DSM-00266` (Choose which events each webhook receives), `DSM-00267` (Retry and rate-limit outbound webhook posts), `DSM-00268` (Post scheduled restart warnings to the community webhook), `DSM-00269` (Post backup results to the staff webhook), `DSM-00270` (Post kick and ban events to the staff webhook).
- **High-Level Requirements**:
  Deliver the multi-channel Discord webhook notification subsystem and configuration workbench at `/settings/discord`. Support separate webhook destinations for Public/Community channels (server online/offline status, player population milestones, scheduled restart warnings) and Private/Staff channels (server crash alerts, unhandled script exceptions, BattlEye ban/kick events, mod update alerts, backup completions and failures). Provide granular event subscription toggles, rich embed templates rendered with semantic Aegis color branding, an interactive test ping dispatch button, and resilient outbound retry queues with rate-limiting and secret vault masking.
- **Scope Boundaries**:
  - **Included**:
    - Dedicated `/settings/discord` route workbench with grouped channel cards (Public Community vs Private Staff).
    - Zod contracts, API client, and SQLite persistence for webhook URLs and event subscription toggles.
    - Backend outbound webhook dispatcher with exponential backoff, rate-limiting, and payload formatting.
    - Discord rich embed message formatters with Aegis theme colors, timestamps, server name, and incident details.
    - Interactive "Test Webhook" action button with immediate toast feedback.
    - Secret vault encryption for sensitive webhook URLs.
  - **Excluded / Deferred**:
    - Inbound Discord bot slash commands (`/status`, `/restart`).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Population milestones, script exception alerts and mod update alerts are deferred until their event sources exist.

---

### [DSM-00144] Cross-Platform Appliance Packaging, Daemon Services (WinSW / systemd), and CLI Launcher

- **Priority**: `P0 (Critical)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00271`–`DSM-00276`
- **Child Items**: `DSM-00271` (Build a self-contained Windows appliance), `DSM-00272` (Build a self-contained Linux appliance), `DSM-00273` (Install and remove DSM as a Windows service), `DSM-00274` (Install and remove DSM as a systemd service), `DSM-00275` (Reset an operator password from the CLI), `DSM-00276` (Publish signed appliance archives to GitHub Releases).
- **High-Level Requirements**:
  Package Aegis Console into an immutable distribution appliance directory (`bin/`, `app/`, `manager-data/`) bundling the Node.js runtime, Fastify backend, compiled React 19 SPA, and native `better-sqlite3` bindings. Provide Windows service management via embedded WinSW, Linux background execution via generated systemd service units, and unified CLI entrypoints (`bin/aegis` / `aegis.exe`).
- **Scope Boundaries**:
  - **Included**: Appliance directory structure, bundling scripts, WinSW and systemd service management wrappers, CLI runner for background execution and headless admin password resets.
  - **Excluded / Deferred**: Blue-green auto-updater orchestration (`DSM-00145`).
- **Implementation Notes**: Game servers must survive DSM service restarts (`DSM-00160` survive + re-adopt): systemd units use `KillMode=process`, and WinSW must not terminate child processes on service stop. On Windows `taskkill /T` on the DSM process would also kill DayZ (a descendant by parent PID even when detached): stop only the DSM process (verified in `DSM-00162` QA).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Game servers must survive DSM service restarts: stop only the DSM process, never its tree (see the original implementation notes).

---

### [DSM-00145] Staged Blue-Green In-App Self-Updater with Heartbeat Reconnection Protocol

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00277`–`DSM-00284`
- **Child Items**: `DSM-00277` (Show whether a newer release is available), `DSM-00278` (Download and checksum-verify an update bundle), `DSM-00279` (Verify the update bundle's signature), `DSM-00280` (Back up the SQLite database before applying an update), `DSM-00281` (Apply an update through a detached swap while game servers keep running), `DSM-00282` (BlockingOverlay component in @aegis/ui), `DSM-00283` (Update-in-progress overlay that reconnects when DSM is back), `DSM-00284` (Roll back when the updated DSM fails its health check).
- **High-Level Requirements**:
  Deliver the in-app self-updater engine defined in RFC-002: download signed release bundles from GitHub Releases, verify SHA-256 checksums, take pre-update SQLite online backups (`.bak`), and execute detached swap routines (`update.bat` / `update.sh`) while preserving active DayZ server process execution. Provide the browser "router firmware update" overlay with polling `GET /health` auto-reconnection.
- **Scope Boundaries**:
  - **Included**: `/settings/app` update card, download & checksum verification, detached process swap script, DB pre-flight snapshot, non-dismissible client update modal, and exponential `/health` polling reload.
  - **Excluded / Deferred**: Automated rollback across breaking major database schema rewrites.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00146] Automated DayZ Server Clean Installation Wizard & Path Scaffolding

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00285`–`DSM-00287`
- **Child Items**: `DSM-00285` (Install DayZ server files via SteamCMD into an empty directory), `DSM-00286` (Generate baseline serverDZ.cfg and BattlEye config for a fresh install), `DSM-00287` (Create a server from a fresh install in the Create Server dialog).
- **High-Level Requirements**:
  Deliver an interactive onboarding wizard allowing operators to install a clean DayZ Dedicated Server from scratch into an empty host directory. Invoke SteamCMD to download server app ID `223350`, scaffold default missions (`mpmissions/`), generate baseline `serverDZ.cfg` and BattlEye configuration files, and register the newly installed server in SQLite.
- **Scope Boundaries**:
  - **Included**: SteamCMD automated server download runner, directory scaffolding, baseline config generation, and server registration flow in `CreateServerModal`.
  - **Excluded / Deferred**: Automated Windows firewall port opening.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. The SteamCMD prerequisite comes from the `DSM-00159` slices rather than from the wizard.

---

### [DSM-00147] Host Port Allocation, Socket Availability Probe, and NAT Reachability Checker

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00288`–`DSM-00290`
- **Child Items**: `DSM-00288` (Refuse overlapping ports between registered servers), `DSM-00289` (Check ports are free on the host before start), `DSM-00290` (Spike: public reachability check for server ports).
- **High-Level Requirements**:
  Implement host network diagnostic tooling in `apps/server` validating game port, query port, and RCON socket availability before server launch. Prevent UDP port collisions across multiple servers on the same IP and provide an on-demand public WAN reachability probe verifying whether ports are accessible through external NAT/firewalls.
- **Scope Boundaries**:
  - **Included**: Local UDP/TCP socket bind testing, port conflict warnings in server settings, public reachability tester.
  - **Excluded / Deferred**: UPnP automatic router port forwarding.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00148] Bidirectional Discord Bot with Role-Guarded Slash Command Execution

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00291`–`DSM-00297`
- **Child Items**: `DSM-00291` (Connect a Discord bot and show its connection status), `DSM-00292` (/status slash command), `DSM-00293` (Restrict bot commands to mapped Discord roles), `DSM-00294` (/restart slash command), `DSM-00295` (/players slash command), `DSM-00296` (/say slash command), `DSM-00297` (/kick and /ban slash commands).
- **High-Level Requirements**:
  Deliver an optional embedded Discord bot listening for slash commands (`/status`, `/restart`, `/players`, `/say`, `/kick`, `/ban`) directly within operator Discord channels. Enforce role-based Discord permissions mapped to Aegis console operators and stream real-time command execution outputs back to Discord.
- **Scope Boundaries**:
  - **Included**: Discord gateway bot client, slash command registration, role-guarded command dispatcher, RCON bridge.
  - **Excluded / Deferred**: Voice channel telemetry or player ticketing systems.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00149] Scheduled RCON In-Game Chat Broadcast and Periodic Message Announcer

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00298`–`DSM-00300`
- **Child Items**: `DSM-00298` (Store announcement messages (migration)), `DSM-00299` (Manage rotating announcement messages), `DSM-00300` (Broadcast announcements in rotation while the server runs).
- **High-Level Requirements**:
  Provide an automated recurring in-game chat broadcaster allowing operators to define periodic announcement messages via BattlEye RCON `#say` (e.g. community links, rule reminders, Discord invite, scheduled restart notices). Support configurable minute intervals, message rotation, and multi-line formatting.
- **Scope Boundaries**:
  - **Included**: Periodic announcement schedule manager in `/players` or `/settings/server`, RCON `#say` execution loop, message rotation list.
  - **Excluded / Deferred**: Player chat triggered dynamic bot responses.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need.

---

### [DSM-00150] Tebex / Custom Storefront Integration and Automated VIP Priority Queue Billing

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00301`–`DSM-00306`
- **Child Items**: `DSM-00301` (Spike: Tebex webhook model and exposure of a public endpoint), `DSM-00302` (Grant priority queue from a verified Tebex purchase), `DSM-00303` (Revoke priority queue when a Tebex subscription ends), `DSM-00304` (Grant whitelist from a Tebex purchase), `DSM-00305` (Purchase grant / revoke audit log), `DSM-00306` (Generic signed payment webhook).
- **High-Level Requirements**:
  Enable server monetization by integrating with Tebex and custom payment webhooks to automate VIP priority queue and whitelist grants. Automatically synchronize purchased Steam64 IDs into DayZ priority queue files (`priority.txt` / BattlEye bans) upon purchase and revoke access when subscriptions expire.
- **Scope Boundaries**:
  - **Included**: Webhook endpoint for Tebex / custom payment providers, automated priority queue and whitelist file synchronization, transaction audit log.
  - **Excluded / Deferred**: In-game player item delivery (trader bank/cargo mod injectors).
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. Payments and a public webhook endpoint: every slice is isolated and depends on the spike's security decision.

---

### [DSM-00152] AI-Powered Crash Diagnostics, Error Forensics, and Natural Language Economy Tuning

- **Priority**: `P2 (Medium)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00311`–`DSM-00315`
- **Child Items**: `DSM-00311` (Configure a BYOK AI provider and test the connection), `DSM-00312` (Explain an RPT crash with the likely faulting mod), `DSM-00313` (Support additional AI providers including local Ollama), `DSM-00314` (Natural-language economy tuning as a reviewable types.xml diff), `DSM-00315` (Ask natural-language questions about ADM combat logs).
- **High-Level Requirements**:
  Deliver an opt-in, Bring-Your-Own-Key (BYOK) AI assistant for DayZ server operators supporting OpenAI, Anthropic, Gemini, or local Ollama. Analyze cryptic server crash dumps (`.mdmp`) and RPT unhandled exceptions to pinpoint faulting mods with actionable remediation steps; enable natural language economy tuning that translates plain English balancing prompts into verified `types.xml` diffs; and provide conversational combat log forensics.
- **Scope Boundaries**:
  - **Included**: BYOK provider settings (OpenAI/Anthropic/Gemini/Ollama), RPT crash analyzer tool with mod attribution, natural language economy balancing assistant outputting surgical XML diffs, combat log natural language query inspector.
  - **Excluded / Deferred**: Autonomous unsupervised server restarts or unconfirmed file mutations.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. `.mdmp` crash-dump analysis is deferred (binary format, unclear value).

---

### [DSM-00159] SteamCMD Dependency Health: Auto-Detect, Guided Install, and Graceful Degradation

- **Priority**: `P1 (High)`
- **Type**: `Epic`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00340`–`DSM-00347`
- **Child Items**: `DSM-00340` (Allow the SteamCMD path to be 'not configured'), `DSM-00341` (Show 'Not configured' and live path status in Steam settings), `DSM-00342` (Auto-detect SteamCMD installations), `DSM-00343` (Install SteamCMD for me), `DSM-00344` (Check SteamCMD at startup and expose dependency health), `DSM-00345` (Preflight SteamCMD check before every SteamCMD operation), `DSM-00346` (Disable SteamCMD features with an explanation), `DSM-00347` (Startup health notification and dashboard banner).
- **High-Level Requirements**:
  Treat SteamCMD as an optional host dependency instead of a hard precondition. Aegis must start and stay usable without it (logs, `serverDZ.cfg`, players, maintenance); only features that run SteamCMD (DayZ server install/update, Workshop mod sync) are disabled, each explaining why and linking to the fix. Replace the fabricated first-boot default (`C:\steamcmd\steamcmd.exe` / `/usr/games/steamcmd` in `apps/server/src/routes/steam.ts`) with an explicit _not configured_ state, and help the admin reach a working path in one click: auto-detect, guided install, or browse.
- **Validation layers**:
  | When                                          | Check                                                                                                                          | Purpose                                                                          |
  | :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
  | First run / installation wizard (`DSM-00146`) | Auto-detect; offer guided install                                                                                              | Most admins never type a path                                                    |
  | Aegis startup                                 | Cheap existence + executable check only (no `steamcmd +quit`: it self-updates and is slow); result stored as dependency health | Catches binaries moved or removed while the service was down                     |
  | Save in Steam settings                        | Existing hard validation with `fieldErrors` (fixed during `DSM-00137` QA)                                                      | Immediate feedback on input                                                      |
  | Just-in-time before every SteamCMD operation  | Preflight check failing with `INVALID_STEAMCMD_PATH`                                                                           | The only authoritative check: the path can disappear after it was saved (TOCTOU) |
- **Scope Boundaries**:
  - **Included**:
    - Nullable / _not configured_ `steamCmdPath` (DB migration + `steamSettingsSchema`), with a "Not configured" badge in `SteamSettingsView` instead of a placeholder path that fails on first save.
    - **Detect** action + `POST /api/v1/settings/steam/detect`: probes `PATH`, `C:\steamcmd`, every Steam library listed in `libraryfolders.vdf` (e.g. `D:\SteamLibrary\steamapps\common\SteamCMD`), and `/usr/games/steamcmd`; returns ranked candidates for the admin to pick.
    - **Install SteamCMD for me** (explicit consent; outbound download): fetch Valve's official `steamcmd.zip` / `steamcmd_linux.tar.gz` into `manager-data/steamcmd/`, extract atomically, verify, and save the path; progress feedback with green/red toast per the feedback contract.
    - **Browse** via `BrowseInput` / host directory picker (`DSM-00127`).
    - Inline status next to the path: _Found · v…_, _Not found_, _Not executable_ (reuse `steamCmdValid` / `steamCmdVersion` from Run Diagnostics).
    - Dependency health record populated at startup and refreshed on save / detect / install; exposed to the client.
    - Feature gating: Workshop sync and server install/update controls stay focusable but `aria-disabled` with a tooltip "SteamCMD is not configured" and a link to Steam settings (same pattern as `SaveButton`, `DSM-00137`).
    - One notification-centre entry plus a dismissible dashboard banner when startup health fails; no repeating toasts (background reads never toast, `GEMINI.md` §5).
  - **Excluded / Deferred**:
    - Automatic SteamCMD self-update scheduling.
    - Installing SteamCMD without explicit admin consent.
    - Blocking Aegis startup or sign-in on SteamCMD health.
- **Implementation Notes**: Raised during live QA of `DSM-00137` / `DSM-00138` (2026-11-15), where a fresh database showed `INVALID_STEAMCMD_PATH` for the fabricated default although SteamCMD was installed under a Steam library folder.
- **Refinement Note (2026-11-16)**: Split on 2026-11-16 under the backlog-planning size budget (one behaviour or contract change per PBI, ≤ 5 AC, ~≤ 400 changed lines, migrations / refactors / new dependencies separate, risky operations isolated). The epic is `DONE` when all children are `DONE`; dependents reference the child they need. The dependency on `DSM-00146` is dropped: the wizard consumes these slices instead.

---

### [DSM-00160] ProcessManager Platform Adapter (Windows Process Tree / Linux Process Groups)

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  Provide the `ProcessManager` interface and its Windows and Linux implementations (`BACKEND_SPEC.md` §3). Spawn an executable from an argument array with `shell: false` and an explicit working directory, expose the PID, exit code / signal and exit events, capture or discard stdio without blocking, and terminate the whole process tree on demand. Linux: dedicated process group (`detached: true`) and group signalling (`SIGTERM`, then `SIGKILL`). Windows: tree termination that holds even if DSM crashes (Job Object with kill-on-close, or a documented fallback).
- **Scope Boundaries**:
  - **Included**: Interface, two adapters and a platform factory; process-tree force-kill; liveness check by PID; integration tests spawning a real child Node process (with a grandchild) on the CI platform.
  - **Excluded / Deferred**: DayZ-specific logic, RCON, status persistence, HTTP routes (`DSM-00162`).
- **Open Decision**: A Windows Job Object needs native calls (FFI dependency such as `koffi`) versus dependency-free `taskkill /T /F` plus PID tracking; resolve in the requirements phase.

---

### [DSM-00161] BattlEye RCON packet codec and login handshake

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00104`
- **High-Level Requirements**:
  A BattlEye RCON (BE RCon v2, UDP) client library frames and parses packets with CRC32 and logs in to a server, returning a typed result for success, wrong password, and no answer. The RCON password is never logged.
- **Scope Boundaries**:
  - **Included**: Packet encode/decode with CRC32 validation; login request/response; typed errors (`login_failed`, `timeout`, `unreachable`); tests against an in-process fake BattlEye UDP server.
  - **Excluded / Deferred**: Commands and multi-part responses (`DSM-00165`); keep-alive and server-message acknowledgement (`DSM-00166`); shutdown orchestration (`DSM-00163`).

---

### [DSM-00162] Server Lifecycle State Machine, Start, and Force-Stop

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00124`, `DSM-00125`, `DSM-00160`
- **High-Level Requirements**:
  Own the server status machine (`stopped → starting → running → stopping → stopped`, plus `crashed` on unexpected exit) with serialized transitions per server. `POST /api/v1/servers/:id/start` compiles the launch command (`DSM-00125`, refusing when `ready` is false), calls `assertNoActiveEditLock` (`DSM-00124`) and spawns via `ProcessManager`. Persist PID and start time; on DSM startup reconcile stored state with the OS (adopt, or mark crashed/stopped). `POST /api/v1/servers/:id/force-stop` kills the process tree.
- **Scope Boundaries**:
  - **Included**: Status contract change (`crashed`), migration for PID / timestamps, lifecycle service, start and force-stop routes with error codes, startup reconciliation, concurrency guards (double start, start during stop).
  - **Excluded / Deferred**: Graceful RCON stop and restart (`DSM-00163`), UI (`DSM-00164`), A2S readiness (`DSM-00114`), SSE push (`DSM-00115`).

---

### [DSM-00163] Gracefully stop a running server via RCON #shutdown

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00162`, `DSM-00165`
- **High-Level Requirements**:
  `POST /api/v1/servers/:id/stop` sends RCON `#shutdown` so persistence is flushed, waits for exit, and force-kills through `ProcessManager` only when the watchdog timeout expires; the fallback is recorded in the last-exit record. If RCON is unreachable the request fails with a dedicated error code and nothing is killed.
- **Scope Boundaries**:
  - **Included**: Stop route and error codes; watchdog timeout setting; last-exit reason distinguishing graceful exit from fallback kill; tests with a fake RCON server and fake `ProcessManager`.
  - **Excluded / Deferred**: Delay with in-game warning (`DSM-00167`); restart (`DSM-00168`); UI (`DSM-00171`); scheduled restarts (`DSM-00140`).

---

### [DSM-00164] Show live server status in the shell

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00162`, `DSM-00173`
- **High-Level Requirements**:
  The shell shows the active server's lifecycle status (`stopped`, `starting`, `running`, `stopping`, `failed`) and, after an unexpected exit, the last-exit reason, updated live from `server.status.changed` without reloading.
- **Scope Boundaries**:
  - **Included**: Status presentation in the shell header / server selector; last-exit reason; cache update via the shared SSE subscription; tests.
  - **Excluded / Deferred**: Action controls (`DSM-00169`, `DSM-00170`, `DSM-00171`, `DSM-00172`); dashboard (`DSM-00112`).

---

### [DSM-00165] Send an RCON command and receive its full response

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00161`
- **High-Level Requirements**:
  After login, the client sends a command with a sequence number and resolves with the complete response text, reassembling multi-part responses. An unacknowledged command is retried a bounded number of times and then fails with a typed timeout.
- **Scope Boundaries**:
  - **Included**: Sequence numbering (0–255 wrap), acknowledgement matching, multi-part reassembly, bounded retry and timeout; fake-server tests including dropped packets.
  - **Excluded / Deferred**: Parsing of specific command outputs such as `players` (`DSM-00194`).

---

### [DSM-00166] Keep an RCON session alive and disconnect cleanly

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00161`
- **High-Level Requirements**:
  An open session acknowledges every server message so BattlEye does not resend it, sends a keep-alive before the server's idle timeout, reports when the connection is lost, and closes cleanly on request.
- **Scope Boundaries**:
  - **Included**: Server-message acknowledgement, keep-alive timer, connection-lost event, idempotent close releasing socket and timers.
  - **Excluded / Deferred**: Automatic reconnection policy (decided by each consumer PBI).

---

### [DSM-00167] Delay a graceful stop with an in-game warning and cancellation

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00163`
- **High-Level Requirements**:
  A stop request may carry `delaySec`: DSM broadcasts an in-game warning (`#say -1`), waits, then runs the graceful stop. The pending stop can be cancelled; the server stays `running` while it waits.
- **Scope Boundaries**:
  - **Included**: `delaySec` on the stop request; warning broadcast; cancel endpoint; one pending stop per server (`409` on a second); fake-clock tests.
  - **Excluded / Deferred**: Multi-stage countdown warnings (`DSM-00242`).

---

### [DSM-00168] Restart a server (graceful stop, then start)

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00167`
- **High-Level Requirements**:
  `POST /api/v1/servers/:id/restart` runs the graceful stop (with optional delay) and then a start, reporting a failure in either phase with its own error code. A restart during another transition is refused.
- **Scope Boundaries**:
  - **Included**: Restart route, phase-specific error codes, delay passthrough, tests.
  - **Excluded / Deferred**: Scheduled restarts (`DSM-00241`); UI (`DSM-00172`).

---

### [DSM-00169] Start the active server from the UI

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00164`
- **High-Level Requirements**:
  A Start control starts the active server with a green toast on success and a red toast on any API error. When start is impossible the control stays focusable but disabled and says why (config edit lock held, launch command not ready, transition in progress).
- **Scope Boundaries**:
  - **Included**: Start control, disabled reasons, feedback contract (`GEMINI.md` §5), tests and live QA.
  - **Excluded / Deferred**: Stop, restart and force-stop controls.

---

### [DSM-00170] Force-stop the active server with a warning confirmation

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00164`
- **High-Level Requirements**:
  A Force-stop control kills the active server after a confirmation warning that unsaved world progress will be lost; results toast per the feedback contract.
- **Scope Boundaries**:
  - **Included**: Control, confirmation dialog, toasts, tests.
  - **Excluded / Deferred**: Graceful stop (`DSM-00171`).

---

### [DSM-00171] Gracefully stop the active server with a delay choice

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00164`, `DSM-00167`
- **High-Level Requirements**:
  A Stop control opens a dialog to stop now or after a chosen delay with an in-game warning, and lets the operator cancel a pending delayed stop. If RCON is unreachable the error points to force-stop as the remaining option.
- **Scope Boundaries**:
  - **Included**: Stop dialog with delay presets, pending-stop indicator with cancel, toasts, tests.
  - **Excluded / Deferred**: Restart control (`DSM-00172`).

---

### [DSM-00172] Restart the active server from the UI

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00113`
- **Depends On**: `DSM-00171`, `DSM-00168`
- **High-Level Requirements**:
  A Restart control reuses the stop dialog's delay choice and restarts the server, telling the operator which phase failed if it does.
- **Scope Boundaries**:
  - **Included**: Control, toasts, tests and live QA.
  - **Excluded / Deferred**: Scheduled restarts (`DSM-00140`).

---

### [DSM-00173] Shared web SSE subscription that updates the query cache

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `DONE`
- **Parent**: `DSM-00115`
- **Depends On**: `None`
- **High-Level Requirements**:
  The web app opens one authenticated EventSource to `/api/v1/realtime/sse` per tab, reconnects with backoff, and routes typed events into the TanStack Query cache, starting with `server.status.changed`. It closes on sign-out.
- **Scope Boundaries**:
  - **Included**: Subscription provider/hook; event-to-cache mapping for server status; reconnect backoff; close on sign-out; tests with a fake EventSource.
  - **Excluded / Deferred**: Replay after reconnect (`DSM-00174`); migrating the Steam auth challenge hook (`DSM-00175`).

---

### [DSM-00174] Replay missed SSE events after reconnect (Last-Event-ID)

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00115`
- **Depends On**: `DSM-00173`
- **High-Level Requirements**:
  The hub assigns increasing event IDs and keeps a bounded ring buffer, so a client reconnecting with `Last-Event-ID` receives the events it missed, or a reset signal (triggering a refetch) when they fell out of the buffer.
- **Scope Boundaries**:
  - **Included**: Event IDs, bounded buffer, replay, reset event handled by the client.
  - **Excluded / Deferred**: Durable event persistence.

---

### [DSM-00175] Move the Steam auth challenge onto the shared SSE subscription

- **Priority**: `P3 (Low)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00115`
- **Depends On**: `DSM-00173`
- **High-Level Requirements**:
  `useSteamAuthChallenge` stops opening its own EventSource and consumes `steam.auth.status` from the shared subscription, with no behaviour change.
- **Scope Boundaries**:
  - **Included**: Refactor only; existing tests stay green.
  - **Excluded / Deferred**: Any behaviour change.

---

### [DSM-00176] Spike: process and host resource sampling on Windows and Linux

- **Priority**: `P1 (High)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `None`
- **High-Level Requirements**:
  Establish how to sample the DayZ process's CPU, memory, disk I/O, network and handle count, and host CPU/memory/disk, on Windows and Linux without third-party CLI tools, and the cost per sample. Output: ADR with the approach per metric and the infeasible ones.
- **Scope Boundaries**:
  - **Included**: Prototype measurements, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00177] Sample the DayZ server process's CPU and memory

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00176`, `DSM-00162`
- **High-Level Requirements**:
  While a server runs, the backend samples its CPU (core-normalised %) and resident memory at a fixed interval into a bounded in-memory buffer; `GET /api/v1/servers/:id/telemetry` returns the latest samples. Sampling stops with the server.
- **Scope Boundaries**:
  - **Included**: Platform sampler adapter (Windows + Linux), ring buffer, read endpoint and contract, tests with fake samplers.
  - **Excluded / Deferred**: Host metrics (`DSM-00178`); push (`DSM-00179`); persistence (`DSM-00181`); disk/network/handles (`DSM-00182`).

---

### [DSM-00178] Sample host CPU, memory and disk headroom

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00177`
- **High-Level Requirements**:
  Telemetry also reports host CPU %, total/used memory, and free space on the volume holding the server install.
- **Scope Boundaries**:
  - **Included**: Host sampler, backward-compatible contract extension, tests.
  - **Excluded / Deferred**: Per-core breakdown (`DSM-00236`).

---

### [DSM-00179] Push telemetry samples over SSE at a selectable interval

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00177`
- **High-Level Requirements**:
  Each sample is broadcast as a `server.telemetry` SSE event; the interval can be set to 2 s, 5 s or 30 s (default 5 s).
- **Scope Boundaries**:
  - **Included**: Event contract, interval setting endpoint, tests.
  - **Excluded / Deferred**: Header selector UI (`DSM-00183`).

---

### [DSM-00180] Add telemetry rollup table (migration)

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration adds storage for per-minute telemetry rollups keyed by server and minute, indexed for range queries. No behaviour change.
- **Scope Boundaries**:
  - **Included**: Migration and migration test.
  - **Excluded / Deferred**: Writer (`DSM-00181`).

---

### [DSM-00181] Persist per-minute telemetry rollups and query them by range

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00177`, `DSM-00180`
- **High-Level Requirements**:
  Samples are rolled up per minute and written in batches with a retention limit, so history survives DSM restarts and can be read by time range.
- **Scope Boundaries**:
  - **Included**: Batched rollup writer, retention pruning, range query endpoint, tests.
  - **Excluded / Deferred**: Charts (`DSM-00139`).

---

### [DSM-00182] Sample process disk I/O, network traffic and handle count

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00177`
- **High-Level Requirements**:
  Adds the extended metrics the spike found feasible to each sample; infeasible ones are omitted, not faked.
- **Scope Boundaries**:
  - **Included**: Samplers, backward-compatible contract extension, tests.
  - **Excluded / Deferred**: Per-connection network breakdown.

---

### [DSM-00183] Telemetry update-interval selector in the console header

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00122`
- **Depends On**: `DSM-00179`, `DSM-00173`
- **High-Level Requirements**:
  Operators choose Live (2 s), Standard (5 s) or Ambient (30 s) in the header; the choice is applied server-side and the client throttles re-renders to that rate.
- **Scope Boundaries**:
  - **Included**: Selector, saving via the interval endpoint, toasts, tests.
  - **Excluded / Deferred**: Per-operator intervals.

---

### [DSM-00184] Dashboard hero with server identity, connection info and uptime

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `TODO`
- **Parent**: `DSM-00112`
- **Depends On**: `None`
- **High-Level Requirements**:
  `/dashboard` replaces the placeholder with a hero for the active server showing name, IP, game and query ports, lifecycle status and uptime since start, plus an empty state when no server exists.
- **Scope Boundaries**:
  - **Included**: Hero banner bound to server detail, status tag, uptime from `runtime.startedAt`, empty state, tests.
  - **Excluded / Deferred**: KPI cards (`DSM-00185`, `DSM-00186`); actions (`DSM-00187`).

---

### [DSM-00185] Dashboard CPU and memory KPI cards

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00112`
- **Depends On**: `DSM-00184`, `DSM-00178`, `DSM-00179`
- **High-Level Requirements**:
  KPI cards show the server process and host CPU and memory from the latest telemetry, updating live, with a clear "server not running" state.
- **Scope Boundaries**:
  - **Included**: Four KPI cards, live updates, stopped state, tests.
  - **Excluded / Deferred**: Charts (`DSM-00139`).

---

### [DSM-00186] Dashboard player count KPI card

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00112`
- **Depends On**: `DSM-00184`, `DSM-00190`
- **High-Level Requirements**:
  A KPI card shows current / max players from the A2S query, or "unavailable" when the server does not answer.
- **Scope Boundaries**:
  - **Included**: KPI card, unavailable state, tests.
  - **Excluded / Deferred**: Server FPS (no data source).

---

### [DSM-00187] Dashboard quick lifecycle actions

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00112`
- **Depends On**: `DSM-00184`, `DSM-00169`, `DSM-00171`, `DSM-00172`, `DSM-00170`
- **High-Level Requirements**:
  The dashboard hero hosts the same Start / Stop / Restart / Force-stop controls as the shell with identical rules and feedback.
- **Scope Boundaries**:
  - **Included**: Reuse of the shell controls, tests.
  - **Excluded / Deferred**: New lifecycle behaviour.

---

### [DSM-00188] Dashboard recent alerts and running tasks panel

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00112`
- **Depends On**: `DSM-00184`, `DSM-00334`
- **High-Level Requirements**:
  A panel lists the latest notification-centre alerts and currently running background tasks with progress.
- **Scope Boundaries**:
  - **Included**: Panel, empty state, tests.
  - **Excluded / Deferred**: Alert history beyond the notification store.

---

### [DSM-00189] Steam A2S_INFO query client

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00114`
- **Depends On**: `None`
- **High-Level Requirements**:
  A UDP client sends `A2S_INFO` to a server's query port, handles the challenge response, and returns name, map, players, max players, version and round-trip time, or a typed timeout.
- **Scope Boundaries**:
  - **Included**: Protocol codec, challenge handling, timeout, tests with a fake UDP server.
  - **Excluded / Deferred**: `A2S_PLAYER` / `A2S_RULES` (`DSM-00192`).

---

### [DSM-00190] Expose live query info for a running server

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00114`
- **Depends On**: `DSM-00189`, `DSM-00162`
- **High-Level Requirements**:
  `GET /api/v1/servers/:id/query` returns A2S info for a running server, cached briefly to avoid flooding, or a typed unavailable state.
- **Scope Boundaries**:
  - **Included**: Route, contract, short cache, tests.
  - **Excluded / Deferred**: Push over SSE.

---

### [DSM-00191] Mark a server running only once it answers A2S

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00114`
- **Depends On**: `DSM-00189`, `DSM-00162`
- **High-Level Requirements**:
  After start the server stays `starting` until its first A2S answer (instead of a fixed window) and becomes `failed` with a readiness-timeout exit reason if it never answers.
- **Scope Boundaries**:
  - **Included**: Readiness probe, backward-compatible exit-reason addition, tests.
  - **Excluded / Deferred**: Freeze detection (`DSM-00193`).

---

### [DSM-00192] A2S_PLAYER and A2S_RULES queries

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00114`
- **Depends On**: `DSM-00189`
- **High-Level Requirements**:
  The query client also returns the A2S player list (name, score, duration) and server rules.
- **Scope Boundaries**:
  - **Included**: Codec additions, tests.
  - **Excluded / Deferred**: UI.

---

### [DSM-00193] Detect a frozen server and raise an alert

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00114`
- **Depends On**: `DSM-00189`, `DSM-00166`
- **High-Level Requirements**:
  When a running server's process exists but neither A2S nor RCON answers for a configurable period, DSM raises one notification-centre alert and logs it; recovery clears it.
- **Scope Boundaries**:
  - **Included**: Watchdog loop, threshold setting, alert, tests with fakes.
  - **Excluded / Deferred**: Automatic restart of frozen servers; new status value.

---

### [DSM-00194] List connected players via RCON

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00165`
- **High-Level Requirements**:
  `GET /api/v1/servers/:id/players` runs RCON `players` and returns each player's slot, name, BattlEye GUID, IP, ping and lobby flag, or a typed error when RCON is unavailable.
- **Scope Boundaries**:
  - **Included**: Output parser with fixtures, route, contract, tests.
  - **Excluded / Deferred**: Identity resolution (`DSM-00201`).

---

### [DSM-00195] Players page: read-only table of connected players

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00194`
- **High-Level Requirements**:
  `/players` lists connected players with name, GUID, IP and ping, refreshing periodically, with search by name / GUID and empty / RCON-unavailable states.
- **Scope Boundaries**:
  - **Included**: Table, search, refresh, states, tests.
  - **Excluded / Deferred**: Moderation actions.

---

### [DSM-00196] Broadcast a global in-game message

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00165`, `DSM-00195`
- **High-Level Requirements**:
  Operators send a message to all players (`#say -1`) from `/players`; results toast per the feedback contract.
- **Scope Boundaries**:
  - **Included**: Endpoint, message dialog with length limit, toasts, tests.
  - **Excluded / Deferred**: Direct messages (`DSM-00200`); scheduled announcements (`DSM-00149`).

---

### [DSM-00197] Kick a player with a reason

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00195`
- **High-Level Requirements**:
  Operators kick a player from their row with a reason after confirmation; the table refreshes.
- **Scope Boundaries**:
  - **Included**: Endpoint, confirmation dialog, toasts, tests.
  - **Excluded / Deferred**: Bans.

---

### [DSM-00198] Ban a player with duration and reason

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00195`
- **High-Level Requirements**:
  Operators ban a connected player by GUID with a duration preset (1 h, 1 d, 7 d, permanent) and a reason after confirmation.
- **Scope Boundaries**:
  - **Included**: Endpoint, ban dialog, toasts, tests.
  - **Excluded / Deferred**: Ban list and unban (`DSM-00199`); offline bans.

---

### [DSM-00199] List and lift bans

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00198`
- **High-Level Requirements**:
  A bans view lists active BattlEye bans and lets operators remove one after confirmation.
- **Scope Boundaries**:
  - **Included**: Ban list parser, unban endpoint, view, tests.
  - **Excluded / Deferred**: Ban import/export.

---

### [DSM-00200] Send a direct message to one player

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00195`
- **High-Level Requirements**:
  Operators send a private in-game message to one player from their row.
- **Scope Boundaries**:
  - **Included**: Endpoint, dialog, toasts, tests.
  - **Excluded / Deferred**: Chat history.

---

### [DSM-00201] Spike: resolve Steam64 and DayZ IDs for connected players

- **Priority**: `P2 (Medium)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00194`
- **High-Level Requirements**:
  Determine how to map BattlEye GUIDs to Steam64 and DayZ (Bohemia) IDs from available sources (ADM connect lines, GUID derivation from Steam64) and how reliable each is. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Research, prototype, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00202] Show Steam64 and Steam persona / avatar for players

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00201`
- **High-Level Requirements**:
  The players table shows Steam64 and the Steam persona name and avatar where resolvable, with a fallback when not.
- **Scope Boundaries**:
  - **Included**: Resolver per the spike, columns, tests.
  - **Excluded / Deferred**: Steam profile deep inspection.

---

### [DSM-00203] Show player country from IP

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00195`
- **High-Level Requirements**:
  A country column resolves player IPs with an offline GeoIP database (new dependency, ADR); no IP leaves the host.
- **Scope Boundaries**:
  - **Included**: Offline lookup, column, tests.
  - **Excluded / Deferred**: Online lookup services.

---

### [DSM-00204] Manage the server whitelist

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00123`
- **High-Level Requirements**:
  Operators view, add and remove whitelist entries for a server and see whether whitelisting is enabled in `serverDZ.cfg`.
- **Scope Boundaries**:
  - **Included**: Whitelist file read/write (atomic), view, toasts, tests.
  - **Excluded / Deferred**: Paid whitelist grants (`DSM-00150`).

---

### [DSM-00205] Manage the priority queue list

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00116`
- **Depends On**: `DSM-00123`
- **High-Level Requirements**:
  Operators view, add and remove Steam64 IDs in the server's priority queue list; the file location and format are confirmed against current DayZ server documentation first.
- **Scope Boundaries**:
  - **Included**: Priority file read/write (atomic), view, toasts, tests.
  - **Excluded / Deferred**: Paid priority grants (`DSM-00150`).

---

### [DSM-00206] Stream the active RPT log over SSE

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00162`
- **High-Level Requirements**:
  While a server runs, the backend tails its newest `.RPT` file in the profiles directory and broadcasts new lines as `server.log` SSE events, keeping the last N lines in a bounded buffer that `GET /api/v1/servers/:id/logs/rpt` returns for the initial load.
- **Scope Boundaries**:
  - **Included**: File locator, tail from offset, bounded buffer, event and contract, tests with temp files.
  - **Excluded / Deferred**: Rotation (`DSM-00209`); ADM and script logs.

---

### [DSM-00207] LogViewer component in @aegis/ui

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `IN_PROGRESS`
- **Parent**: `DSM-00117`
- **Depends On**: `None`
- **High-Level Requirements**:
  A reusable log viewer renders a large, growing list of lines virtualised, auto-scrolls to new lines, pauses when the user scrolls up and offers "jump to latest", with accessible live-region semantics.
- **Scope Boundaries**:
  - **Included**: Component, stories, tests with 100k lines.
  - **Excluded / Deferred**: Data fetching and filtering (feature PBIs).

---

### [DSM-00208] Live RPT viewer at /logs/rpt

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00206`, `DSM-00173`, `DSM-00207`
- **High-Level Requirements**:
  `/logs/rpt` shows the buffered lines then appends live ones using the LogViewer component.
- **Scope Boundaries**:
  - **Included**: Route view wiring the RPT buffer and live events into LogViewer, states, tests.
  - **Excluded / Deferred**: Filtering (`DSM-00210`).

---

### [DSM-00209] Follow the RPT log to the new file after a restart

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00206`
- **High-Level Requirements**:
  When the server starts a new RPT file, tailing switches to it and clients get a separator marking the new file.
- **Scope Boundaries**:
  - **Included**: Rotation detection, separator event, tests.
  - **Excluded / Deferred**: Archiving old logs.

---

### [DSM-00210] Filter log lines by severity and text

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00208`
- **High-Level Requirements**:
  Operators filter the viewer by severity (info, warning, error) and by text or regex; an invalid regex shows an inline error.
- **Scope Boundaries**:
  - **Included**: Filters, tests.
  - **Excluded / Deferred**: Server-side search over history.

---

### [DSM-00211] Download the full current log file

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00206`
- **High-Level Requirements**:
  Operators download the complete current log file, not only the buffered lines.
- **Scope Boundaries**:
  - **Included**: Download endpoint (path-safe), button, tests.
  - **Excluded / Deferred**: Bulk download of old logs.

---

### [DSM-00212] Live ADM log view at /logs/adm

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00208`
- **High-Level Requirements**:
  `/logs/adm` streams the server's ADM log with the same viewer behaviour as RPT.
- **Scope Boundaries**:
  - **Included**: ADM locator and tail, view, tests.
  - **Excluded / Deferred**: Combat analysis.

---

### [DSM-00213] Live script log view at /logs/script

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00117`
- **Depends On**: `DSM-00208`
- **High-Level Requirements**:
  `/logs/script` streams the Enforce script log with the same viewer behaviour.
- **Scope Boundaries**:
  - **Included**: Script log locator and tail, view, tests.
  - **Excluded / Deferred**: Script error aggregation.

---

### [DSM-00214] Create an on-demand backup of server persistence

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00162`
- **High-Level Requirements**:
  `POST /api/v1/servers/:id/backups` archives the mission persistence (`storage_*`) of a stopped server into `manager-data/backups/<serverId>/` with a timestamped name, and `GET` lists them; a running server is refused with a dedicated error code.
- **Scope Boundaries**:
  - **Included**: Archive writer, create and list endpoints, contract, tests.
  - **Excluded / Deferred**: Other scopes (`DSM-00218`); live snapshots of a running server.

---

### [DSM-00215] Backups page: list backups and create one

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00214`
- **High-Level Requirements**:
  `/settings/backups` lists a server's backups (date, scope, size) with a "Back up now" action and result toasts; the action is disabled with a reason while the server runs.
- **Scope Boundaries**:
  - **Included**: View, action, states, tests.
  - **Excluded / Deferred**: Download, delete, restore.

---

### [DSM-00216] Download a backup archive

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00215`
- **High-Level Requirements**:
  Operators download any listed backup archive.
- **Scope Boundaries**:
  - **Included**: Path-safe download endpoint, button, tests.
  - **Excluded / Deferred**: Off-site upload.

---

### [DSM-00217] Delete a backup with confirmation

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00215`
- **High-Level Requirements**:
  Operators delete a backup after confirmation; only files inside the backup directory can be deleted.
- **Scope Boundaries**:
  - **Included**: Endpoint with path guard, confirmation, toasts, tests.
  - **Excluded / Deferred**: Retention (`DSM-00220`).

---

### [DSM-00218] Choose backup scope: profiles, configs or full install

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00215`
- **High-Level Requirements**:
  Creating a backup offers scopes beyond persistence: profiles, configuration files, or the complete installation.
- **Scope Boundaries**:
  - **Included**: Scope selection, backward-compatible contract extension, tests.
  - **Excluded / Deferred**: Custom file lists.

---

### [DSM-00219] Restore a persistence backup

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00215`
- **High-Level Requirements**:
  Operators restore a backup into a stopped server after keyword confirmation; DSM first takes a safety backup of the current state and swaps atomically, leaving the current state intact if the restore fails.
- **Scope Boundaries**:
  - **Included**: Restore endpoint, safety backup, atomic swap, keyword dialog, tests.
  - **Excluded / Deferred**: Partial restores.

---

### [DSM-00220] Keep only the last N backups per server

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00217`
- **High-Level Requirements**:
  Operators set how many backups to keep per server; older ones are pruned after each new backup. Safety backups from restore/wipe are never pruned automatically.
- **Scope Boundaries**:
  - **Included**: Setting, pruning, tests.
  - **Excluded / Deferred**: Time-based retention.

---

### [DSM-00221] Wipe server persistence with keyword confirmation

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00118`
- **Depends On**: `DSM-00214`
- **High-Level Requirements**:
  On `/maintenance`, operators wipe the persistence of a stopped server after typing `CONFIRM_WIPE`; DSM always takes a pre-wipe backup first and aborts the wipe if that backup fails.
- **Scope Boundaries**:
  - **Included**: Wipe endpoint, pre-wipe backup, keyword dialog, toasts, tests.
  - **Excluded / Deferred**: Partial wipes (e.g. vehicles only).

---

### [DSM-00222] Spike: parse and edit a large types.xml in a Web Worker without losing formatting

- **Priority**: `P1 (High)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `None`
- **High-Level Requirements**:
  Decide how to parse 20,000+ `<type>` entries off the main thread, edit individual values, and serialise back with comments and formatting preserved; measure parse time and memory. Output: ADR with prototype numbers.
- **Scope Boundaries**:
  - **Included**: Prototype, measurements, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00223] View types.xml in a read-only editor

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00123`, `DSM-00136`
- **High-Level Requirements**:
  `/economy/types` (behind the `economyWorkbench` flag) loads the active mission's `db/types.xml` through a new read endpoint and shows it read-only in the CodeMirror editor.
- **Scope Boundaries**:
  - **Included**: Path-safe read endpoint, view, states, tests.
  - **Excluded / Deferred**: Editing (`DSM-00224`).

---

### [DSM-00224] Edit and save types.xml in the raw editor

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00223`
- **High-Level Requirements**:
  Operators edit the raw XML and save; malformed XML is refused with inline diagnostics, otherwise the file is written atomically after a timestamped `.bak` copy.
- **Scope Boundaries**:
  - **Included**: Write endpoint, well-formedness check, atomic write, form conventions (`DSM-00137`), tests.
  - **Excluded / Deferred**: Semantic rules (`DSM-00230`).

---

### [DSM-00225] Virtualised rows for the Table component

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `None`
- **High-Level Requirements**:
  The `@aegis/ui` Table gains an opt-in virtualised mode that scrolls smoothly through 20,000+ rows with sticky headers and keyboard navigation, without changing the existing non-virtual behaviour.
- **Scope Boundaries**:
  - **Included**: Table extension (new dependency only if needed, ADR), stories, tests.
  - **Excluded / Deferred**: Feature data wiring.

---

### [DSM-00226] Browse types.xml as a virtualised table

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00222`, `DSM-00223`, `DSM-00225`
- **High-Level Requirements**:
  A read-only table lists every type with name, nominal, min, lifetime, restock, category, usages and tiers, parsed in a Web Worker and shown with the virtualised Table.
- **Scope Boundaries**:
  - **Included**: Worker parser, table wiring, tests.
  - **Excluded / Deferred**: Filters (`DSM-00227`); editing (`DSM-00228`).

---

### [DSM-00227] Filter types by name, category, usage and tier

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00226`
- **High-Level Requirements**:
  Operators narrow the table by name search, category, usage and tier.
- **Scope Boundaries**:
  - **Included**: Filters, tests.
  - **Excluded / Deferred**: Saved filter presets.

---

### [DSM-00228] Edit one type's values from the table

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00226`, `DSM-00224`
- **High-Level Requirements**:
  Operators change one type's numeric values in the table and save through the same atomic save path.
- **Scope Boundaries**:
  - **Included**: Row editor, save, tests.
  - **Excluded / Deferred**: Batch editing (`DSM-00229`).

---

### [DSM-00229] Batch-edit nominal, min and lifetime for selected types

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00228`
- **High-Level Requirements**:
  Operators select several rows and set or scale (%) nominal, min or lifetime, see how many types change, then save.
- **Scope Boundaries**:
  - **Included**: Batch dialog, preview count, tests.
  - **Excluded / Deferred**: Undo history.

---

### [DSM-00230] Validate types.xml values and references

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00224`
- **High-Level Requirements**:
  Diagnostics flag min > nominal, negative values, and categories / usages / tags not defined in `cfglimitsdefinition.xml`; such warnings do not block saving, malformed XML does.
- **Scope Boundaries**:
  - **Included**: Rule checks, diagnostics, tests.
  - **Excluded / Deferred**: Auto-fix.

---

### [DSM-00231] View and edit cfgspawnabletypes.xml in the raw editor

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00120`
- **Depends On**: `DSM-00224`
- **High-Level Requirements**:
  `/economy/cfgspawnabletypes` offers the same raw view / save flow for `cfgspawnabletypes.xml`.
- **Scope Boundaries**:
  - **Included**: View, save, tests.
  - **Excluded / Deferred**: Table view.

---

### [DSM-00232] TimeSeriesChart component in @aegis/ui

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `None`
- **High-Level Requirements**:
  A reusable time-series chart renders one or more series with Aegis theme tokens in all palettes, tooltips, units and an accessible data summary, and appends points without full re-render. Introduces the charting dependency (ADR).
- **Scope Boundaries**:
  - **Included**: Component, ADR, stories, tests.
  - **Excluded / Deferred**: Feature data wiring.

---

### [DSM-00233] Live CPU and memory charts at /system

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00178`, `DSM-00179`, `DSM-00173`, `DSM-00232`
- **High-Level Requirements**:
  `/system` charts the server process and host CPU and memory over the live buffer window with TimeSeriesChart, updating as samples arrive.
- **Scope Boundaries**:
  - **Included**: Route view, data wiring, states, tests.
  - **Excluded / Deferred**: History (`DSM-00234`).

---

### [DSM-00234] Historical time-range selector (15m, 1h, 6h, 24h)

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00233`, `DSM-00181`
- **High-Level Requirements**:
  Operators switch charts between live and 15 m / 1 h / 6 h / 24 h history read from persisted rollups, downsampled to fit.
- **Scope Boundaries**:
  - **Included**: Range selector, downsampling, tests.
  - **Excluded / Deferred**: Custom ranges.

---

### [DSM-00235] Disk I/O and network charts

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00233`, `DSM-00182`
- **High-Level Requirements**:
  `/system` adds disk read/write and network throughput charts for the metrics available.
- **Scope Boundaries**:
  - **Included**: Charts, tests.
  - **Excluded / Deferred**: Per-connection detail.

---

### [DSM-00236] Per-core host CPU chart

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00233`
- **High-Level Requirements**:
  Host CPU can be shown per core.
- **Scope Boundaries**:
  - **Included**: Per-core sampling, chart, tests.
  - **Excluded / Deferred**: Per-thread process CPU.

---

### [DSM-00237] Server process tree inspector

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00233`
- **High-Level Requirements**:
  `/system` lists the DayZ server's child processes and DSM-owned SteamCMD processes with PID, CPU and memory.
- **Scope Boundaries**:
  - **Included**: Process tree read, table, tests.
  - **Excluded / Deferred**: Killing processes from this view.

---

### [DSM-00238] Memory-growth warning for the server process

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00139`
- **Depends On**: `DSM-00234`
- **High-Level Requirements**:
  A warning appears when the server process memory grows faster than a configurable rate over the selected window.
- **Scope Boundaries**:
  - **Included**: Growth calculation, warning, tests.
  - **Excluded / Deferred**: Automatic restarts.

---

### [DSM-00239] Add restart schedule table (migration)

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration adds storage for per-server daily restart times. No behaviour change.
- **Scope Boundaries**:
  - **Included**: Migration and migration test.
  - **Excluded / Deferred**: API (`DSM-00240`).

---

### [DSM-00240] Create daily restart times and see the next run

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00239`
- **High-Level Requirements**:
  On `/maintenance`, operators add daily restart times for a server (shown in their timezone) and see the next scheduled run.
- **Scope Boundaries**:
  - **Included**: Schedules API (create, list), card, toasts, tests.
  - **Excluded / Deferred**: Edit/delete (`DSM-00243`); execution (`DSM-00241`).

---

### [DSM-00241] Run scheduled restarts

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00240`, `DSM-00168`
- **High-Level Requirements**:
  At each scheduled time a running server is restarted through the restart pipeline; a stopped server is skipped and logged; runs missed while DSM was down are not replayed.
- **Scope Boundaries**:
  - **Included**: Scheduler loop, skip rules, tests with a fake clock.
  - **Excluded / Deferred**: Warnings (`DSM-00242`).

---

### [DSM-00242] Countdown warnings before scheduled restarts

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00241`, `DSM-00165`
- **High-Level Requirements**:
  Before a scheduled restart, players get `#say` warnings at 30, 15, 5 and 1 minutes.
- **Scope Boundaries**:
  - **Included**: Warning schedule, tests with a fake clock.
  - **Excluded / Deferred**: Custom warning stages.

---

### [DSM-00243] Edit, disable and delete restart schedules

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00240`
- **High-Level Requirements**:
  Operators edit, disable or delete a restart time; deletion asks for confirmation.
- **Scope Boundaries**:
  - **Included**: API, card actions, tests.
  - **Excluded / Deferred**: Bulk edits.

---

### [DSM-00244] Back up persistence before each scheduled restart

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00241`, `DSM-00214`
- **High-Level Requirements**:
  A schedule option takes a persistence backup after the server stops and before it starts again; a failed backup is reported but does not block the restart.
- **Scope Boundaries**:
  - **Included**: Option, pipeline hook, tests.
  - **Excluded / Deferred**: Backups for manual restarts.

---

### [DSM-00245] Lock the server to new joins during maintenance

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00165`
- **High-Level Requirements**:
  A toggle locks or unlocks the server via RCON `#lock` / `#unlock` and shows the current state; behaviour across restarts is confirmed and documented.
- **Scope Boundaries**:
  - **Included**: Endpoints, toggle, toasts, tests.
  - **Excluded / Deferred**: Custom rejection message.

---

### [DSM-00246] Emergency kill that preserves diagnostics

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00140`
- **Depends On**: `DSM-00170`
- **High-Level Requirements**:
  Before force-killing a hung server, DSM copies the current RPT and any crash dumps into a diagnostics folder and links it in the result.
- **Scope Boundaries**:
  - **Included**: Copy step, link, tests.
  - **Excluded / Deferred**: Memory dump capture.

---

### [DSM-00247] Spike: map tile source and licensing

- **Priority**: `P2 (Medium)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `None`
- **High-Level Requirements**:
  Find a tile source for Chernarus, Livonia, Sakhal and Namalsk that DSM may legally bundle or fetch, plus map sizes and coordinate origins; confirm Leaflet as the map library. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Research, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00248] MapCanvas component with DayZ coordinate system

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00247`
- **High-Level Requirements**:
  A reusable map canvas wraps the map library chosen in the spike, renders a tile set with a DayZ coordinate system (south-west (0, 0) origin) and accepts overlay layers, themed with Aegis tokens.
- **Scope Boundaries**:
  - **Included**: Map library adoption, component, DayZ CRS, stories, tests.
  - **Excluded / Deferred**: Route and map data.

---

### [DSM-00249] Show the Chernarus map at /world/map

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00247`, `DSM-00248`
- **High-Level Requirements**:
  `/world/map` (behind the `worldMap` flag) shows a pannable, zoomable Chernarus map using MapCanvas.
- **Scope Boundaries**:
  - **Included**: Route view, Chernarus tile config, tests.
  - **Excluded / Deferred**: Other maps (`DSM-00251`).

---

### [DSM-00250] Cursor coordinate readout and click-to-copy

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00249`
- **High-Level Requirements**:
  The map shows the DayZ coordinates under the cursor and copies them on click.
- **Scope Boundaries**:
  - **Included**: Readout, copy, tests.
  - **Excluded / Deferred**: Coordinate search.

---

### [DSM-00251] Switch between Livonia, Sakhal and Namalsk

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00249`
- **High-Level Requirements**:
  A selector switches the map, defaulting to the active server's mission map.
- **Scope Boundaries**:
  - **Included**: Map configs, selector, tests.
  - **Excluded / Deferred**: Community maps.

---

### [DSM-00252] Toggle topographic and satellite layers

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00249`
- **High-Level Requirements**:
  Operators toggle between the available tile layers.
- **Scope Boundaries**:
  - **Included**: Layer control, tests.
  - **Excluded / Deferred**: Custom layers.

---

### [DSM-00253] Measure distance on the map

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00249`
- **High-Level Requirements**:
  Operators measure the distance in metres between points.
- **Scope Boundaries**:
  - **Included**: Ruler tool, tests.
  - **Excluded / Deferred**: Area measurement.

---

### [DSM-00254] Spike: source of player positions without mods

- **Priority**: `P2 (Medium)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00212`
- **High-Level Requirements**:
  Determine whether player positions are available without mods (ADM periodic player list, hit/kill lines), how often, and how accurate. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Research with real ADM samples, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00255] Plot last known player positions on the map

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00141`
- **Depends On**: `DSM-00249`, `DSM-00254`, `DSM-00212`
- **High-Level Requirements**:
  Player markers show the last known position with name and timestamp tooltip, visible to signed-in operators only.
- **Scope Boundaries**:
  - **Included**: Position extraction per spike, marker layer, tests.
  - **Excluded / Deferred**: Heading indicators; health.

---

### [DSM-00256] Spike: derive loot spawn points from mission files

- **Priority**: `P3 (Low)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00249`
- **High-Level Requirements**:
  Determine how to compute per-item spawn positions from `mapgrouppos.xml`, `mapgroupproto.xml` and `types.xml` usages / tiers, and the cost of doing so. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Prototype, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00257] Loot spawn-point density heatmap overlay

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00256`, `DSM-00249`
- **High-Level Requirements**:
  `/world/loot` overlays a density heatmap of loot spawn points on the world map.
- **Scope Boundaries**:
  - **Included**: Data endpoint, heatmap layer, tests.
  - **Excluded / Deferred**: Filters.

---

### [DSM-00258] Filter the loot heatmap by category

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00257`
- **High-Level Requirements**:
  Operators restrict the heatmap to item categories (weapons, food, medical, tools, clothing).
- **Scope Boundaries**:
  - **Included**: Filter, tests.
  - **Excluded / Deferred**: Item search.

---

### [DSM-00259] Show spawn clusters for one item classname

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00257`
- **High-Level Requirements**:
  Operators search a classname with autocomplete and see only that item's spawn points.
- **Scope Boundaries**:
  - **Included**: Search, layer, tests.
  - **Excluded / Deferred**: Multiple items at once.

---

### [DSM-00260] Overlay economy tier zones

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00256`, `DSM-00249`
- **High-Level Requirements**:
  Tier 1–4 zones and contaminated areas are drawn as polygons on the map.
- **Scope Boundaries**:
  - **Included**: Zone extraction, layer, tests.
  - **Excluded / Deferred**: Editing zones.

---

### [DSM-00261] Per-tier loot summary panel

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00142`
- **Depends On**: `DSM-00260`
- **High-Level Requirements**:
  A panel shows spawn-point counts per tier for the current filter.
- **Scope Boundaries**:
  - **Included**: Panel, tests.
  - **Excluded / Deferred**: Comparison with nominal values.

---

### [DSM-00262] Store Discord webhook settings with encrypted URLs (migration)

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration adds storage for webhook destinations (community, staff) with URLs encrypted at rest using the existing crypto helper. No behaviour change.
- **Scope Boundaries**:
  - **Included**: Migration and migration test.
  - **Excluded / Deferred**: API and UI (`DSM-00263`).

---

### [DSM-00263] Configure the staff webhook and send a test message

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00262`
- **High-Level Requirements**:
  `/settings/discord` lets operators save a staff webhook URL (masked after save) and send a test embed; results toast per the feedback contract.
- **Scope Boundaries**:
  - **Included**: API, card, test action, minimal embed formatter, tests.
  - **Excluded / Deferred**: Community channel (`DSM-00265`).

---

### [DSM-00264] Post server crash alerts to the staff webhook

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00263`, `DSM-00162`
- **High-Level Requirements**:
  When a server exits unexpectedly (`failed`), an embed with server name, time and exit code is posted to the staff webhook; delivery failures are logged and never block the lifecycle.
- **Scope Boundaries**:
  - **Included**: Event hook, embed, tests with a fake HTTP server.
  - **Excluded / Deferred**: Retries (`DSM-00267`).

---

### [DSM-00265] Post server online / offline to a community webhook

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00263`
- **High-Level Requirements**:
  Operators configure a community webhook; server online and offline transitions are posted to it.
- **Scope Boundaries**:
  - **Included**: Second destination, event hook, tests.
  - **Excluded / Deferred**: Player milestones.

---

### [DSM-00266] Choose which events each webhook receives

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00265`, `DSM-00264`
- **High-Level Requirements**:
  Each destination has per-event toggles; disabled events are not posted.
- **Scope Boundaries**:
  - **Included**: Toggles, persistence, tests.
  - **Excluded / Deferred**: Custom templates.

---

### [DSM-00267] Retry and rate-limit outbound webhook posts

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00263`
- **High-Level Requirements**:
  Outbound posts honour Discord `429 Retry-After`, retry transient failures with bounded backoff, and give up after N attempts with a log entry.
- **Scope Boundaries**:
  - **Included**: Retry queue, tests.
  - **Excluded / Deferred**: Durable queue across restarts.

---

### [DSM-00268] Post scheduled restart warnings to the community webhook

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00265`, `DSM-00242`
- **High-Level Requirements**:
  Scheduled restart countdown warnings are also posted to the community webhook.
- **Scope Boundaries**:
  - **Included**: Hook, tests.
  - **Excluded / Deferred**: Manual restart notices.

---

### [DSM-00269] Post backup results to the staff webhook

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00263`, `DSM-00214`
- **High-Level Requirements**:
  Backup completion and failure are posted to the staff webhook.
- **Scope Boundaries**:
  - **Included**: Hook, tests.
  - **Excluded / Deferred**: Restore notices.

---

### [DSM-00270] Post kick and ban events to the staff webhook

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00143`
- **Depends On**: `DSM-00263`, `DSM-00197`, `DSM-00198`
- **High-Level Requirements**:
  Kicks and bans done through DSM are posted to the staff webhook with operator, player and reason.
- **Scope Boundaries**:
  - **Included**: Hook, tests.
  - **Excluded / Deferred**: BattlEye-originated kicks.

---

### [DSM-00271] Build a self-contained Windows appliance

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `None`
- **High-Level Requirements**:
  A build produces `bin/`, `app/` and `manager-data/` with a bundled Node runtime, the server, the built SPA and native `better-sqlite3` for Windows x64; the `bin` launcher runs DSM in the foreground on a machine without Node installed.
- **Scope Boundaries**:
  - **Included**: Bundling script, launcher, smoke test on a clean environment.
  - **Excluded / Deferred**: Linux (`DSM-00272`); service (`DSM-00273`).

---

### [DSM-00272] Build a self-contained Linux appliance

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `DSM-00271`
- **High-Level Requirements**:
  The same appliance layout and launcher for Linux x64.
- **Scope Boundaries**:
  - **Included**: Bundling, launcher, smoke test.
  - **Excluded / Deferred**: Service (`DSM-00274`).

---

### [DSM-00273] Install and remove DSM as a Windows service

- **Priority**: `P0 (Critical)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `DSM-00271`
- **High-Level Requirements**:
  `aegis service install|uninstall` registers DSM via WinSW to start on boot; stopping the service stops only DSM, and running DayZ servers survive and are re-adopted.
- **Scope Boundaries**:
  - **Included**: WinSW wrapper, CLI commands, live verification that game servers survive.
  - **Excluded / Deferred**: Linux (`DSM-00274`).

---

### [DSM-00274] Install and remove DSM as a systemd service

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `DSM-00272`
- **High-Level Requirements**:
  `aegis service install|uninstall` generates a systemd unit with `KillMode=process` so game servers survive DSM restarts.
- **Scope Boundaries**:
  - **Included**: Unit generation, CLI commands, live verification.
  - **Excluded / Deferred**: Other init systems.

---

### [DSM-00275] Reset an operator password from the CLI

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `DSM-00271`
- **High-Level Requirements**:
  `aegis reset-password <username>` on the host sets a new password and revokes that user's sessions; it requires local shell access and is never exposed over HTTP.
- **Scope Boundaries**:
  - **Included**: CLI command, session revocation, tests.
  - **Excluded / Deferred**: Creating users from the CLI.

---

### [DSM-00276] Publish signed appliance archives to GitHub Releases

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00144`
- **Depends On**: `DSM-00271`, `DSM-00272`
- **High-Level Requirements**:
  Tagged releases build both appliances in CI and publish archives with SHA-256 checksums and signatures.
- **Scope Boundaries**:
  - **Included**: Release workflow, checksums, signing, tests of the workflow.
  - **Excluded / Deferred**: Updater (`DSM-00277`).

---

### [DSM-00277] Show whether a newer release is available

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00276`
- **High-Level Requirements**:
  `/settings/app` shows the current and latest version from GitHub Releases on demand, with a release-notes link; network errors show a red toast. Nothing is downloaded.
- **Scope Boundaries**:
  - **Included**: Check endpoint, card, tests.
  - **Excluded / Deferred**: Download (`DSM-00278`).

---

### [DSM-00278] Download and checksum-verify an update bundle

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00277`
- **High-Level Requirements**:
  Operators download the latest bundle for their platform; DSM verifies its SHA-256 checksum and discards it on mismatch.
- **Scope Boundaries**:
  - **Included**: Download as background task, checksum, tests.
  - **Excluded / Deferred**: Signature (`DSM-00279`); applying (`DSM-00281`).

---

### [DSM-00279] Verify the update bundle's signature

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00278`
- **High-Level Requirements**:
  A downloaded bundle is accepted only when its signature verifies against the public key shipped with DSM.
- **Scope Boundaries**:
  - **Included**: Signature verification, tests with good/bad signatures.
  - **Excluded / Deferred**: Key rotation.

---

### [DSM-00280] Back up the SQLite database before applying an update

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00278`
- **High-Level Requirements**:
  Before an update is applied, DSM takes an online SQLite backup and refuses to continue if it fails.
- **Scope Boundaries**:
  - **Included**: Online backup, tests.
  - **Excluded / Deferred**: Restore UI.

---

### [DSM-00281] Apply an update through a detached swap while game servers keep running

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00279`, `DSM-00280`, `DSM-00273`
- **High-Level Requirements**:
  A detached swap script stops DSM, replaces `app/`, and starts DSM again; running DayZ servers keep running and are re-adopted.
- **Scope Boundaries**:
  - **Included**: Swap scripts (Windows, Linux), live verification.
  - **Excluded / Deferred**: Rollback (`DSM-00284`).

---

### [DSM-00282] BlockingOverlay component in @aegis/ui

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `None`
- **High-Level Requirements**:
  A full-screen, non-dismissible overlay shows a title, status text and spinner, traps focus and announces status changes to screen readers.
- **Scope Boundaries**:
  - **Included**: Component, stories, tests.
  - **Excluded / Deferred**: Polling logic.

---

### [DSM-00283] Update-in-progress overlay that reconnects when DSM is back

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00281`, `DSM-00282`
- **High-Level Requirements**:
  During an update the browser shows the BlockingOverlay, polls `GET /health` with backoff and reloads when the new version answers.
- **Scope Boundaries**:
  - **Included**: Wiring, polling, tests.
  - **Excluded / Deferred**: Progress percentages.

---

### [DSM-00284] Roll back when the updated DSM fails its health check

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00145`
- **Depends On**: `DSM-00281`
- **High-Level Requirements**:
  If the new version does not pass its health check within a timeout, the swap script restores the previous `app/` and starts it.
- **Scope Boundaries**:
  - **Included**: Rollback path in swap scripts, live verification.
  - **Excluded / Deferred**: Rollback across breaking schema migrations.

---

### [DSM-00285] Install DayZ server files via SteamCMD into an empty directory

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00146`
- **Depends On**: `DSM-00334`, `DSM-00345`
- **High-Level Requirements**:
  Given an empty, writable target directory, DSM runs SteamCMD `app_update 223350 validate` as a background task with progress and reports success or a typed failure (login required, disk full, SteamCMD missing).
- **Scope Boundaries**:
  - **Included**: Install endpoint, background task, error codes, tests with a fake SteamCMD.
  - **Excluded / Deferred**: Config scaffolding (`DSM-00286`).

---

### [DSM-00286] Generate baseline serverDZ.cfg and BattlEye config for a fresh install

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00146`
- **Depends On**: `DSM-00285`
- **High-Level Requirements**:
  After a fresh install DSM writes a baseline `serverDZ.cfg` and BattlEye RCON config (with a generated RCON password) if they are missing, never overwriting existing files.
- **Scope Boundaries**:
  - **Included**: Templates, write-if-missing, tests.
  - **Excluded / Deferred**: Firewall rules.

---

### [DSM-00287] Create a server from a fresh install in the Create Server dialog

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00146`
- **Depends On**: `DSM-00286`
- **High-Level Requirements**:
  `CreateServerModal` gains an "Install new" path: choose a directory, run the install with progress, scaffold configs, and register the server; a failure leaves no half-registered server.
- **Scope Boundaries**:
  - **Included**: Wizard steps, progress, toasts, tests and live QA.
  - **Excluded / Deferred**: Updating an existing install.

---

### [DSM-00288] Refuse overlapping ports between registered servers

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00147`
- **Depends On**: `None`
- **High-Level Requirements**:
  Saving server settings whose game, query or RCON ports overlap another registered server on the same IP is refused with field errors naming the conflicting server.
- **Scope Boundaries**:
  - **Included**: Validation, field errors, tests.
  - **Excluded / Deferred**: Host-level checks (`DSM-00289`).

---

### [DSM-00289] Check ports are free on the host before start

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00147`
- **Depends On**: `DSM-00162`
- **High-Level Requirements**:
  Start fails with a dedicated error code naming the port when the game, query or RCON port is already bound by another process.
- **Scope Boundaries**:
  - **Included**: Bind probe, error code, tests.
  - **Excluded / Deferred**: Identifying the owning process.

---

### [DSM-00290] Spike: public reachability check for server ports

- **Priority**: `P3 (Low)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00147`
- **Depends On**: `None`
- **High-Level Requirements**:
  Evaluate ways to verify ports are reachable from the internet (third-party echo service, external A2S probe), including the privacy cost of sending the public IP to a third party, and decide whether to build it. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Research, ADR.
  - **Excluded / Deferred**: UPnP port forwarding.

---

### [DSM-00291] Connect a Discord bot and show its connection status

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00262`
- **High-Level Requirements**:
  Operators save a bot token (encrypted, masked) in `/settings/discord`; DSM connects to the Discord gateway and shows connected, disconnected or invalid token. Introduces the Discord client library (ADR).
- **Scope Boundaries**:
  - **Included**: Token storage, gateway client, status card, tests.
  - **Excluded / Deferred**: Commands.

---

### [DSM-00292] /status slash command

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00291`
- **High-Level Requirements**:
  `/status` replies with each server's lifecycle status and uptime.
- **Scope Boundaries**:
  - **Included**: Command registration, reply, tests.
  - **Excluded / Deferred**: Player list.

---

### [DSM-00293] Restrict bot commands to mapped Discord roles

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00291`
- **High-Level Requirements**:
  Operators map Discord role IDs to allowed commands; members without a mapped role are refused (ephemeral reply) and the attempt is logged. By default no role may run mutating commands.
- **Scope Boundaries**:
  - **Included**: Mapping UI, guard, tests.
  - **Excluded / Deferred**: Per-user mappings.

---

### [DSM-00294] /restart slash command

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00293`, `DSM-00168`
- **High-Level Requirements**:
  Authorised members restart a server from Discord and get the result.
- **Scope Boundaries**:
  - **Included**: Command, tests.
  - **Excluded / Deferred**: Scheduling.

---

### [DSM-00295] /players slash command

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00293`, `DSM-00194`
- **High-Level Requirements**:
  Authorised members list connected players.
- **Scope Boundaries**:
  - **Included**: Command, tests.
  - **Excluded / Deferred**: Paging.

---

### [DSM-00296] /say slash command

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00293`, `DSM-00165`
- **High-Level Requirements**:
  Authorised members broadcast an in-game message.
- **Scope Boundaries**:
  - **Included**: Command, tests.
  - **Excluded / Deferred**: Direct messages.

---

### [DSM-00297] /kick and /ban slash commands

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00148`
- **Depends On**: `DSM-00293`, `DSM-00197`, `DSM-00198`
- **High-Level Requirements**:
  Authorised members kick or ban a connected player with a reason.
- **Scope Boundaries**:
  - **Included**: Commands, tests.
  - **Excluded / Deferred**: Unban.

---

### [DSM-00298] Store announcement messages (migration)

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00149`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration adds storage for per-server announcement messages and interval. No behaviour change.
- **Scope Boundaries**:
  - **Included**: Migration and migration test.
  - **Excluded / Deferred**: API.

---

### [DSM-00299] Manage rotating announcement messages

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00149`
- **Depends On**: `DSM-00298`
- **High-Level Requirements**:
  Operators list, add, edit, delete and reorder a server's announcement messages and set the interval in minutes.
- **Scope Boundaries**:
  - **Included**: API, view, toasts, tests.
  - **Excluded / Deferred**: Broadcasting (`DSM-00300`).

---

### [DSM-00300] Broadcast announcements in rotation while the server runs

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00149`
- **Depends On**: `DSM-00299`, `DSM-00165`
- **High-Level Requirements**:
  Every interval the next message is sent via `#say -1` (multi-line messages as successive lines); broadcasting pauses while the server is stopped.
- **Scope Boundaries**:
  - **Included**: Rotation loop, tests with a fake clock.
  - **Excluded / Deferred**: Chat-triggered responses.

---

### [DSM-00301] Spike: Tebex webhook model and exposure of a public endpoint

- **Priority**: `P2 (Medium)`
- **Type**: `Spike`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `None`
- **High-Level Requirements**:
  Confirm Tebex webhook payloads and signature verification, and how a LAN-hosted DSM can receive internet webhooks safely (reverse proxy, allow-list) or should poll the Tebex API instead. Output: ADR.
- **Scope Boundaries**:
  - **Included**: Research, ADR.
  - **Excluded / Deferred**: Production code.

---

### [DSM-00302] Grant priority queue from a verified Tebex purchase

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `DSM-00301`, `DSM-00205`
- **High-Level Requirements**:
  A verified purchase adds the buyer's Steam64 to the server's priority queue list; unverified or duplicate events are rejected and logged.
- **Scope Boundaries**:
  - **Included**: Receiver per ADR, verification, idempotency, tests.
  - **Excluded / Deferred**: Revocation (`DSM-00303`).

---

### [DSM-00303] Revoke priority queue when a Tebex subscription ends

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `DSM-00302`
- **High-Level Requirements**:
  Expiry or chargeback removes the Steam64 that DSM granted, never manually added entries.
- **Scope Boundaries**:
  - **Included**: Revocation, tests.
  - **Excluded / Deferred**: Partial refunds.

---

### [DSM-00304] Grant whitelist from a Tebex purchase

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `DSM-00302`, `DSM-00204`
- **High-Level Requirements**:
  Configured packages add the buyer to the whitelist.
- **Scope Boundaries**:
  - **Included**: Package mapping, tests.
  - **Excluded / Deferred**: Item delivery.

---

### [DSM-00305] Purchase grant / revoke audit log

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `DSM-00302`
- **High-Level Requirements**:
  Every grant and revoke is recorded and viewable.
- **Scope Boundaries**:
  - **Included**: Audit storage, view, tests.
  - **Excluded / Deferred**: Exports.

---

### [DSM-00306] Generic signed payment webhook

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00150`
- **Depends On**: `DSM-00302`
- **High-Level Requirements**:
  Other storefronts can grant / revoke through a documented HMAC-signed webhook.
- **Scope Boundaries**:
  - **Included**: Endpoint, docs, tests.
  - **Excluded / Deferred**: Provider-specific adapters.

---

### [DSM-00311] Configure a BYOK AI provider and test the connection

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00152`
- **Depends On**: `None`
- **High-Level Requirements**:
  Operators pick a supported provider (one in this slice), enter an API key (encrypted, masked) and model, and test the connection. Keys are sent only to the chosen provider.
- **Scope Boundaries**:
  - **Included**: Settings card, encrypted storage, test call, tests.
  - **Excluded / Deferred**: More providers (`DSM-00313`).

---

### [DSM-00312] Explain an RPT crash with the likely faulting mod

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00152`
- **Depends On**: `DSM-00311`, `DSM-00206`
- **High-Level Requirements**:
  From the RPT viewer, operators send an error excerpt (IPs and GUIDs redacted) plus the loaded mod list to the provider, with explicit consent per request, and see the explanation and suggested steps.
- **Scope Boundaries**:
  - **Included**: Redaction, request, result panel, tests with a fake provider.
  - **Excluded / Deferred**: Automatic actions.

---

### [DSM-00313] Support additional AI providers including local Ollama

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00152`
- **Depends On**: `DSM-00311`
- **High-Level Requirements**:
  Further providers can be selected, including a local Ollama endpoint.
- **Scope Boundaries**:
  - **Included**: Adapters, tests.
  - **Excluded / Deferred**: Fine-tuning.

---

### [DSM-00314] Natural-language economy tuning as a reviewable types.xml diff

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00152`
- **Depends On**: `DSM-00311`, `DSM-00228`
- **High-Level Requirements**:
  Operators describe a balancing change in plain language and get a diff of `types.xml` to review; nothing is written until they accept and save.
- **Scope Boundaries**:
  - **Included**: Prompting, diff view, save via existing path, tests.
  - **Excluded / Deferred**: Unreviewed writes.

---

### [DSM-00315] Ask natural-language questions about ADM combat logs

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00152`
- **Depends On**: `DSM-00311`, `DSM-00212`
- **High-Level Requirements**:
  Operators ask questions about a time window of the ADM log and get answers citing the log lines used.
- **Scope Boundaries**:
  - **Included**: Excerpt selection, redaction, answer view, tests.
  - **Excluded / Deferred**: Automated moderation.

---

### [DSM-00322] Move shell, navigation and breadcrumb strings into the en-US dictionary

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `None`
- **High-Level Requirements**:
  All hard-coded strings in the shell, navigation, breadcrumbs and common buttons go through the i18n layer, with no visible change.
- **Scope Boundaries**:
  - **Included**: Refactor, existing tests green.
  - **Excluded / Deferred**: Forms (`DSM-00326`).

---

### [DSM-00323] Ukrainian translation for shell, navigation and common actions

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `DSM-00322`
- **High-Level Requirements**:
  A `uk-UA` dictionary covers every key extracted in the previous slice, with a test that no key is missing.
- **Scope Boundaries**:
  - **Included**: Dictionary, completeness test.
  - **Excluded / Deferred**: Language selector (`DSM-00325`).

---

### [DSM-00324] Persist the operator's interface language

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration adds a locale to the operator profile and the profile contract exposes an optional `locale` (backward compatible).
- **Scope Boundaries**:
  - **Included**: Migration, contract, tests.
  - **Excluded / Deferred**: UI.

---

### [DSM-00325] Choose interface language in Personal Settings

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `DSM-00323`, `DSM-00324`
- **High-Level Requirements**:
  A language selector in Personal Settings switches the interface live without reload, saves the choice, and applies it at sign-in.
- **Scope Boundaries**:
  - **Included**: Selector, live switch, persistence, toasts, tests.
  - **Excluded / Deferred**: Auto-detecting browser language.

---

### [DSM-00326] Move form labels and feedback messages into the dictionary

- **Priority**: `P3 (Low)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `DSM-00322`
- **High-Level Requirements**:
  Form labels, validation and toast messages go through the i18n layer, with no visible change.
- **Scope Boundaries**:
  - **Included**: Refactor, tests.
  - **Excluded / Deferred**: New languages.

---

### [DSM-00327] German and French translations

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00111`
- **Depends On**: `DSM-00325`, `DSM-00326`
- **High-Level Requirements**:
  `de-DE` and `fr-FR` dictionaries with completeness tests, selectable in Personal Settings.
- **Scope Boundaries**:
  - **Included**: Dictionaries, tests.
  - **Excluded / Deferred**: Log or economy translations.

---

### [DSM-00328] List host directories for the picker (admin only)

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00127`
- **Depends On**: `None`
- **High-Level Requirements**:
  `GET /api/v1/system/fs?path=` returns drives / roots without a path, otherwise subdirectories with an accessible flag; `EACCES` / `EPERM` mark entries locked instead of failing; sensitive roots (`C:\Windows`, `/proc`, `/sys`) are denied; paths are normalised; admin role required.
- **Scope Boundaries**:
  - **Included**: Endpoint, contract, deny-list, tests.
  - **Excluded / Deferred**: File contents.

---

### [DSM-00329] BrowseInput component in @aegis/ui

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `CANCELLED`
- **Parent**: `DSM-00127`
- **Depends On**: `None`
- **High-Level Requirements**:
  An input with a trailing folder button that raises `onBrowse`, with accessible labelling.
- **Scope Boundaries**:
  - **Included**: Component, stories, tests.
  - **Excluded / Deferred**: The picker dialog.
- **Implementation Notes**: Merged into `DSM-00331` (2026-11-18): on its own the input only raises `onBrowse`, so there is nothing an admin can see or verify. The finished component (`BrowseInput.tsx`, tests, stories, barrel exports) is kept in `git stash` "DSM-00329 BrowseInput (folded into DSM-00331)"; restore it with `git stash apply` when starting `DSM-00331`. Note: the sdlc gate needed `(^|/)index.ts$` and `.types.ts$` in `.agents/checks.json` coverage excludes (added).

---

### [DSM-00330] DirectoryList component in @aegis/ui

- **Priority**: `P2 (Medium)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00127`
- **Depends On**: `None`
- **High-Level Requirements**:
  A keyboard-navigable folder list with breadcrumb path shows entries, a locked state for inaccessible ones, and emits navigate / select events; it knows nothing about the API.
- **Scope Boundaries**:
  - **Included**: Component, stories, tests.
  - **Excluded / Deferred**: Data fetching.

---

### [DSM-00331] Host directory picker dialog

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00127`
- **Depends On**: `DSM-00328`, `DSM-00330`
- **High-Level Requirements**:
  A dialog with a drive selector and DirectoryList returns the selected host path to the input.
- **Scope Boundaries**:
  - **Included**: `BrowseInput` in `@aegis/ui` (input with a trailing folder button raising `onBrowse`, accessible labelling; component, stories, tests — absorbed from `DSM-00329`, code in `git stash`); dialog wiring to the API; tests.
  - **Excluded / Deferred**: Folder creation.

---

### [DSM-00332] Browse for Steam settings paths

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00127`
- **Depends On**: `DSM-00331`
- **High-Level Requirements**:
  SteamCMD, Workshop and cache path fields in `SteamSettingsView` use `BrowseInput` with the picker.
- **Scope Boundaries**:
  - **Included**: Integration, tests.
  - **Excluded / Deferred**: Server settings (`DSM-00333`).

---

### [DSM-00333] Browse for server settings paths

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00127`
- **Depends On**: `DSM-00331`
- **High-Level Requirements**:
  Install, profile and mission path fields in `ServerSettingsView` use `BrowseInput` with the picker.
- **Scope Boundaries**:
  - **Included**: Integration, tests.
  - **Excluded / Deferred**: Other forms.

---

### [DSM-00334] Background task registry with progress events

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `None`
- **High-Level Requirements**:
  Long operations run as background tasks with id, kind, server, state (queued, running, succeeded, failed, cancelled) and progress, listed by `GET /api/v1/tasks` and broadcast as `task.progress` SSE events; at most one SteamCMD task runs per host. Tasks live in memory only.
- **Scope Boundaries**:
  - **Included**: Registry, endpoint, event contract, tests.
  - **Excluded / Deferred**: Persistence across restarts; UI (`DSM-00339`).

---

### [DSM-00335] Download one Workshop mod via SteamCMD

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `DSM-00334`, `DSM-00345`
- **High-Level Requirements**:
  Operators download or update a catalogued mod; DSM runs `+workshop_download_item` as a background task and reports success or a typed failure.
- **Scope Boundaries**:
  - **Included**: Endpoint, runner, error codes, tests with a fake SteamCMD.
  - **Excluded / Deferred**: Progress UI (`DSM-00336`).

---

### [DSM-00336] Show mod download progress in the mods list

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `DSM-00335`, `DSM-00173`
- **High-Level Requirements**:
  Rows in `/mods` show live download progress and the final result.
- **Scope Boundaries**:
  - **Included**: Row progress, toasts, tests.
  - **Excluded / Deferred**: Global indicator (`DSM-00339`).

---

### [DSM-00337] Copy a mod's .bikey into the server keys folder on enable

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `DSM-00119`
- **High-Level Requirements**:
  Enabling a downloaded mod copies its `.bikey` files into the server's `keys/` folder and records which keys DSM added.
- **Scope Boundaries**:
  - **Included**: Key copy, tracking, tests.
  - **Excluded / Deferred**: Removal (`DSM-00338`).

---

### [DSM-00338] Remove a mod's key when it is disabled or removed

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `DSM-00337`
- **High-Level Requirements**:
  Disabling or removing a mod deletes only the keys DSM added for it, and only when no other enabled mod needs them.
- **Scope Boundaries**:
  - **Included**: Removal with guards, tests.
  - **Excluded / Deferred**: Keys added manually.

---

### [DSM-00339] Running-tasks indicator in the header

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00133`
- **Depends On**: `DSM-00334`, `DSM-00173`
- **High-Level Requirements**:
  The header shows running background tasks with progress.
- **Scope Boundaries**:
  - **Included**: Indicator, tests.
  - **Excluded / Deferred**: Task history.

---

### [DSM-00340] Allow the SteamCMD path to be 'not configured'

- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `None`
- **High-Level Requirements**:
  A migration and `steamSettingsSchema` make `steamCmdPath` nullable and remove the fabricated first-boot default in `apps/server/src/routes/steam.ts`; existing configured paths are unchanged.
- **Scope Boundaries**:
  - **Included**: Migration, contract change (backward compatible), tests.
  - **Excluded / Deferred**: UI (`DSM-00341`).

---

### [DSM-00341] Show 'Not configured' and live path status in Steam settings

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00340`
- **High-Level Requirements**:
  `SteamSettingsView` shows a "Not configured" badge instead of a placeholder path, and next to a configured path shows Found · version, Not found or Not executable (reusing Run Diagnostics data).
- **Scope Boundaries**:
  - **Included**: Badge, inline status, tests.
  - **Excluded / Deferred**: Detection (`DSM-00342`).

---

### [DSM-00342] Auto-detect SteamCMD installations

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00340`
- **High-Level Requirements**:
  A Detect action calls `POST /api/v1/settings/steam/detect`, which probes `PATH`, `C:\steamcmd`, Steam libraries listed in `libraryfolders.vdf` and `/usr/games/steamcmd`, and returns ranked candidates for the admin to pick.
- **Scope Boundaries**:
  - **Included**: Probe, endpoint, picker, tests.
  - **Excluded / Deferred**: Installing (`DSM-00343`).

---

### [DSM-00343] Install SteamCMD for me

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00340`
- **High-Level Requirements**:
  With explicit consent, DSM downloads Valve's official SteamCMD archive into `manager-data/steamcmd/`, extracts it atomically, verifies it, and saves the path, with toasts per the feedback contract.
- **Scope Boundaries**:
  - **Included**: Download, atomic extract, verification, tests.
  - **Excluded / Deferred**: Automatic self-update scheduling.

---

### [DSM-00344] Check SteamCMD at startup and expose dependency health

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00340`
- **High-Level Requirements**:
  At startup and after save / detect / install, DSM checks the SteamCMD path exists and is executable (no `steamcmd +quit`) and exposes the result to the client.
- **Scope Boundaries**:
  - **Included**: Health record, endpoint, tests.
  - **Excluded / Deferred**: UI gating (`DSM-00346`).

---

### [DSM-00345] Preflight SteamCMD check before every SteamCMD operation

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00340`
- **High-Level Requirements**:
  Every SteamCMD operation first verifies the path and fails with `INVALID_STEAMCMD_PATH` when it is missing.
- **Scope Boundaries**:
  - **Included**: Shared preflight, tests.
  - **Excluded / Deferred**: Retrying.

---

### [DSM-00346] Disable SteamCMD features with an explanation

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00344`
- **High-Level Requirements**:
  Workshop sync and server install / update controls stay focusable but `aria-disabled`, with a "SteamCMD is not configured" tooltip linking to Steam settings.
- **Scope Boundaries**:
  - **Included**: Gating, tests.
  - **Excluded / Deferred**: Blocking sign-in or startup.

---

### [DSM-00347] Startup health notification and dashboard banner

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `BACKLOG`
- **Parent**: `DSM-00159`
- **Depends On**: `DSM-00344`, `DSM-00184`
- **High-Level Requirements**:
  A failed startup check adds one notification-centre entry and a dismissible dashboard banner; background reads never toast.
- **Scope Boundaries**:
  - **Included**: Notification, banner, tests.
  - **Excluded / Deferred**: Repeated alerts.

---

### [DSM-00348] Keep access tokens out of SSE URLs and request logs

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Parent**: `DSM-00115`
- **Depends On**: `DSM-00173`
- **High-Level Requirements**:
  EventSource cannot send an `Authorization` header, so the web app passes the access token as `?token=` on `GET /api/v1/realtime/sse`. Fastify's request logging records the full URL, so every SSE connection writes the operator's JWT in clear text to DSM's request log (verified in `DSM-00173` QA); URLs can also persist in proxy and browser history. Replace the token in the URL with a short-lived, single-use SSE ticket, and make sure no credential appears in request logs.
- **Scope Boundaries**:
  - **Included**: `POST /api/v1/realtime/ticket` (authenticated) returning a single-use ticket valid for seconds; `/realtime/sse?ticket=` accepting it once; the web realtime connection (`DSM-00173`) and the Steam challenge hook requesting a ticket per (re)connect; request-log serializer redacting `token` / `ticket` query values; removing `?token=` support from `fastify.authenticate`; tests including a log assertion.
  - **Excluded / Deferred**: Moving to cookie-based authentication.
- **Implementation Notes**: Raised during `DSM-00173` QA (2026-11-17).

---

### [DSM-00349] Confirmation dialogs open with focus on Cancel, not the close button

- **Priority**: `P2 (Medium)`
- **Type**: `Bug`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00105`
- **High-Level Requirements**:
  `Confirmation` (and `KeywordConfirmation`) mark the Cancel button `autoFocus`, but the dialog calls `showModal()` in an effect after React has applied `autoFocus`, and the browser's dialog focusing steps then move focus to the first focusable element: the **Close (X)** button. Every confirmation in the app therefore opens with focus on X instead of the safe Cancel action. Not dangerous (never the destructive button), but not the intended default, and keyboard users need an extra Tab to reach Cancel.
- **Scope Boundaries**:
  - **Included**: Initial focus on Cancel after `showModal()` (e.g. native `autofocus` attribute or focusing it after opening) in `libs/ui` `Confirmation` / `KeywordConfirmation`; a test that asserts the focused element after open; check existing consumers (sessions, mods, server config, unsaved changes, force-stop).
  - **Excluded / Deferred**: Redesigning dialog layout.
- **Implementation Notes**: Found in `DSM-00170` browser QA (2026-11-17): focused element after opening the force-stop dialog was "Close dialog".

---

### [DSM-00350] Show how a stopped server last ended on the Maintenance page

- **Priority**: `P3 (Low)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00164`
- **High-Level Requirements**:
  The lifecycle status line only shows the last exit reason for a `failed` server (`getServerExitPresentation`, `DSM-00164`). After a force-stop or an RCON stop the server is `stopped` with `lastExit` (`force_stopped`, `stopped`, `exited_while_offline`, `shutdown_timeout`), but the page just says "No server process is running.", so the operator cannot see how or when the last run ended. Show it as secondary information for stopped servers too (e.g. "Force-stopped at …"), keeping the sidebar selector's failed-only emphasis.
- **Scope Boundaries**:
  - **Included**: Maintenance status line for `stopped` + `lastExit`; tests.
  - **Excluded / Deferred**: Run history / exit log (multiple past runs); sidebar selector changes.
- **Implementation Notes**: Noted in `DSM-00170` QA (2026-11-17).

---

### [DSM-00351] Import the shared Vitest config with a file extension

- **Priority**: `P3 (Low)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `None`
- **High-Level Requirements**:
  All nine project `vitest.config.ts` files import `../../vitest.shared` without an extension. Every Vitest run prints: _"Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite: import \"../../vitest.shared\" without a file extension"_. Once the native loader is the default, the configs stop loading and every test target fails.
- **Scope Boundaries**:
  - **Included**: Import `../../vitest.shared.ts` with its extension in `apps/server`, `apps/web`, `libs/api-client`, `libs/api-contracts`, `libs/database`, `libs/dayz-config`, `libs/platform`, `libs/rcon`, `libs/ui`; the TypeScript setting this needs (`allowImportingTsExtensions` with `noEmit`, or `rewriteRelativeImportExtensions`) in the tsconfig that type-checks the configs; confirm the warning is gone and all test, typecheck and lint targets pass.
  - **Excluded / Deferred**: Switching to `configLoader: 'native'` now.
- **Implementation Notes**: Seen since the shared Vitest config refactor; noted in `DSM-00169` / `DSM-00170` QA (2026-11-17).

---

### [DSM-00352] Keep a stopping server stopping when it is re-adopted after a DSM restart

- **Priority**: `P3 (Low)`
- **Type**: `Bug`
- **Status**: `BACKLOG`
- **Depends On**: `DSM-00168`
- **High-Level Requirements**:
  `reconcile` (`DSM-00162`) re-adopts every live tracked process as `running`, including one that was `stopping` (RCON `#shutdown` already sent, DayZ saving). When that process then exits, the exit is recorded as a crash (`failed` / `crashed`) instead of a graceful stop, and a requested restart (`restart_requested`, `DSM-00168`) is dropped, so the server stays down. The stop watchdog is also not re-armed, so a DayZ that never finishes shutting down is not force-killed. Happens only if DSM restarts during the shutdown window (up to `DSM_SERVER_STOP_TIMEOUT_MS`, 60 s by default).
- **Scope Boundaries**:
  - **Included**: Re-adopt a live `stopping` process as `stopping`; re-arm the stop watchdog for the remaining time (or the full timeout when unknown); its exit is recorded as `stopped` (or `shutdown_timeout` after the watchdog) and a requested restart starts the server; tests in the lifecycle restart / reconcile specs.
  - **Excluded / Deferred**: Persisting the exact watchdog deadline.
- **Implementation Notes**: Known limitation recorded in the `DSM-00168` requirements and QA report (2026-11-17).

---

### [DSM-00353] FileUploader UI Kit Component with Drop Zone and Drag-and-Drop

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00105`
- **High-Level Requirements**:
  Provide an accessible, theme-styled `FileUploader` component in `libs/ui` featuring a visual drop zone, drag-and-drop active state, fallback file-picker click trigger, MIME/extension filtering (`accept`), size bounds (`maxSizeBytes`), and selected file display with removal control.
- **Scope Boundaries**:
  - **Included**: `libs/ui/src/file-uploader/FileUploader.tsx`, styles/variants, clear/remove action, keyboard trigger, invalid file/size error callbacks, Storybook story, and Vitest suite.
  - **Excluded / Deferred**: Multi-file chunked upload engine (backend multipart handlers); image cropping / preview canvas.
- **Implementation Notes**: Needed for mod preset importing (`DSM-00355`) and future server backups/logs upload.

---

### [DSM-00354] Mod Preset Contracts, Batched Hydration, and Atomic Server Import API

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00119`
- **High-Level Requirements**:
  Define Zod contracts for the standard community mod preset format (`steamWsMods` and `steamWsServerMods`). Implement `POST /api/v1/servers/:id/mods/import` on Fastify to batch-hydrate metadata via Steam Workshop API (with graceful fallback to preset name on failure) and execute atomic SQLite persistence for both `merge` (append with preserved ordering) and `replace` (Workshop mods follow the preset; mods already installed are updated in place and keep their folder, enabled flag and sync state; local mods keep their load-order slot) modes. The server lock is re-checked inside the transaction after the Steam lookup. Also exposes `GET /api/v1/servers/:id/mods/export-preset`, the single source of truth for preset export.
- **Scope Boundaries**:
  - **Included**: `libs/api-contracts` schemas and DTOs; `libs/api-client` endpoints; Fastify route, controller, and service layer with transaction safety; tests in `apps/server`.
  - **Excluded / Deferred**: Client UI modal; mod downloading / SteamCMD syncing.
- **Implementation Notes**: Follows `libs/api-contracts/src/lib/mod.contract.ts` patterns; leverages existing `SteamWorkshopService.getPublishedFileDetailsBatched`.

---

### [DSM-00355] Import Mods Modal with Dual-Input, Strategy Selector, and Diff Preview

- **Priority**: `P1 (High)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00353`, `DSM-00354`
- **High-Level Requirements**:
  Add an `ImportModsModal` in `apps/web` featuring dual input (drag-and-drop `.json` file via `FileUploader` or paste raw JSON), client-side pre-validation, a client-side diff preview with status badges (`New`, `Already Installed`, `Will be removed`) that de-duplicates Workshop IDs like the server, a strategy selector (`Merge with existing` vs. `Replace all`), a confirmation before a replace that removes mods, and form discard protection.
- **Scope Boundaries**:
  - **Included**: `apps/web/src/features/mods/components/ImportModsModal.tsx`, integration in `ModsView.tsx`, TanStack Query invalidation, explicit user feedback toasts (`notifySuccess` / `notifyApiError`), and RTL tests.
  - **Excluded / Deferred**: Direct export action (`DSM-00356`).
- **Implementation Notes**: Complies with form conventions (`DSM-00137`) and discard guard (`DSM-00138`).

---

### [DSM-00356] Export Mod Preset Action in Mods Management Console

- **Priority**: `P2 (Medium)`
- **Type**: `Story`
- **Status**: `DONE`
- **Depends On**: `DSM-00354`
- **High-Level Requirements**:
  Add an `Export Preset` action to the `Mods Management` header in `apps/web` allowing operators to download the active server's workshop mods as a community-compatible JSON file (`mods-preset-<server-name>-<YYYY-MM-DD-HH-mm-ss>.json`), strictly omitting local mods, with an option to include or exclude disabled mods.
- **Scope Boundaries**:
  - **Included**: Export button/menu option in `ModsView.tsx`, `ExportPresetModal` preview, preset fetched from `GET /api/v1/servers/:id/mods/export-preset` (`DSM-00354`), file download trigger, notifications, and tests.
  - **Excluded / Deferred**: Server-side export archive bundling or cloud upload.
- **Implementation Notes**: The server endpoint is the single source of truth for the exported preset; the modal preview is computed from the cached mod list, but the downloaded file is exactly what the server returns.

### [DSM-00357] Measure `.ts` Files in Web App Coverage

- **Resolution (2026-11-18)**: **Not a defect — closed without a change.** Vite's `mergeConfig` concatenates arrays, so the web `include: ['src/**/*.tsx']` is added to the shared `['src/**/*.ts']`; `coverage/apps/web/lcov.info` already lists 51 `.ts` and 61 `.tsx` files (96.8% lines). The premise below came from reading the config without the merge semantics, after a local run with an overridden reporter had wiped the web lcov. Found by the sdlc small-change lane, which checked the premise before editing.
- **Priority**: `P1 (High)`
- **Type**: `Task`
- **Status**: `DONE`
- **Depends On**: `None`
- **High-Level Requirements**:
  `apps/web/vitest.config.ts` sets coverage `include: ['src/**/*.tsx']`, which replaces the shared `src/**/*.ts` and leaves every `.ts` file in `apps/web/src` unmeasured (hooks, `*.utils.ts`, `*.queries.ts`, `core/forms`, `core/notifications`, `core/realtime`, …). Their tests run, but coverage never counts them, so the reported web coverage overstates what is measured, and the sdlc checks gate fails any change to a web `.ts` file with "no coverage data".
- **Acceptance Criteria**:
  - **AC-1**: web coverage includes `src/**/*.ts` and `src/**/*.tsx`, keeping the existing excludes (`*.types.ts`, `*.schema.ts`, `main.tsx`, `router.tsx`, `styles/**`, tests, `*.d.ts`, barrels).
  - **AC-2**: `pnpm test:web:coverage` writes `coverage/apps/web/lcov.info` and it lists the measured `.ts` files.
  - **AC-3**: overall web coverage stays ≥ 80%, and the sdlc checks gate passes on `master`.
  - **AC-4**: the "Known gap" note in `.claude/CLAUDE.md` §2 is removed.
- **Scope Boundaries**:
  - **Included**: the web coverage `include` setting, a fresh coverage run, the `.claude/CLAUDE.md` note.
  - **Excluded / Deferred**: closing the three partial `.ts` gaps below (not required by the thresholds; a follow-up if wanted).
- **Implementation Notes**: Measured 2026-11-18 with both globs (870 tests, 87 files, all passing): web lines **96.82%** (statements 96.12%, branches 92.37%); the 51 measured `.ts` files alone are at **98.3%** lines. Only three are below 100%: `features/server-settings/components/server-config/useConfigEditSession.ts` (92.4%, 14 lines, branches 75.4%), `features/steam/hooks/useSteamAuthChallenge.ts` (92%, 4 lines, branches 71.4%) and `core/forms/unsaved-changes.ts` (97.6%, 1 line). The fix is the one-line `include` change; it fits the sdlc small-change lane. Don't override the coverage reporter when measuring locally (e.g. `--coverage.reporter=text`): Vitest cleans `coverage/apps/web` first and then writes no `lcov.info`.

---
