# Frontend

|              |                                                          |
| :----------- | :------------------------------------------------------- |
| **Status**   | Implemented, except where a section says _Planned_       |
| **Verified** | Against commit `5ca2cd1` (`apps/web`, `libs/api-client`) |
| **Audience** | Maintainers and AI agents                                |

The console is a React 19 single-page app in `apps/web`, built with Vite. It talks to the daemon through `libs/api-client` and renders with the `@aegis/ui` kit. The [overview](overview.md) gives the big picture; this document describes the app itself.

## 1. Startup and providers

`main.tsx` imports the theme styles and the i18n setup, then renders `App` in `StrictMode`. `App.tsx` nests the providers in this order:

```text
AppErrorBoundary            catches render errors, shows RootErrorFallback
└─ QueryClientProvider      TanStack Query cache
   └─ ThemeProvider         theme and mode, applied as data-theme
      ├─ Toaster            toast host
      └─ AuthProvider       signed-in user and tokens
         └─ FeatureFlagsProvider
            └─ RouterProvider   context { auth, features }
```

When the signed-in user changes, the app calls `router.invalidate()`, so route guards run again. Inside the signed-in area, `AuthedLayout` adds `RealtimeProvider` and `UnsavedChangesProvider` around `AppShell` (header, sidebar, footer).

## 2. Source layout

| Folder        | Content                                                                                                                                      |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/` | App-level components: `layout/` (shell, header, sidebar, footer, placeholder, error fallbacks) and `forms/`                                  |
| `core/`       | Infrastructure shared by features, see section 3                                                                                             |
| `features/`   | One slice per product area: `auth`, `dashboard`, `faq`, `flavor-text`, `maintenance`, `mods`, `profile`, `server-settings`, `steam`, `theme` |
| `router.tsx`  | The route tree                                                                                                                               |
| `styles/`     | `theme.css`, fonts and animations                                                                                                            |

Imports use the aliases `@aegis/web/core` and `@aegis/web/components`. A feature does not import another feature's internals.

## 3. Core modules

| Module               | Purpose                                                                    |
| :------------------- | :------------------------------------------------------------------------- |
| `core/query`         | The query client (30 s stale time, one retry, no refetch on window focus)  |
| `core/server`        | Server queries and keys, and `useActiveServer`                             |
| `core/server-status` | Display helpers for the server status                                      |
| `core/realtime`      | The SSE connection and the handlers that update the query cache            |
| `core/forms`         | `useEditableForm`, form utilities, the unsaved-changes guard               |
| `core/notifications` | `notifySuccess`, `notifyInfo`, `notifyApiError` and the notification store |
| `core/i18n`          | i18next setup and the message catalog                                      |
| `core/navigation`    | Route paths, scopes, breadcrumbs and the sidebar configuration             |
| `core/features`      | Module feature flags                                                       |
| `core/storage`       | Typed `localStorage` and `sessionStorage` drivers, validated with Zod      |
| `core/layout`        | The layout store (mobile sidebar) and `useModalDialog`                     |
| `core/markdown`      | A sanitized Markdown viewer, used by the help modal                        |
| `core/config`        | The app version                                                            |

## 4. Routing

Routing is code-based with TanStack Router (`router.tsx`). The router context carries `auth` and `features`.

- The root route validates the `serverId` search parameter (a UUID, optional).
- `/` redirects to `/dashboard`. `/sign-in` redirects signed-in users to `/dashboard` (setup users to `/setup`) and accepts a `redirect` parameter.
- `/setup` is the one-purpose screen of the setup account, outside the shell. It sends signed-out users to `/sign-in` and other users to `/dashboard`. The layout route sends a `setup` user to `/setup`.
- Every other route sits under a layout route whose `beforeLoad` sends signed-out users to `/sign-in?redirect=<current URL>`.
- Index routes redirect to the first child: `/logs` to `/logs/rpt`, `/world` to `/world/map`, `/economy` to `/economy/types`, `/settings` to `/settings/steam`.
- Some routes check a feature flag in `beforeLoad` and redirect to `/dashboard` when it is off.

| Route                                                                               | State       | Flag                   |
| :---------------------------------------------------------------------------------- | :---------- | :--------------------- |
| `/dashboard`, `/maintenance`, `/profile`, `/settings/server`, `/settings/steam`     | Implemented |                        |
| `/mods`                                                                             | Implemented | `modsManager`          |
| `/system`, `/players`, `/audit`, `/logs/rpt`, `/logs/adm`, `/logs/script`           | Placeholder |                        |
| `/world/map`, `/world/loot`                                                         | Placeholder | `worldMap`             |
| `/economy/types`, `/economy/cfgspawnabletypes`                                      | Placeholder | `economyWorkbench`     |
| `/settings/discord`                                                                 | Placeholder | `discordNotifications` |
| `/settings/app`, `/settings/operators`, `/settings/automation`, `/settings/backups` | Placeholder |                        |

A placeholder route renders `PlaceholderView`. The [feature map](../product/feature-map.md) lists what each page will do.

**Feature flags** (`ModuleFlags`) are constants today: `worldMap`, `economyWorkbench`, `modsManager`, `discordNotifications` and `multiServerFleet` are on, `combatForensics` is off. `FeatureFlagsProvider` accepts overrides but nothing sets them at runtime.

## 5. Active server and navigation scopes

- **Active server.** The selected server lives in the `serverId` search parameter. `useActiveServer` loads the server list and picks, in order, the server named in the URL, the default server, or the first one. It then rewrites the URL so `serverId` is present on server routes and absent elsewhere. Changing the server goes through the unsaved-changes guard.
- **Scopes.** `core/navigation` sorts every route into one of three scopes: `server` (pages that belong to the active server), `appliance` (`/settings/steam`, `/settings/app`, `/settings/operators`, `/audit`) and `user` (`/profile`). The header and the sidebar change with the scope.
- **Breadcrumbs and menu.** `ROUTE_BREADCRUMBS` holds the label of each route. `SERVER_NAVIGATION_SECTIONS` builds the sidebar, and an item can name a feature flag.

## 6. API access and authentication

**API client.** `libs/api-client` exposes `apiClient` with one module per API area. `HttpClient` sends requests to `VITE_API_URL` (empty means the same origin, through the Vite proxy in development) and parses every response with the Zod schema from `libs/api-contracts`. Failures throw `ApiError` (the error envelope) or `ValidationError` (a response that does not match its schema).

**Tokens.** After sign-in the access token goes to the client, and both tokens are stored in the browser: in `sessionStorage` by default, or in `localStorage` when the operator picks "remember me". The access token is read at module load, so the first queries after a reload are already authenticated.

**Refresh.** When a request answers `401`, the client calls the refresh handler once (concurrent requests share the call), stores the new access token and repeats the request. If there is no refresh token or the refresh fails, the handler signs the user out. Sign-in and refresh requests are never retried.

**Roles.** The stored user is normalized to the role `admin` when it is read (see [vision](../product/vision-and-scope.md#4-users) for the planned `root` role).

## 7. Server state

TanStack Query holds all server data. Each area has a `*.queries.ts` file with its keys and `queryOptions` (for example `core/server/server.queries.ts`, `features/mods/mods.queries.ts`). Mutations invalidate or update the cache, and realtime events write into it directly.

Zustand is used for three small client-only stores: the layout (mobile sidebar), the notification list, and the help modal (`useFaqStore`).

## 8. Realtime

`RealtimeProvider` opens one SSE connection for the signed-in shell, so signing out closes it.

- **Ticket.** The browser asks `POST /realtime/ticket` and opens `GET /realtime/sse?ticket=...`. A ticket is single use, so every connection attempt gets a new one.
- **Reconnect.** `RealtimeConnection` owns the reconnect: after a failure it waits 1 s, then doubles the wait up to 30 s. The connection state is `connecting`, `open`, `reconnecting` or `closed`.
- **Handlers.** `server.status.changed`, `server.stop.failed` and `server.restart.failed` update the query cache (`server-status.realtime.ts` and the two others). Background events never show a toast.
- **Second connection.** The Steam settings page opens its own `EventSource` through `useSteamAuthChallenge`, with its own ticket, for the `steam.auth.*` events (login status and the Steam Guard challenge). The two connections do not share a state.

## 9. Forms and feedback

- **Forms.** `useEditableForm` gives every create and update form the same behavior: submit only when something changed, validate on save and re-validate live afterwards, show client and server field errors, and focus the first invalid field. `UnsavedChangesProvider` blocks navigation and server switching while a form has unsaved edits, and asks first.
- **Feedback.** The contract (green toast on success, red toast on every failure, inline field errors) is in [conventions](../engineering/conventions.md#6-user-feedback-contract). Toasts and the notification menu (the bell in the header) have different jobs. _Decided:_
  - A **toast** reports the result of an async request and its response. A form that the server rejects with validation errors gets a red toast (and inline field errors). A form that saves gets a green toast. Warning and info toasts do not exist yet and are meant for later.
  - The **bell** is for background events: results of delayed or background tasks that no request is waiting for. The bell today also shows a greeting. The exact list of events is not written down yet.
- **Drift.** The code does not follow that rule in two ways (TD-08 in the [register](../tech-debt.md)). First, `notifySuccess`, `notifyInfo` and `notifyApiError` show a toast and also add an entry to the notification store, so every request result lands in the bell too. Second, the background events that exist (`server.stop.failed`, `server.restart.failed`, the Steam login events) never reach the bell: they only update the query cache or the Steam page.
- **Messages.** Error and notification texts come from the i18n catalog by code: `errors.<CODE>.title` and `errors.<CODE>.description`. An unknown code falls back to the title and description the caller passes.

## 10. Internationalization

`i18next` and `react-i18next` are set up in `core/i18n`. The only locale is `en-US` (`locales/en-US.ts`), used as the fallback as well. Most visible text outside the error catalog is still written directly in components.

_Decided:_ the app will be translated into at least Ukrainian, Polish, German, Italian and French. The work is package 9 of the [UI kit fix plan](../engineering/ui-kit-fix-plan.md) for the kit; the app's own strings need the same treatment.

## 11. Theme

`ThemeProvider` keeps a mode (`light` or `dark`) and one of 12 themes (six light, six dark). It sets the active theme id in the `data-theme` attribute of the root element, adds a short `theme-switching` class during a switch to suppress transitions, and stores the choice in `localStorage`. Old theme ids from earlier versions are mapped to the current ones when read. The tokens and palettes are in the [design system](../design/design-system.md). The footer shows a rotating flavor quote (`features/flavor-text`).

## 12. UI kit

All controls come from `@aegis/ui`. The kit is documented in Storybook (`pnpm storybook`) and audited in the [tech debt register](../tech-debt.md). New screens use the kit components and semantic tokens only.

## 13. Tests

Specs sit next to the code (`*.test.tsx`, `*.spec.ts`) and run with Vitest and React Testing Library: `pnpm nx run web:test`. Tests mock the `libs/api-client` facade or the query layer, never internals. The rules are in [testing](../engineering/testing.md).

## 14. Known gaps

- 15 of 21 routes are placeholders (section 4).
- Feature flags cannot change at runtime (section 4).
- Two SSE connections can be open at once (section 8).
- Only the `en-US` locale exists (section 10).
- Toast results are mirrored into the bell (section 9, TD-08).
- Password rules are written in three places (TD-09).
- Tokens are kept in browser storage, not in `HttpOnly` cookies. This is the current design, not a decision about the future.
- The two modal systems and other kit issues are in the [register](../tech-debt.md).
