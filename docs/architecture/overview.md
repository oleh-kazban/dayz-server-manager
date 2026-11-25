# Architecture Overview

|                |                                                                   |
| :------------- | :---------------------------------------------------------------- |
| **Status**     | Implemented, except where a section says _Planned_                |
| **Verified**   | Against commit `4e20e13`                                          |
| **Audience**   | Maintainers and AI agents                                         |
| **Next steps** | See [Decisions and open questions](#decisions-and-open-questions) |

## 1. What Aegis is

Aegis is a self-hosted web console for administering DayZ Dedicated Servers on Windows x64 and Linux x64. It supervises the server process, edits its configuration, and manages Steam Workshop mods. The product purpose is the **DayZ Server Manager (DSM)**. `Aegis` is the product name, and `@aegis/*` is the package scope.

Aegis runs on the same host as the game server. It has no cloud component. Game files stay on disk in their native layout.

### Pillars

Every design decision is checked against four pillars:

1. **Security** – least privilege, secrets encrypted at rest, no credentials in URLs or logs.
2. **Consistency** – one way to do each thing: naming, contracts, forms, feedback, UI components.
3. **Comfort** – operators get explicit feedback for every action and are protected from destructive mistakes.
4. **Modern UI/UX** – a fast, accessible, themeable console with smooth animation and thoughtful features, not only a responsive layout.

## 2. Stack

| Layer       | Technology                                                                                   |
| :---------- | :------------------------------------------------------------------------------------------- |
| Monorepo    | Nx 24, pnpm 12 workspaces                                                                    |
| Language    | TypeScript 5.9 (`strict`)                                                                    |
| Web         | React 19, Vite 8, TanStack Router and Query, Tailwind CSS 4, Zustand (small local stores)    |
| Server      | Node.js, Fastify 5, Server-Sent Events (SSE)                                                 |
| Contracts   | Zod 4 schemas shared by client and server                                                    |
| Persistence | SQLite through `better-sqlite3` and Drizzle ORM                                              |
| UI kit      | `@aegis/ui`, documented in Storybook 10                                                      |
| Quality     | Vitest 5, ESLint 10 (flat config), Prettier, Madge (cycles), Husky + lint-staged, SonarCloud |

The stack is fixed. Exact versions live in `package.json` and are pinned (no `^` or `~`).

## 3. Repository layout

```text
apps/
  web/            React SPA (the console)
  server/         Fastify daemon: REST /api/v1 + SSE
libs/
  api-contracts/  Zod request/response schemas (pure TypeScript + Zod)
  api-client/     Typed HTTP client, one endpoint module per API area
  ui/             @aegis/ui component kit and themes
  database/       SQLite schema, migrations, crypto (password hashing, vault)
  dayz-config/    serverDZ.cfg tokenizer, parser, rules, launch-command compiler
  platform/       OS process managers (Windows, POSIX)
  rcon/           BattlEye RCON client over UDP, packet codec
```

### Dependency rules

Nx tags enforce the rules through `@nx/enforce-module-boundaries` (`eslint.config.js`).

| Project                       | Tags                             | May depend on                                                                                |
| :---------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------- |
| `apps/web`                    | `scope:client`                   | `client`, `contracts`, `shared`                                                              |
| `apps/server`                 | `scope:server`                   | `server`, `contracts`, `shared`, `platform`, `database`                                      |
| `libs/api-client`             | `scope:client`                   | `client`, `contracts`, `shared`                                                              |
| `libs/api-contracts`          | `scope:contracts`                | `contracts` only                                                                             |
| `libs/database`               | `scope:database`, `scope:server` | `database`, `contracts`, `shared`; the `server` tag also allows `server` and `platform` libs |
| `libs/ui`, `libs/dayz-config` | `scope:shared`                   | `shared`, `contracts`                                                                        |
| `libs/platform`               | `scope:platform`                 | not constrained by a rule                                                                    |
| `libs/rcon`                   | `scope:server`                   | the `server` rule applies (it may also use `platform` and `database`)                        |

Beyond the tags:

- `apps/web`, `libs/ui` and `libs/api-client` never import `better-sqlite3`, `fastify`, `node:child_process` or `node:fs`.
- `libs/api-contracts` stays pure TypeScript and Zod.
- Circular imports are rejected (`pnpm check:cycles`).

## 4. Runtime view

```text
 Browser (SPA)
   │  REST  /api/v1/*   (Bearer access token)
   │  SSE   /api/v1/realtime/sse   (one-time ticket)
   ▼
 Fastify daemon (apps/server)
   ├── routes ──► services ──► SQLite (manager-data/database/manager.sqlite)
   ├── ServerLifecycleService ──► @aegis/platform ProcessManager ──► DayZ server process
   │                          └─► @aegis/rcon (BattlEye #shutdown)
   ├── SteamRunnerService ──► SteamCMD child process
   └── config services ──► serverDZ.cfg and BattlEye config files on disk
```

In development the web app (`:4200`) proxies `/api` to the daemon (`:5000`). In production, one Fastify process serves the built SPA and the API on a single port, same origin. This is decided but not implemented yet: `apps/server` has no static-file plugin today.

### Contract-first API

A change to an endpoint starts in `libs/api-contracts` (Zod schema), continues in `libs/api-client` (typed call), and ends in the Fastify route. Server routes live in `apps/server/src/routes/`, one file per API area:

| Area                                                   | Prefix under `/api/v1` |
| :----------------------------------------------------- | :--------------------- |
| Health                                                 | `/health` (no prefix)  |
| Auth, profile, sessions                                | `/auth`, `/profile`    |
| Servers, mods, config, launch command, lifecycle, logs | `/servers`             |
| Realtime (SSE)                                         | `/realtime`            |
| Steam settings                                         | `/settings/steam`      |
| Workshop                                               | `/workshop`            |

Errors use one envelope built by `sendApiError` (`apps/server/src/utils/api-error.ts`). It carries an `errorCode`, a message, and optional `fieldErrors`. The web app translates codes through `apps/web/src/core/i18n`.

### Authentication and sessions

- Three roles exist: `root`, `admin` and `setup` (see [vision](../product/vision-and-scope.md#4-users)). `USER_ROLE_VALUES` in `libs/api-contracts` is the single source. Admin-guarded routes share one `requireAdmin`; there are no duplicated helpers.
- Sign-in issues a 15-minute **access token** and a **refresh token** (7 days, or 30 days with "remember me"). Both are JWTs signed with `SESSION_SECRET`.
- Every access token carries a session id (`sid`). `authenticate` rejects tokens whose session row is missing or expired.
- Passwords are hashed with scrypt (`libs/database/src/lib/crypto.ts`).
- Tokens travel only in the `Authorization` header. The browser cannot set that header on an `EventSource`, so SSE uses a short-lived **ticket** (`SseTicketStore`). Request logging redacts credentials in URLs (`log-redaction.ts`).
- Sign-in routes are rate limited.

### Secrets

Steam credentials and server RCON passwords are encrypted with AES-256-GCM before they reach SQLite. The key comes from `STEAM_VAULT_KEY` or `DSM_VAULT_KEY`; otherwise a random key is created once in `manager-data/.vault.key` (mode `0600`). The vault key is independent of `SESSION_SECRET`.

### Server process supervision

`ServerLifecycleService` (`apps/server/src/services/server/server-lifecycle.service.ts`) owns the server state machine: `stopped`, `starting`, `running`, `stopping` and `failed`, with the last exit reason stored beside it (`start_failed`, `crashed`, `exited_while_offline`, `force_stopped`, `stopped`, `shutdown_timeout`).

- **Spawn:** argument arrays only, never a shell string. `@aegis/dayz-config` compiles the launch command from the stored server settings and mods.
- **Stop:** sends BattlEye RCON `#shutdown` first, so DayZ flushes persistence. If the process is still alive after `DSM_SERVER_STOP_TIMEOUT_MS` (default 60 s), the watchdog force-kills it.
- **Restart:** a stop with a restart request starts the server again once the process exits.
- **DSM restarts:** DayZ keeps running when Aegis restarts. On boot, `reconcile()` re-adopts surviving processes and marks vanished ones as failed.
- **Observation:** a poll (`DSM_SERVER_POLL_INTERVAL_MS`, default 5 s) detects exits of re-adopted processes. State changes are broadcast over SSE.

`@aegis/platform` hides the OS differences behind `ProcessManager` (`windows-process-manager.ts`, `posix-process-manager.ts`).

### Configuration files

The `serverDZ.cfg` file on disk is the source of truth. The database keeps only a read-only projection of a few keys. Editing follows these rules:

- Allowed only while the server is stopped.
- The editor opens read-only. Clicking **Edit** acquires a database lock with a TTL and heartbeat (`config_edit_locks`).
- Writes are atomic: temp file, then rename, with a backup first.
- Every committed write stores a revision (`server_config_revisions`).
- The BattlEye RCON config is generated by Aegis, not edited by operators.

### Real-time updates

`SseHub` fans events out to connected clients. The signed-in shell opens one connection (`RealtimeProvider`) and updates TanStack Query caches from typed events, for example server status changes and failed stops or restarts. The Steam settings page opens a second connection for the Steam login events.

## 5. Persistence

SQLite, one file: `manager-data/database/manager.sqlite` (override with `DATABASE_PATH`). Migrations are versioned and recorded in `_dsm_migrations` (`libs/database/src/lib/migrations.ts`). Details are in [persistence](persistence.md).

| Table                     | Purpose                                   |
| :------------------------ | :---------------------------------------- |
| `users`                   | Operator accounts                         |
| `sessions`                | Active sessions, expiry, last activity    |
| `servers`                 | Managed DayZ servers, paths, ports, state |
| `steam_settings`          | SteamCMD paths and encrypted credentials  |
| `server_mods`             | Mods per server, load order               |
| `config_edit_locks`       | Edit leases for `serverDZ.cfg`            |
| `server_config_revisions` | History of committed config writes        |

`manager-data/` is runtime state. It is gitignored and never part of an update.

## 6. Web application

- Feature slices in `apps/web/src/features/` (auth, dashboard, faq, flavor-text, maintenance, mods, profile, server-settings, steam, theme). Shared infrastructure sits in `apps/web/src/core/` (forms, i18n, notifications, query, realtime, storage, layout, navigation).
- Routing is code-based with TanStack Router (`router.tsx`). Many routes still render `PlaceholderView` (players, economy, world, audit, system, most of settings). The [feature map](../product/feature-map.md) lists what is real.
- Server state lives in TanStack Query. Zustand holds three local UI stores (layout, notifications, FAQ).
- Forms use `useEditableForm`. Mutations give operators explicit feedback, as defined in `CLAUDE.md` (user feedback contract).
- The `@aegis/ui` kit provides the controls and 12 theme palettes (`data-theme`), built on Tailwind 4 tokens.

## Decisions and open questions

### Decided

- **Production serving.** One process: Fastify serves the built SPA (with a fallback to `index.html`) and `/api/v1` on one port, same origin. HTTPS is added by an optional reverse proxy in front, which must not buffer SSE. Not implemented yet; the work belongs to the appliance epic (`DSM-00144`).
- **Authorization.** Three roles: `root` (the installer, exactly one), `admin` and `setup`. A valid access token of a `root` or `admin` user is the check for every endpoint, except an explicit allowlist (initially `GET /api/v1/auth/me`). Only operator-management endpoints additionally require `root`, through one central `requireRoot` check. The duplicated role helpers are replaced by one `requireAdmin`. The `users.role` column needs no migration for the type change; the `root` row arrives with a later slice. See [tech debt](../tech-debt.md).
- **First run.** An empty database opens a setup screen that creates the root account, protected by a one-time token printed to the server log. The `admin`/`admin` seed and `DSM_ADMIN_PASSWORD` are removed. Lost root passwords are reset by a CLI command (appliance epic `DSM-00144`).
- **Node.js.** Target the latest LTS, currently Node 26, and pin it (`engines` in `package.json` and `.nvmrc`). Today CI runs Node 24 and `README.md` says 20 or 22; both need aligning.
- **Testing.** Unit tests (Vitest) plus agentic manual testing with Playwright. There is no automated E2E suite, and none is planned.

### Open

1. **Production deployment details.** Still to decide: exposure (LAN only or public internet, and the default `HOST`), whether Aegis terminates TLS itself, the distribution format (archive with bundled Node, Docker image, or source), and the default port.
2. **Persistence.** The old ten-table design (`PERSISTENCE_SPEC`) is undecided. Audit it against the backlog, then keep what is needed and refactor the rest.
