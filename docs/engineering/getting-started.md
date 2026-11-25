# Getting Started

|              |                           |
| :----------- | :------------------------ |
| **Status**   | Implemented               |
| **Verified** | Against commit `49b09cc`  |
| **Audience** | Maintainers and AI agents |

## Prerequisites

- **Node.js:** the latest LTS (currently 26). The version is not pinned yet; pinning it in `engines` and `.nvmrc`, and aligning CI (Node 24) and the README (20 or 22), is a pending task.
- **pnpm:** the version in the `packageManager` field of `package.json`. Run `corepack enable` to use it.
- **After a Node upgrade:** the native SQLite module is built for one Node version. If the server or the tests fail with `compiled against a different Node.js version` (`NODE_MODULE_VERSION`), run `pnpm rebuild better-sqlite3`.

## Install and run

```bash
pnpm install
pnpm start:server   # Fastify daemon on http://localhost:5000
pnpm start:web      # web console on http://localhost:4200
```

The web dev server proxies `/api` to the daemon.

> **Windows:** start both servers from the path with an uppercase drive letter (`D:\Projects\...`). A lowercase `d:\` path makes Vite load some modules twice, which duplicates `AuthContext` and breaks sign-in.
>
> If Storybook or Nx behaves oddly on Windows, check `echo $env:NX_WORKSPACE_ROOT_PATH`. Nx prefers that variable over the real working directory, and a lowercase `d:\...` value makes Storybook build with broken story keys (every story fails with `importers[path] is not a function`). Unset it or set it with an uppercase drive letter.

On first start the daemon creates the database with no account. It then creates a temporary setup account and writes its username and password to `manager-data/setup-credentials.txt`. The log prints the path of the file and the time it expires, never the credentials. The setup account and the file are valid for 60 minutes. Restart the daemon to get new ones. Creating the root account deletes the setup account and the file. No variable presets a password.

The file has mode `0600` where the platform supports it. On Windows the mode bits have no effect and the file inherits the ACL of the data directory, as `manager-data/.vault.key` does: restrict that directory to the account that runs Aegis. The file is replaced with a rename, so the data directory needs no hard link support for it.

**Upgrading.** The first start of this version changes the session secret handling, so every session ends and operators sign in again. An `admin` account that still has the default password `admin` is locked at start and removed when the root account is created. Other accounts are not changed.

## Configuration

Copy `.env.example` to `.env.local`. The daemon validates its environment with Zod at startup (`apps/server/src/config/env.ts`) and refuses to start on invalid values.

| Variable                           | Default                                       | Purpose                                                                                    |
| :--------------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `PORT`                             | `5000`                                        | Daemon port                                                                                |
| `HOST`                             | `0.0.0.0`                                     | Bind address. A non-loopback address logs a start warning: put HTTPS in front of Aegis     |
| `NODE_ENV`                         | `development`                                 | `development`, `production` or `test`                                                      |
| `CORS_ORIGIN`                      | `http://localhost:4200,http://127.0.0.1:4200` | Allowed browser origins, comma-separated                                                   |
| `LOG_LEVEL`                        | `info`                                        | Pino level                                                                                 |
| `SESSION_SECRET`                   | none                                          | Optional, at least 32 characters. Empty: Aegis keeps a key in `manager-data/.session.key`  |
| `DATABASE_PATH`                    | `manager-data/database/manager.sqlite`        | SQLite file                                                                                |
| `DSM_SERVER_STARTUP_WINDOW_MS`     | `60000`                                       | How long a starting server may take before it counts as failed                             |
| `DSM_SERVER_POLL_INTERVAL_MS`      | `5000`                                        | Liveness poll for supervised processes                                                     |
| `DSM_SERVER_STOP_TIMEOUT_MS`       | `60000`                                       | Time to wait for a graceful stop before force-killing                                      |
| `STEAM_VAULT_KEY`, `DSM_VAULT_KEY` | none                                          | Key for encrypted secrets. Without one, a key file is created in `manager-data/.vault.key` |
| `VITE_API_URL`                     | empty                                         | Web app: API origin. Empty uses the Vite proxy                                             |

### Production setup

Put HTTPS in front of Aegis with a reverse proxy that you provide. Aegis does not manage certificates. See the [FAQ](../../faq.md). Leave `SESSION_SECRET` empty to let Aegis generate a key once and keep it in `manager-data/.session.key`. Set it only to share one key between instances. If the key file is invalid, the start fails and names the file: fix it, delete it (this signs everyone out), or set `SESSION_SECRET`. The data directory must support hard links (NTFS, ext4 and xfs do; FAT, exFAT and some network shares do not). On such a directory, set `SESSION_SECRET` instead.

## Commands

Prefer `pnpm nx` for tasks, so Nx caching and the project graph apply.

| Command                            | Purpose                                                           |
| :--------------------------------- | :---------------------------------------------------------------- |
| `pnpm test`                        | Vitest for every project                                          |
| `pnpm test:coverage`               | Vitest with coverage                                              |
| `pnpm nx run <project>:test`       | Tests for one project (`web`, `server`, `ui`, `database`, ...)    |
| `pnpm typecheck`                   | TypeScript across the workspace                                   |
| `pnpm lint`, `pnpm lint:fix`       | ESLint with zero warnings allowed                                 |
| `pnpm format:check`, `pnpm format` | Prettier                                                          |
| `pnpm check:cycles`                | Circular dependency check (Madge)                                 |
| `pnpm build`                       | Production build of the apps                                      |
| `pnpm storybook`                   | Storybook for `@aegis/ui` on `http://localhost:6006`              |
| `pnpm docs:sync`                   | Regenerate `history.md` and copy FAQ and history into the web app |
| `pnpm graph`                       | Nx project graph                                                  |

For repository layout and dependency rules, see the [architecture overview](../architecture/overview.md).
