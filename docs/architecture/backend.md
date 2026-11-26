# Backend

|              |                                                    |
| :----------- | :------------------------------------------------- |
| **Status**   | Implemented, except where a section says _Planned_ |
| **Verified** | Against commit `3ec05ee` (`apps/server`)           |
| **Audience** | Maintainers and AI agents                          |

The backend is one Fastify 5 daemon in `apps/server`. It serves the REST API under `/api/v1` and Server-Sent Events (SSE). It supervises the DayZ process, edits its configuration files, and talks to SteamCMD and the Steam Web API. The [overview](overview.md) gives the big picture; this document describes the daemon itself.

## 1. Startup and shutdown

`main.ts` loads the environment, builds the app, prepares the setup account, and listens on `HOST:PORT`.

1. `loadEnv` validates the environment with Zod (`config/env.ts`) and stops with a list of the invalid variables. `SESSION_SECRET` is optional. When set, it must be at least 32 characters. When empty, `resolveSessionSecret` (`config/session-secret.ts`) creates a random key once in `manager-data/.session.key` and reuses it. An invalid key file stops the start with an error that names the file. The variables are listed in [getting started](../engineering/getting-started.md#configuration).
2. `buildApp` (`app/app.ts`) creates the Fastify instance, the database, the services and the routes. It takes options so that tests can replace the database, the process manager, the RCON client, the log stream and the directory of the setup file (`setupFileDir`, default `manager-data`).
3. `prepareIdentity` (`services/identity/startup.ts`) runs after `buildApp` and before `listen`. It locks a seeded `admin` that still has the default password. With no `root` account it creates the `setup` account and `manager-data/setup-credentials.txt`, or keeps them when they are still valid, and logs the file path and the expiry time at `warn` level (never the credentials). With a `root` account it removes any leftover setup account and file and prints nothing. A failure ends the process with exit code `1`. `buildApp` creates no account and writes no file. See [persistence](persistence.md#4-secrets-and-hashes).
4. After the server is ready, `ServerLifecycleService.reconcile()` re-adopts DayZ processes that survived a restart. A failure is logged and does not stop the boot.
5. On `SIGINT` or `SIGTERM` the app closes, the database closes, and the process exits with `0`. When the app closes, only the lifecycle timers stop: DayZ processes keep running.

The daemon does not serve the web app yet. In production, one process is meant to serve both (see the [decision](overview.md#decided)); the static-file plugin is not written.

## 2. What `buildApp` sets up

**Decorators** available to every route as `fastify.<name>`:

| Decorator                     | What it is                                                                    |
| :---------------------------- | :---------------------------------------------------------------------------- |
| `db`, `sqlite`, `closeDb`     | Drizzle handle, raw `better-sqlite3` handle, and the close function           |
| `sseHub`, `sseTickets`        | The broadcast hub and the single-use ticket store                             |
| `lifecycle`                   | `ServerLifecycleService`                                                      |
| `isSessionActive(sid)`        | Checks the session row and expiry, and records activity at most once a minute |
| `authenticate`                | Route hook that requires a valid access token                                 |
| `authenticateSse`             | Route hook that accepts a one-time ticket, or falls back to `authenticate`    |
| `authenticateIgnoringSession` | Route hook for logout: verifies the access token but not the session row      |

**Plugins:** `@fastify/cors` (origins from `CORS_ORIGIN`, credentials allowed), `@fastify/rate-limit` (`global: false`, so only routes that ask for a limit have one), `@fastify/sensible`, and `@fastify/jwt` (secret from `SESSION_SECRET` or `.session.key`).

**Body parsing:** a custom JSON parser accepts an empty body with `Content-Type: application/json` (clients send it on `DELETE`). Invalid JSON is a `400`.

**Error handler:** one app-level handler turns errors into the API error envelope (see [Errors](#4-errors)). `server-config.ts` sets its own handler for its plugin scope.

## 3. API

Routes live in `apps/server/src/routes/`, one file per area, each registered with a prefix. Every route except health, login and refresh requires a valid access token.

| Method and path                                                                                                     | Purpose                                                                                                   |
| :------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`                                                                                                | Liveness: `200 {status: ok}` or `503` when SQLite fails                                                   |
| `POST /api/v1/auth/login`                                                                                           | Sign in (rate limited: 10 per minute)                                                                     |
| `POST /api/v1/auth/refresh`                                                                                         | Exchange a refresh token for a new access token and a new refresh token (rate limited: 30 per minute)     |
| `POST /api/v1/auth/logout`                                                                                          | End the current session: `204`, idempotent, open to every role                                            |
| `GET /api/v1/auth/me`                                                                                               | The current operator                                                                                      |
| `POST /api/v1/setup/root`                                                                                           | Create the root account from the setup session (rate limited: 10 per minute)                              |
| `GET`, `PATCH /api/v1/profile`, `POST /api/v1/profile/change-password`                                              | Profile and password (also under `/api/v1/auth/profile`)                                                  |
| `GET /api/v1/auth/sessions`, `DELETE .../:id`, `POST .../revoke-others`                                             | List and revoke sessions                                                                                  |
| `GET`, `POST /api/v1/servers`, `GET`, `PATCH`, `DELETE .../:id`                                                     | List, create, read, update and delete servers                                                             |
| `POST /api/v1/servers/:id/validate-paths`                                                                           | Check the server paths on disk                                                                            |
| `POST /api/v1/servers/:id/start`, `stop`, `restart`, `stop/cancel`, `force-stop`                                    | Lifecycle commands                                                                                        |
| `GET /api/v1/servers/:id/launch-command`                                                                            | The compiled launch command                                                                               |
| `GET`, `POST`, `PUT /api/v1/servers/:id/config/server-dz`                                                           | Read and write `serverDZ.cfg`, and create it from a template (`bootstrap`, only when the file is missing) |
| `POST .../config/server-dz/validate`                                                                                | Validate text without saving                                                                              |
| `POST .../config/server-dz/lock`, `lock/heartbeat`, `lock/release`                                                  | The edit lock                                                                                             |
| `GET .../config/server-dz/revisions`, `.../:revisionId`, `POST .../:revisionId/restore`                             | Revision history and restore                                                                              |
| `POST /api/v1/servers/:id/config/battleye/sync`                                                                     | Regenerate the BattlEye RCON config                                                                       |
| `GET /api/v1/servers/:id/mods`, `GET .../mods/export-preset`                                                        | List mods, export a launcher preset                                                                       |
| `POST .../mods`, `mods/batch`, `mods/import`, `mods/check-updates`                                                  | Add, batch add, import and check updates                                                                  |
| `PATCH`, `DELETE .../mods/:modId`, `PUT .../mods/reorder`                                                           | Edit, remove and reorder mods                                                                             |
| `GET /api/v1/servers/:id/logs/:kind`, `.../logs/:kind/stream`                                                       | Tail of the log, and a live stream (`kind` is only `rpt`)                                                 |
| `POST /api/v1/realtime/ticket`, `GET /api/v1/realtime/sse`                                                          | SSE ticket and the broadcast stream                                                                       |
| `GET`, `PATCH /api/v1/settings/steam`                                                                               | Steam settings                                                                                            |
| `POST /api/v1/settings/steam/session/login`, `session/clear`, `challenge/respond`, `challenge/abort`, `diagnostics` | SteamCMD session and diagnostics                                                                          |
| `POST /api/v1/workshop/lookup`, `GET /api/v1/workshop/search`                                                       | Workshop lookup and search                                                                                |

The request and response shapes are Zod schemas in `libs/api-contracts`, and the typed calls are in `libs/api-client`.

**Request validation.** Handlers parse the body, params and query with the contract schemas (`safeParse`) and answer `400 VALIDATION_FAILED` with `fieldErrors`. Only the health and auth routes also declare a Fastify JSON schema.

**Authorization.** The roles are `root`, `admin` and `setup`. `authenticate` (and `authenticateSse`) is the choke point: after it verifies the token it applies a default-deny, so only `root` and `admin` pass, and a `setup`, missing or unknown role gets `403 AUTH_FORBIDDEN_ADMIN_REQUIRED`. The only exception is the allowlist `ROLE_GATE_OPEN_ROUTES` (`GET /api/v1/auth/me`, `POST /api/v1/auth/logout` and `POST /api/v1/setup/root`). Routes that need the admin role add `requireAdmin` after `authenticate` in `onRequest`, so a denied caller gets 403 before the body is parsed. `requireRoot` (`AUTH_FORBIDDEN_ROOT_REQUIRED`) exists, but no route uses it yet.

**First-time setup.** `POST /api/v1/setup/root` takes `{username, password, confirmPassword}` with the `Authorization` header of a `setup` session (the account from `setup-credentials.txt`, signed in through `/auth/login`). In one immediate transaction `createRoot` (`services/identity/create-root.ts`) checks that no root exists and that the caller is the unexpired `setup` account, deletes the setup account and a locked seeded `admin`, and inserts the `root` account. After the commit the route deletes the file and answers with the same body as login. If a database failure happens while the tokens are issued after the commit, the route answers `500`; the root account exists and the operator signs in normally. Refusals: `409 AUTH_SETUP_ALREADY_COMPLETE`, `401 AUTH_SETUP_SESSION_EXPIRED`, `401 AUTH_SESSION_INVALID` (caller gone), `409 AUTH_USERNAME_TAKEN` (with `fieldErrors.username`), `403 AUTH_FORBIDDEN_ADMIN_REQUIRED` for any role but `setup`, `400 VALIDATION_FAILED`. Login answers `401 AUTH_SETUP_SESSION_EXPIRED` for a setup account older than 60 minutes, and a setup session never outlives that time. The guards are in `app/role-guards.ts`; see TD-01 in the [register](../tech-debt.md).

## 4. Errors

Every error response uses one envelope, built by `sendApiError` (`utils/api-error.ts`): the HTTP status, a phrase, an `errorCode`, a message, and optional `params` and `fieldErrors`.

- The codes are the `apiErrorCodeSchema` enum in `libs/api-contracts/src/lib/error.contract.ts` (71 codes). The web app maps each code to a translated message in `apps/web/src/core/i18n`.
- `formatZodFieldErrors` converts a `ZodError` into `fieldErrors` keyed by field name.
- An unexpected error is logged in full and answered with `500 INTERNAL_SERVER_ERROR` and a generic message, so internals never reach the client.
- Rate limiting answers `429 AUTH_RATE_LIMIT_EXCEEDED`.

A new error gets a new code in the contract, a message in the web locale file, and a test.

## 5. Authentication

Details of the token model are in the [overview](overview.md#authentication-and-sessions). In the daemon:

- `authenticate` verifies the `Authorization` header only. It rejects a token that is not an access token (`AUTH_TOKEN_TYPE_INVALID`), a token without `sid`, and a token whose session is missing or expired (all `AUTH_SESSION_INVALID`).
- `authenticateIgnoringSession` is used by `POST /auth/logout`. It verifies the token and the role gate but does not require a live session row, so logout succeeds when the session is already gone.
- **Refresh rotation.** Every refresh issues a new refresh token with a new `jti` and stores it on the session row. The previous token stays valid for 60 seconds and is answered with the current token, with no state change. Outside that window, or for any unknown `jti`, the session is deleted and the answer is `401 AUTH_SESSION_EXPIRED`. A refresh token without `jti` is rejected. A client that keeps the previous token inside the 60 second window receives the current one, so the window is a deliberate limit.
- `isSessionActive` writes `last_active_at` at most once every 60 seconds, to avoid write contention in SQLite.
- `POST /realtime/ticket` issues a ticket that is valid for 30 seconds and can be used once (`SseTicketStore`). `authenticateSse` consumes it from `?ticket=` and sets `request.user`.

## 6. Realtime

Two kinds of streams, both SSE:

- **Broadcast stream** (`GET /realtime/sse`). `SseHub` sends every event to every connected client and a `: ping` comment on an interval. Events today:

| Event                          | Sent when                                       |
| :----------------------------- | :---------------------------------------------- |
| `server.status.changed`        | A server changes state                          |
| `server.stop.failed`           | A delayed stop came due but could not run       |
| `server.restart.failed`        | A restart failed in its stop or its start phase |
| `steam.auth.status`            | The SteamCMD session status changes             |
| `steam.auth.challenge`         | Steam asks for a Guard code                     |
| `steam.auth.challenge.expired` | A challenge was not answered in time            |

- **Per-client stream** (`openEventStream`). The route owns the response (`reply.hijack()`), sets `Content-Type: text/event-stream` and `X-Accel-Buffering: no`, and sends a heartbeat every 15 seconds. The log stream uses it to send `log.lines` events. A reverse proxy in front must not buffer these responses.

## 7. Services

Services hold the logic; routes parse input, call a service and shape the response. All of them live in `apps/server/src/services/`.

| Service                                          | Responsibility                                                                                       |
| :----------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `ServerLifecycleService`                         | State machine, spawn, graceful stop through RCON, force-kill watchdog, restart, reconcile after boot |
| `ServerDzConfigService`                          | Reads, validates and writes `serverDZ.cfg`, with a version token to detect outside edits             |
| `ConfigEditLockService`                          | Edit lease per server and file, with a 120 s expiry and a heartbeat                                  |
| `config-atomic-writer`                           | Temporary file, backup, atomic rename                                                                |
| `BattlEyeConfigService`                          | Generates the BattlEye RCON config from the stored password                                          |
| `launch-command.service`                         | Builds the launch command preview from stored options and mods (uses `@aegis/dayz-config`)           |
| `ServerFsInspectorService`, `server-path-safety` | Validates server paths: no traversal, null bytes or symlink escape, per host platform                |
| `server-secrets`                                 | Encrypts and decrypts the RCON password with the vault                                               |
| `SteamRunnerService`                             | The SteamCMD session: login, Steam Guard challenge, status                                           |
| `SteamPathService`                               | Validates SteamCMD and Workshop paths                                                                |
| `SteamWorkshopService`                           | Steam Web API calls (10 s timeout, 50 items per batch, up to 200 items per collection)               |
| `server-log`                                     | Finds the newest `.RPT` file, reads its tail, follows it                                             |
| `SseHub`, `SseTicketStore`, `event-stream`       | Realtime, see section 6                                                                              |

Config files are limited to 64 KiB (`SERVER_CONFIG_MAX_BYTES`). The config routes accept a body of that size plus 32 KiB of envelope.

## 8. Logging

Fastify's logger (pino) writes to standard output at `LOG_LEVEL`. The request serializer redacts the query values `ticket`, `token`, `access_token` and `refresh_token`, so a credential in a URL never reaches the log. Credentials are never logged elsewhere.

## 9. Tests

Each route and service has a spec next to it (`*.spec.ts`). Route tests build the app with `buildApp` and an in-memory database, and replace the process manager and the RCON client with fakes from `services/server/__fixtures__`. Run `pnpm nx run server:test`. The rules are in [testing](../engineering/testing.md).

## 10. Known gaps

- No static serving of the web app (see section 1).
- The profile routes are registered twice, under `/api/v1/profile` and `/api/v1/auth/profile`.
- Only login, refresh and the setup route are rate limited.
- The log routes support only the `rpt` kind. The ADM and script logs are planned items in the [backlog](../product/backlog.md).
- The defaults `HOST=0.0.0.0` and `CORS_ORIGIN` for the dev servers are not production settings (see the open deployment question in the [overview](overview.md#open)).
