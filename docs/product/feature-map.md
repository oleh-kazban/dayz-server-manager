# Feature Map

|              |                                                                       |
| :----------- | :-------------------------------------------------------------------- |
| **Status**   | Draft for product owner review                                        |
| **Verified** | Against commit `0d38c16`: backlog statuses, server routes, web routes |
| **Audience** | Maintainers and AI agents                                             |
| **Related**  | [Vision and scope](vision-and-scope.md), [Backlog](backlog.md)        |

This map answers one question: what works today, and what does not. Statuses come from the [backlog](backlog.md) and were cross-checked against the code.

| Status          | Meaning                                                               |
| :-------------- | :-------------------------------------------------------------------- |
| **Built**       | Works end to end: API, UI and tests.                                  |
| **Partial**     | Some of it works. The _Notes_ column says what is missing.            |
| **Placeholder** | The route exists in the console but renders a `PlaceholderView` only. |
| **Planned**     | No code yet.                                                          |

## Foundation

| Capability                                     | PBI                        | Status  | Notes                                                                                                                    |
| :--------------------------------------------- | :------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------- |
| Monorepo, tooling, CI                          | `DSM-00104`, `DSM-00129`   | Built   | Nx, pnpm, ESLint, Vitest, Husky, GitHub Actions                                                                          |
| UI kit `@aegis/ui` with Storybook              | `DSM-00105`, `DSM-00106`   | Built   | `libs/ui`                                                                                                                |
| Themes                                         | `DSM-00110`, `DSM-00135`   | Built   | 12 palettes                                                                                                              |
| Splash and bootstrap continuity                | `DSM-00101` to `DSM-00103` | Built   |                                                                                                                          |
| Toasts, notification centre, error translation | `DSM-00108`, `DSM-00132`   | Partial | English only (`en-US`). The bell also lists toast results, against the rule that it lists background events only (TD-08) |
| Form conventions, unsaved-changes guard        | `DSM-00137`, `DSM-00138`   | Built   | `useEditableForm`                                                                                                        |
| In-app FAQ and release history                 | `DSM-00121`, `DSM-00130`   | Built   | `pnpm docs:sync`                                                                                                         |
| Localization beyond English                    | `DSM-00111`                | Planned |                                                                                                                          |

## Operator access

| Capability                                | PBI         | Status      | Notes                                                                                                        |
| :---------------------------------------- | :---------- | :---------- | :----------------------------------------------------------------------------------------------------------- |
| Sign-in, sessions, token refresh          | `DSM-00107` | Built       | Seeds `admin`/`admin` today. First-run root setup is planned ([vision](vision-and-scope.md#4-users))         |
| Profile, password change, active sessions | `DSM-00109` | Built       | `/profile`                                                                                                   |
| Operators page                            | -           | Placeholder | `/settings/operators`. Root-only page to add, disable and delete admins, reset passwords and revoke sessions |

## Server management

| Capability                                            | PBI                         | Status  | Notes                                                                            |
| :---------------------------------------------------- | :-------------------------- | :------ | :------------------------------------------------------------------------------- |
| Register servers, validate paths, active server       | `DSM-00123`                 | Built   | `/settings/server`                                                               |
| Process supervision, start, stop, restart, force stop | `DSM-00113` (12 of 13 done) | Built   | Open bug: `DSM-00352` (a stopping server is not kept stopping after re-adoption) |
| Graceful stop through RCON `#shutdown`, delayed stop  | `DSM-00163`, `DSM-00167`    | Built   |                                                                                  |
| BattlEye RCON client                                  | `DSM-00161`, `DSM-00165`    | Built   | Library only; no player features on top yet                                      |
| Live server status in the shell                       | `DSM-00164`                 | Built   | SSE                                                                              |
| Last exit reason on the Maintenance page              | `DSM-00350`                 | Built   | `/maintenance`                                                                   |
| `serverDZ.cfg` editor, locks, revisions               | `DSM-00124`                 | Built   | BattlEye config is generated                                                     |
| Launch parameter compiler                             | `DSM-00125`                 | Built   |                                                                                  |
| Host directory picker                                 | `DSM-00127`                 | Planned | `BrowseInput` work is parked in a git stash                                      |
| A2S query and watchdog                                | `DSM-00114`                 | Planned |                                                                                  |
| Port allocation and reachability probe                | `DSM-00147`                 | Planned |                                                                                  |
| Clean-install wizard                                  | `DSM-00146`                 | Planned |                                                                                  |

## Steam and mods

| Capability                                            | PBI                        | Status  | Notes                                                                                                                |
| :---------------------------------------------------- | :------------------------- | :------ | :------------------------------------------------------------------------------------------------------------------- |
| Steam settings, interactive sign-in, credential vault | `DSM-00126`                | Built   | `/settings/steam`, Steam Guard challenge                                                                             |
| Mod list and load order (phase 1)                     | `DSM-00119`                | Built   | `/mods`. The backlog title says "key distribution", but copying `.bikey` files is planned (`DSM-00337`, `DSM-00338`) |
| Mod preset import and export                          | `DSM-00354` to `DSM-00356` | Built   |                                                                                                                      |
| Workshop download with progress, `.bikey` handling    | `DSM-00133`                | Planned |                                                                                                                      |
| SteamCMD health check and guided install              | `DSM-00159`                | Planned |                                                                                                                      |

## Monitoring

| Capability                               | PBI                       | Status      | Notes                                                                                                          |
| :--------------------------------------- | :------------------------ | :---------- | :------------------------------------------------------------------------------------------------------------- |
| Dashboard                                | `DSM-00112`               | Partial     | Greeting and backend health only. The server hero (`DSM-00184`) and telemetry are not built                    |
| Shared SSE subscription                  | `DSM-00115` (1 of 3 done) | Partial     | Event replay after reconnect is planned                                                                        |
| Log streaming (backend)                  | `DSM-00117`               | Partial     | Log tail and live stream endpoints exist (`/servers/:id/logs/:kind`). The `LogViewer` component is in progress |
| Log pages (`/logs/rpt`, `adm`, `script`) | `DSM-00117`               | Placeholder |                                                                                                                |
| Host and process telemetry, history      | `DSM-00122`, `DSM-00139`  | Planned     | `/system` is a placeholder                                                                                     |
| Audit trail                              | -                         | Placeholder | `/audit`. No backlog epic found; see the open questions                                                        |

## Operations

| Capability                                 | PBI         | Status      | Notes                  |
| :----------------------------------------- | :---------- | :---------- | :--------------------- |
| Players workbench, kick and ban, whitelist | `DSM-00116` | Placeholder | `/players`             |
| Restart scheduler, join locks              | `DSM-00140` | Planned     |                        |
| Backups, restore, wipe                     | `DSM-00118` | Placeholder | `/settings/backups`    |
| Scheduled in-game broadcasts               | `DSM-00149` | Planned     |                        |
| Automation page                            | -           | Placeholder | `/settings/automation` |

## Economy and world

| Capability                 | PBI         | Status      | Notes                                                |
| :------------------------- | :---------- | :---------- | :--------------------------------------------------- |
| `types.xml` workbench      | `DSM-00120` | Placeholder | `/economy/types`, behind the `economyWorkbench` flag |
| `cfgspawnabletypes` editor | `DSM-00120` | Placeholder | `/economy/cfgspawnabletypes`                         |
| World map                  | `DSM-00141` | Placeholder | `/world/map`, behind the `worldMap` flag             |
| Loot heatmap               | `DSM-00142` | Placeholder | `/world/loot`                                        |

## Integrations and appliance

| Capability                                | PBI         | Status      | Notes                                                       |
| :---------------------------------------- | :---------- | :---------- | :---------------------------------------------------------- |
| Discord webhooks                          | `DSM-00143` | Placeholder | `/settings/discord`, behind the `discordNotifications` flag |
| Discord bot                               | `DSM-00148` | Planned     |                                                             |
| Packaging, services (WinSW, systemd), CLI | `DSM-00144` | Planned     |                                                             |
| In-app self-update                        | `DSM-00145` | Planned     |                                                             |
| Application settings page                 | -           | Placeholder | `/settings/app`                                             |

## Totals

The backlog holds 257 items: 48 `DONE`, 1 `IN_PROGRESS`, 2 `TODO`, 1 `CANCELLED`, and 205 `BACKLOG`.

## Open questions

1. **Audit trail.** `/audit` is a console route, and the vision lists an audit log, but the backlog has no epic for it. Add one, or drop the route?
2. **Operator management backlog.** The root role, first-run setup, the operators page and the root-password reset have no PBIs yet. Draft them with the refactor plan?
3. **Automation page.** What belongs on `/settings/automation` that the restart scheduler (`DSM-00140`) does not cover?
4. **Application settings.** What does `/settings/app` hold (port, retention, update channel)?
