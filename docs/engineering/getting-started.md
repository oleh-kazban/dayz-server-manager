# Getting Started

|              |                           |
| :----------- | :------------------------ |
| **Status**   | Implemented               |
| **Verified** | Against commit `49b09cc`  |
| **Audience** | Maintainers and AI agents |

## Prerequisites

- **Node.js:** the latest LTS (currently 26). The version is not pinned yet; pinning it in `engines` and `.nvmrc`, and aligning CI (Node 24) and the README (20 or 22), is a pending task.
- **pnpm:** the version in the `packageManager` field of `package.json`. Run `corepack enable` to use it.

## Install and run

```bash
pnpm install
pnpm start:server   # Fastify daemon on http://localhost:5000
pnpm start:web      # web console on http://localhost:4200
```

The web dev server proxies `/api` to the daemon.

> **Windows:** start both servers from the path with an uppercase drive letter (`D:\Projects\...`). A lowercase `d:\` path makes Vite load some modules twice, which duplicates `AuthContext` and breaks sign-in.

On first start the daemon creates the database and seeds an `admin` user. The password is `admin`, or the value of `DSM_ADMIN_PASSWORD`. In production `DSM_ADMIN_PASSWORD` is required. This seed is being replaced by a first-run setup screen that creates the root operator; see [vision and scope](../product/vision-and-scope.md#4-users).

## Configuration

Copy `.env.example` to `.env.local`. The daemon validates its environment with Zod at startup (`apps/server/src/config/env.ts`) and refuses to start on invalid values.

| Variable                           | Default                                       | Purpose                                                                                    |
| :--------------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `PORT`                             | `5000`                                        | Daemon port                                                                                |
| `HOST`                             | `0.0.0.0`                                     | Bind address                                                                               |
| `NODE_ENV`                         | `development`                                 | `development`, `production` or `test`                                                      |
| `CORS_ORIGIN`                      | `http://localhost:4200,http://127.0.0.1:4200` | Allowed browser origins, comma-separated                                                   |
| `LOG_LEVEL`                        | `info`                                        | Pino level                                                                                 |
| `SESSION_SECRET`                   | development value                             | Signs tokens. In production it must be set explicitly and be at least 32 characters        |
| `DSM_ADMIN_PASSWORD`               | none                                          | Initial admin password. Required in production on first boot                               |
| `DATABASE_PATH`                    | `manager-data/database/manager.sqlite`        | SQLite file                                                                                |
| `DSM_SERVER_STARTUP_WINDOW_MS`     | `60000`                                       | How long a starting server may take before it counts as failed                             |
| `DSM_SERVER_POLL_INTERVAL_MS`      | `5000`                                        | Liveness poll for supervised processes                                                     |
| `DSM_SERVER_STOP_TIMEOUT_MS`       | `60000`                                       | Time to wait for a graceful stop before force-killing                                      |
| `STEAM_VAULT_KEY`, `DSM_VAULT_KEY` | none                                          | Key for encrypted secrets. Without one, a key file is created in `manager-data/.vault.key` |
| `VITE_API_URL`                     | empty                                         | Web app: API origin. Empty uses the Vite proxy                                             |

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
