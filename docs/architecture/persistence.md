# Persistence

|              |                                                                   |
| :----------- | :---------------------------------------------------------------- |
| **Status**   | Implemented, except where a section says _Planned_ or _Undecided_ |
| **Verified** | Against commit `f8ee56f` (`libs/database`)                        |
| **Audience** | Maintainers and AI agents                                         |

Aegis stores its own state in one SQLite file. Game files stay on disk in their native layout and are never copied into the database. The one exception is the history of `serverDZ.cfg` revisions (see `server_config_revisions`).

## 1. Engine and connection

- `better-sqlite3` with Drizzle ORM. The code lives in `libs/database` (`db.ts`, `schema.ts`, `migrations.ts`, `crypto.ts`).
- The file is `manager-data/database/manager.sqlite`, relative to the working directory. `DATABASE_PATH` overrides it. `manager-data/` is runtime state: gitignored and never part of an update.
- `initDatabase` creates the folder, opens the file with a 5 s busy timeout and sets these pragmas:

| Pragma         | Value    | Why                                          |
| :------------- | :------- | :------------------------------------------- |
| `journal_mode` | `WAL`    | Readers do not block the writer              |
| `synchronous`  | `NORMAL` | Crash-safe in WAL mode with fewer disk syncs |
| `foreign_keys` | `ON`     | Enforces references and cascades             |
| `busy_timeout` | `5000`   | Absorbs short lock windows                   |

- `initDatabase` opens the file and runs the migrations. It creates no account. A fresh database has an empty `users` table; the first account comes from the first-time setup (section 4).

## 2. Migrations

- Migrations are written by hand in `migrations.ts`, in an ordered array. Each has an id (`0001_initial_users` ... `0013_session_refresh_rotation`), a name and an `up` function. Drizzle's own migrator and `drizzle-kit` are not used.
- Applied ids are recorded in `_dsm_migrations` (`id`, `name`, `applied_at`).
- `runMigrations` runs all pending migrations inside one `IMMEDIATE` transaction, so two processes that start together do not apply them twice.
- The existing migrations are idempotent: they use `CREATE TABLE IF NOT EXISTS` and check `table_info` before `ALTER TABLE`. A new migration follows the same pattern, gets the next number, and updates `schema.ts` in the same change.
- Migrations may move data. `0006` encrypts legacy RCON passwords, `0008` normalizes roles and profile paths, `0009` converts free-text launch parameters into structured options.

## 3. Tables

Seven application tables.

| Table                     | Purpose                                                                               |
| :------------------------ | :------------------------------------------------------------------------------------ |
| `users`                   | Operator accounts: username, password hash, profile (name, email, time zone, format)  |
| `sessions`                | One row per sign-in: user agent, IP address, last activity, expiry, refresh token ids |
| `servers`                 | Managed DayZ servers: paths, ports, RCON, launch options, tracked process state       |
| `steam_settings`          | One row (`id = 'default'`): SteamCMD paths, auth mode, encrypted credentials          |
| `server_mods`             | Mods per server: source, load target, order, Workshop sync state                      |
| `config_edit_locks`       | Edit lease per server and file kind, with an expiry                                   |
| `server_config_revisions` | Content and hash of each committed config write, with its source and author           |

### Relations

- `sessions.user_id` references `users` with `ON DELETE CASCADE`.
- `sessions` also holds `refresh_jti` (the current refresh token id), `previous_refresh_jti` and `refresh_rotated_at` (ms, the time of the last rotation). Migration 0013 adds them and deletes sessions without a refresh token id. Rows whose `expires_at` has passed are deleted at start and on each sign-in.
- `server_mods.server_id` and both config tables reference `servers` with `ON DELETE CASCADE`.
- `config_edit_locks.user_id` cascades with the user. `server_config_revisions.user_id` is set to `NULL` when the user is deleted, so the history stays.
- `config_edit_locks` has the primary key `(server_id, file_kind)`. `server_config_revisions` has an index on `(server_id, file_kind, created_at DESC)`. `server_mods` has unique indexes on `(server_id, workshop_id)` and `(server_id, folder_name)`.

### Notes on columns

- **`users.role`** is `root`, `admin` or `setup`. There is at most one `root`. A `setup` account exists only until the root account is created. An account whose password hash is `!` (`UNUSABLE_PASSWORD_HASH`) cannot sign in, because no password verifies against it.
- **Timestamps** are integers. Most columns are in seconds (`mode: 'timestamp'`). Runtime state and config tables use milliseconds (`mode: 'timestamp_ms'`): `process_started_at`, `last_exit_at`, `pending_stop_at`, `acquired_at`, `expires_at` and the revision `created_at`.
- **`servers`** holds the supervision state that must survive an Aegis restart: the tracked process (`process_pid`, `process_start_token`, `process_started_at`), the last exit (`last_exit_reason`, `last_exit_code`, `last_exit_signal`, `last_exit_at`), a delayed graceful stop (`pending_stop_at`, `pending_stop_requested_at`) and a requested restart (`restart_requested`). `ServerLifecycleService.reconcile()` reads them at boot.
- **`servers.launch_options`** is a JSON column typed as `LaunchOptionsDto` (`libs/api-contracts`). It replaced the free-text `launch_parameters` column.
- **`servers.rcon_password`** is a legacy plaintext column, nullable. Migration `0006` moves its content into `rcon_password_encrypted` and sets it to `NULL`. New writes use only the encrypted column; the plaintext column is still read as a fallback for rows that were not migrated.
- **`steam_settings`** is a singleton: one row with the id `default`, created by migration `0004`. It stores encrypted values for the Steam password, the branch password and the Steam Web API key.
- **`server_config_revisions.source`** and **`file_kind`** are enums defined in `libs/api-contracts` (`CONFIG_REVISION_SOURCE_VALUES`, `CONFIG_FILE_KIND_VALUES`).

## 4. Secrets and hashes

- **Passwords** are hashed with scrypt (64-byte key, random 16-byte salt) and stored as `salt:hex`. Verification uses `timingSafeEqual`.
- **Vault secrets** (Steam credentials and API key, RCON passwords) are encrypted with AES-256-GCM and stored as `iv:authTag:ciphertext`, all in hex, with a random 12-byte IV.
- **The vault key** comes from `STEAM_VAULT_KEY` or `DSM_VAULT_KEY` (a 64-character hex value is used as is, anything else is derived with scrypt). Without either, a random 32-byte key is created once in `manager-data/.vault.key` with mode `0600`. The key is independent of the session secret, which comes from `SESSION_SECRET` or from `manager-data/.session.key` (created once, mode `0600` where the platform supports it).
- Losing the key file makes the stored secrets unreadable. Back it up together with the database.
- **The setup file** `manager-data/setup-credentials.txt` exists only while the first-time setup is open (no `root` account). At start Aegis creates one `setup` account with a random username (`setup-` and 12 hex characters) and a random 32-character password, stores only the scrypt hash, and writes the pair to this file. The file has four lines: a `#` notice, `username: ...`, `password: ...` and `expires: <ISO time>`. It is written through a temporary file with mode `0600` and renamed into place. On Windows, which ignores mode bits, Aegis restricts the temporary file with `icacls` (inheritance removed, full control for the current user and Administrators only) before it writes the pair. If this fails (for example on a non-NTFS volume), the start fails and no file is written. The setup account and its sessions end 60 minutes after creation (second resolution). A start with an unexpired account whose file still verifies keeps both; otherwise the account and the file are replaced. Creating the root account deletes the setup account, a locked seeded `admin` and the file. A start with a `root` account removes any leftover setup account and file.

## 5. Backups

- **Config files** get a backup before each atomic write (see the [overview](overview.md#configuration-files)). Revisions of `serverDZ.cfg` are also kept in `server_config_revisions`.
- **The database itself** has no backup job today. The old design called for the SQLite online backup API and 14 daily snapshots. It is not implemented. Until it is, back up `manager-data/` while Aegis is stopped.

## 6. Planned and undecided

The earlier design described ten tables. Seven of them are not implemented, and none is decided:

| Old table           | Would hold                                  | Related open question                                         |
| :------------------ | :------------------------------------------ | :------------------------------------------------------------ |
| `tasks`             | Asynchronous job queue with progress        | Task orchestration ([vision](../product/vision-and-scope.md)) |
| `audit_events`      | Immutable record of operator actions        | Audit trail and hash chaining                                 |
| `telemetry_samples` | Downsampled CPU, RAM, FPS and player counts | Game-side telemetry mod                                       |
| `scheduled_tasks`   | Cron-style restarts, backups, mod updates   | Automation page                                               |
| `backups`           | Registry of persistence and config backups  | Backup feature in the [backlog](../product/backlog.md)        |
| `discord_webhooks`  | Notification endpoints                      | Notification items in the backlog                             |
| `mod_keys`          | Links of mod public keys into the server    | Mod key handling                                              |

The old design also named the server table `instances` and allowed three roles (`admin`, `moderator`, `viewer`), which no longer exist. A generic `system_settings` key-value table was part of it too; the code uses `steam_settings` instead.

Each table is added only when its feature starts, with a migration and a section in this document. Two ideas from the old design are still open: writing telemetry in batches (every 20 to 30 seconds) to avoid `SQLITE_BUSY`, and the database backup job from section 5.
