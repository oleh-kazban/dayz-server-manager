# Release History & Changelog

This document records all completed product backlog items and operational features deployed to the DayZ Server Manager (DSM) platform.

---

## [DSM-00357] Measure `.ts` Files in Web App Coverage

- **Type**: `Task`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

`apps/web/vitest.config.ts` sets coverage `include: ['src/**/*.tsx']`, which replaces the shared `src/**/*.ts` and leaves every `.ts` file in `apps/web/src` unmeasured (hooks, `*.utils.ts`, `*.queries.ts`, `core/forms`, `core/notifications`, `core/realtime`, …). Their tests run, but coverage never counts them, so the reported web coverage overstates what is measured, and the sdlc checks gate fails any change to a web `.ts` file with "no coverage data". - **Acceptance Criteria**: - **AC-1**: web coverage includes `src/**/*.ts` and `src/**/*.tsx`, keeping the existing excludes (`*.types.ts`, `*.schema.ts`, `main.tsx`, `router.tsx`, `styles/**`, tests, `*.d.ts`, barrels). - **AC-2**: `pnpm test:web:coverage` writes `coverage/apps/web/lcov.info` and it lists the measured `.ts` files. - **AC-3**: overall web coverage stays ≥ 80%, and the sdlc checks gate passes on `master`. - **AC-4**: the "Known gap" note in `.claude/CLAUDE.md` §2 is removed.

### Delivered Capabilities

the web coverage `include` setting, a fresh coverage run, the `.claude/CLAUDE.md` note.

---

## [DSM-00356] Export Mod Preset Action in Mods Management Console

- **Type**: `Story`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00354`

### Summary

Add an `Export Preset` action to the `Mods Management` header in `apps/web` allowing operators to download the active server's workshop mods as a community-compatible JSON file (`mods-preset-<server-name>-<YYYY-MM-DD-HH-mm-ss>.json`), strictly omitting local mods, with an option to include or exclude disabled mods.

### Delivered Capabilities

Export button/menu option in `ModsView.tsx`, `ExportPresetModal` preview, preset fetched from `GET /api/v1/servers/:id/mods/export-preset` (`DSM-00354`), file download trigger, notifications, and tests.

---

## [DSM-00355] Import Mods Modal with Dual-Input, Strategy Selector, and Diff Preview

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00353, DSM-00354`

### Summary

Add an `ImportModsModal` in `apps/web` featuring dual input (drag-and-drop `.json` file via `FileUploader` or paste raw JSON), client-side pre-validation, a client-side diff preview with status badges (`New`, `Already Installed`, `Will be removed`) that de-duplicates Workshop IDs like the server, a strategy selector (`Merge with existing` vs. `Replace all`), a confirmation before a replace that removes mods, and form discard protection.

### Delivered Capabilities

`apps/web/src/features/mods/components/ImportModsModal.tsx`, integration in `ModsView.tsx`, TanStack Query invalidation, explicit user feedback toasts (`notifySuccess` / `notifyApiError`), and RTL tests.

---

## [DSM-00354] Mod Preset Contracts, Batched Hydration, and Atomic Server Import API

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00119`

### Summary

Define Zod contracts for the standard community mod preset format (`steamWsMods` and `steamWsServerMods`). Implement `POST /api/v1/servers/:id/mods/import` on Fastify to batch-hydrate metadata via Steam Workshop API (with graceful fallback to preset name on failure) and execute atomic SQLite persistence for both `merge` (append with preserved ordering) and `replace` (Workshop mods follow the preset; mods already installed are updated in place and keep their folder, enabled flag and sync state; local mods keep their load-order slot) modes. The server lock is re-checked inside the transaction after the Steam lookup. Also exposes `GET /api/v1/servers/:id/mods/export-preset`, the single source of truth for preset export.

### Delivered Capabilities

`libs/api-contracts` schemas and DTOs; `libs/api-client` endpoints; Fastify route, controller, and service layer with transaction safety; tests in `apps/server`.

---

## [DSM-00353] FileUploader UI Kit Component with Drop Zone and Drag-and-Drop

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105`

### Summary

Provide an accessible, theme-styled `FileUploader` component in `libs/ui` featuring a visual drop zone, drag-and-drop active state, fallback file-picker click trigger, MIME/extension filtering (`accept`), size bounds (`maxSizeBytes`), and selected file display with removal control.

### Delivered Capabilities

`libs/ui/src/file-uploader/FileUploader.tsx`, styles/variants, clear/remove action, keyboard trigger, invalid file/size error callbacks, Storybook story, and Vitest suite.

---

## [DSM-00348] Keep access tokens out of SSE URLs and request logs

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00173`

### Summary

EventSource cannot send an `Authorization` header, so the web app passes the access token as `?token=` on `GET /api/v1/realtime/sse`. Fastify's request logging records the full URL, so every SSE connection writes the operator's JWT in clear text to DSM's request log (verified in `DSM-00173` QA); URLs can also persist in proxy and browser history. Replace the token in the URL with a short-lived, single-use SSE ticket, and make sure no credential appears in request logs.

### Delivered Capabilities

`POST /api/v1/realtime/ticket` (authenticated) returning a single-use ticket valid for seconds; `/realtime/sse?ticket=` accepting it once; the web realtime connection (`DSM-00173`) and the Steam challenge hook requesting a ticket per (re)connect; request-log serializer redacting `token` / `ticket` query values; removing `?token=` support from `fastify.authenticate`; tests including a log assertion.

---

## [DSM-00206] Stream the active RPT log over SSE

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00162`

### Summary

While a server runs, the backend tails its newest `.RPT` file in the profiles directory and broadcasts new lines as `server.log` SSE events, keeping the last N lines in a bounded buffer that `GET /api/v1/servers/:id/logs/rpt` returns for the initial load.

### Delivered Capabilities

File locator, tail from offset, bounded buffer, event and contract, tests with temp files.

---

## [DSM-00173] Shared web SSE subscription that updates the query cache

- **Type**: `Task`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

The web app opens one authenticated EventSource to `/api/v1/realtime/sse` per tab, reconnects with backoff, and routes typed events into the TanStack Query cache, starting with `server.status.changed`. It closes on sign-out.

### Delivered Capabilities

Subscription provider/hook; event-to-cache mapping for server status; reconnect backoff; close on sign-out; tests with a fake EventSource.

---

## [DSM-00172] Restart the active server from the UI

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00171, DSM-00168`

### Summary

A Restart control reuses the stop dialog's delay choice and restarts the server, telling the operator which phase failed if it does.

### Delivered Capabilities

Control, toasts, tests and live QA.

---

## [DSM-00171] Gracefully stop the active server with a delay choice

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00164, DSM-00167`

### Summary

A Stop control opens a dialog to stop now or after a chosen delay with an in-game warning, and lets the operator cancel a pending delayed stop. If RCON is unreachable the error points to force-stop as the remaining option.

### Delivered Capabilities

Stop dialog with delay presets, pending-stop indicator with cancel, toasts, tests.

---

## [DSM-00170] Force-stop the active server with a warning confirmation

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00164`

### Summary

A Force-stop control kills the active server after a confirmation warning that unsaved world progress will be lost; results toast per the feedback contract.

### Delivered Capabilities

Control, confirmation dialog, toasts, tests.

---

## [DSM-00169] Start the active server from the UI

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00164`

### Summary

A Start control starts the active server with a green toast on success and a red toast on any API error. When start is impossible the control stays focusable but disabled and says why (config edit lock held, launch command not ready, transition in progress).

### Delivered Capabilities

Start control, disabled reasons, feedback contract (`GEMINI.md` §5), tests and live QA.

---

## [DSM-00168] Restart a server (graceful stop, then start)

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00167`

### Summary

`POST /api/v1/servers/:id/restart` runs the graceful stop (with optional delay) and then a start, reporting a failure in either phase with its own error code. A restart during another transition is refused.

### Delivered Capabilities

Restart route, phase-specific error codes, delay passthrough, tests.

---

## [DSM-00167] Delay a graceful stop with an in-game warning and cancellation

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00163`

### Summary

A stop request may carry `delaySec`: DSM broadcasts an in-game warning (`#say -1`), waits, then runs the graceful stop. The pending stop can be cancelled; the server stays `running` while it waits.

### Delivered Capabilities

`delaySec` on the stop request; warning broadcast; cancel endpoint; one pending stop per server (`409` on a second); fake-clock tests.

---

## [DSM-00165] Send an RCON command and receive its full response

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00161`

### Summary

After login, the client sends a command with a sequence number and resolves with the complete response text, reassembling multi-part responses. An unacknowledged command is retried a bounded number of times and then fails with a typed timeout.

### Delivered Capabilities

Sequence numbering (0–255 wrap), acknowledgement matching, multi-part reassembly, bounded retry and timeout; fake-server tests including dropped packets.

---

## [DSM-00164] Show live server status in the shell

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00162, DSM-00173`

### Summary

The shell shows the active server's lifecycle status (`stopped`, `starting`, `running`, `stopping`, `failed`) and, after an unexpected exit, the last-exit reason, updated live from `server.status.changed` without reloading.

### Delivered Capabilities

Status presentation in the shell header / server selector; last-exit reason; cache update via the shared SSE subscription; tests.

---

## [DSM-00163] Gracefully stop a running server via RCON #shutdown

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00162, DSM-00165`

### Summary

`POST /api/v1/servers/:id/stop` sends RCON `#shutdown` so persistence is flushed, waits for exit, and force-kills through `ProcessManager` only when the watchdog timeout expires; the fallback is recorded in the last-exit record. If RCON is unreachable the request fails with a dedicated error code and nothing is killed.

### Delivered Capabilities

Stop route and error codes; watchdog timeout setting; last-exit reason distinguishing graceful exit from fallback kill; tests with a fake RCON server and fake `ProcessManager`.

---

## [DSM-00162] Server Lifecycle State Machine, Start, and Force-Stop

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00124, DSM-00125, DSM-00160`

### Summary

Own the server status machine (`stopped → starting → running → stopping → stopped`, plus `crashed` on unexpected exit) with serialized transitions per server. `POST /api/v1/servers/:id/start` compiles the launch command (`DSM-00125`, refusing when `ready` is false), calls `assertNoActiveEditLock` (`DSM-00124`) and spawns via `ProcessManager`. Persist PID and start time; on DSM startup reconcile stored state with the OS (adopt, or mark crashed/stopped). `POST /api/v1/servers/:id/force-stop` kills the process tree.

### Delivered Capabilities

Status contract change (`crashed`), migration for PID / timestamps, lifecycle service, start and force-stop routes with error codes, startup reconciliation, concurrency guards (double start, start during stop).

---

## [DSM-00161] BattlEye RCON packet codec and login handshake

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

A BattlEye RCON (BE RCon v2, UDP) client library frames and parses packets with CRC32 and logs in to a server, returning a typed result for success, wrong password, and no answer. The RCON password is never logged.

### Delivered Capabilities

Packet encode/decode with CRC32 validation; login request/response; typed errors (`login_failed`, `timeout`, `unreachable`); tests against an in-process fake BattlEye UDP server.

---

## [DSM-00160] ProcessManager Platform Adapter (Windows Process Tree / Linux Process Groups)

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Provide the `ProcessManager` interface and its Windows and Linux implementations (`BACKEND_SPEC.md` §3). Spawn an executable from an argument array with `shell: false` and an explicit working directory, expose the PID, exit code / signal and exit events, capture or discard stdio without blocking, and terminate the whole process tree on demand. Linux: dedicated process group (`detached: true`) and group signalling (`SIGTERM`, then `SIGKILL`). Windows: tree termination that holds even if DSM crashes (Job Object with kill-on-close, or a documented fallback).

### Delivered Capabilities

Interface, two adapters and a platform factory; process-tree force-kill; liveness check by PID; integration tests spawning a real child Node process (with a grandchild) on the CI platform.

---

## [DSM-00138] Unsaved-Changes Navigation Guard for Create/Update Forms

- **Type**: `Story`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00137`

### Summary

When an update form has unsaved changes (as defined by `DSM-00137` change tracking), warn the admin before the change is lost: a confirmation dialog on in-app route changes (TanStack Router blocker) and the browser's native prompt on tab close/reload (`beforeunload`).

### Delivered Capabilities

Route-change blocking with a `Confirmation` dialog; `beforeunload` for tab close; reuse of the `DSM-00137` change state.

---

## [DSM-00137] Form UX Conventions: Change-Aware Save, Submit-Time Validation, Inline Errors, and Result Toasts

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105, DSM-00108`

### Summary

Make every create/update form behave consistently: the save/update control is disabled while the form has no changes relative to the last saved values; validation runs when the admin tries to save and then re-validates live; every invalid field (client or server `fieldErrors`) is highlighted with a specific message and the first one receives focus; every server-side create/update/save ends in a green or red toast. The conventions are enforced by QA via `GEMINI.md` §5.

### Delivered Capabilities

- Shared change-tracking / submit-validation / focus-first-invalid hook in `apps/web/src/core`.
- Adoption in `ServerSettingsForm`, `SteamSettingsView`, `ProfileIdentityCard`, `PasswordRotationCard`, `EditModModal`, `CreateServerModal`, `AddModModal` (Local Mod); verification of `ServerConfigCard`.
- "No changes to save" tooltip on disabled submit controls; tests per form.

---

## [DSM-00136] Shared CodeMirror 6 `CodeEditor` with Inline Diagnostics and Read-Only Ranges

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105`

### Summary

Deliver a reusable, lazily-loaded `CodeEditor` component in `libs/ui` built on CodeMirror 6, serving as the single text-editing surface for game configuration files across the console (`serverDZ.cfg` in `DSM-00124`, Central Economy XML in `DSM-00120`, future JSON views). The component accepts a pluggable language extension, renders externally supplied diagnostics inline (gutter markers, underlines, hover messages) with `error | warning` severity, supports protected read-only ranges (e.g. DSM-managed secret lines), a global read-only mode, and consumes semantic Aegis CSS variables so all 12 themes render correctly without hardcoded colors.

### Delivered Capabilities

- `CodeEditor` controlled component (`value`, `onChange`, `language`, `diagnostics`, `readOnly`, `readOnlyRanges`, `containerClassName`) with React 19 `ref` prop exposing an imperative handle (focus, scroll-to-line).
- Route-level code splitting so CodeMirror never enters the main bundle.
- Aegis theme extension mapped to CSS variables; line numbers, bracket matching, search, undo history.
- Lightweight `StreamLanguage` mode for Bohemia `.cfg` syntax (comments, strings, numbers, `class` blocks).
- Storybook CSF3 stories and Vitest/RTL tests.

---

## [DSM-00135] DayZ 6-Pair Theme Palette System (Cold, Neutral, Warm) and 3x2 Selector Grid

- **Type**: `Story`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00110, DSM-00134`

### Summary

Replace the near-identical cool-blue theme clones with 6 distinct DayZ-inspired light/dark theme pairs organized evenly into 2 Cold (`Namalsk Day`/`Namalsk Night` preserving the `vanilla`/`obsidian` color schemes, `Frostline Day`/`Sakhal Night`), 2 Neutral (`Chernarus Overcast`/`Tisy Bunker`, `Livonia Clearing`/`Nadbor Pine`), and 2 Warm (`Badlands Sun`/`Badlands Dusk`, `Krasno Dawn`/`Signal Flare`) palettes. Preserve pure `#ffffff` card surfaces across light themes while tinting canvas, sidebar, subtle wells, borders, and accents with $\ge 4.5:1$ WCAG AA contrast, and upgrade `ThemeSelectorCard` to a balanced 3x2 (`lg:grid-cols-3`) grid with legacy `localStorage` ID migration.

### Delivered Capabilities

- Complete 12-theme CSS variable definitions in `libs/ui/src/styles/themes.css` and synchronized Storybook toolbar items (`libs/ui/.storybook/preview.tsx`).
- Updated `lightThemeIdSchema` / `darkThemeIdSchema` and legacy ID preprocessing in `apps/web/src/features/theme/theme.types.ts`.
- Updated `LIGHT_THEMES` / `DARK_THEMES` metadata (`useThemePreference.ts`), 3x2 `ThemePaletteGrid` (`ThemeSelectorCard.tsx`), and compact per-theme splash backgrounds in `apps/web/index.html` within the 4KB `GUARD-01` budget.
- Updated unit tests across `ThemeProvider.test.tsx`, `useThemePreference.test.ts`, `ThemeSelectorCard.test.tsx`, and `splash.spec.ts`.

---

## [DSM-00134] Aegis Theme Token Resolution (`@theme inline`), Contrast Hardening, and Transition Freeze

- **Type**: `Bug`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105, DSM-00106, DSM-00110`

### Summary

Resolve systemic Tailwind v4 `@theme` `:root` scoping leaks, hardcoded `text-white` overrides on dark accents, missing `--color-info*`/`--color-success-fg`/`--color-surface-elevated` tokens, translucent dark toasts, undefined CSS variables (`--color-primary-subtle`, `--color-danger-soft`, `ui-card`), and theme-toggle color smearing identified during live Playwright + semantic redline audits.

### Delivered Capabilities

- `@theme inline` migration in `libs/ui/src/styles/theme.css` and root `data-theme` synchronization in Storybook (`StorybookThemeFrame`).
- Semantic `*-fg` foreground tokens across `Button`, `Tag`, `StatusTag`, `NotificationMenu`, `Pagination`, `TagSelect`, `DatePicker`, and `RootFallback`, plus opaque base backing on `CustomToast`.
- Cleanup of undefined tokens, raw Tailwind palette leaks, and chrome emojis across `apps/web` and `libs/ui`.
- 1-frame `.theme-switching` transition freeze in `ThemeProvider` and replacement of all 17 `transition-all` declarations with explicit compositor/color transitions.

---

## [DSM-00132] Animated Unread Notification Bell, Notification Store, and Popup Positioning

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105, DSM-00108, DSM-00121`

### Summary

Replace the static header notification bell with a live `NotificationMenu` backed by a bounded client notification store (`notification.store.ts`) bridged from toast dispatches (`notify.ts`). Add a `prefers-reduced-motion`-safe bell-ring keyframe animation when unread notifications exist, deliver a persisted per-user FAQ greeting notification in `Header`, and eliminate popup coordinate fly-in glitches in `usePopup` via compositor `popup-enter` animation and pre-placement display deferral.

### Delivered Capabilities

- Bounded client notification store (`notification.store.ts`), toast-to-notification bridge (`notify.ts`), and per-user FAQ greeting persistence (`greeting.storage.ts`).
- Animated unread bell keyframes (`keyframes.css`), `NotificationMenu` unread/action wiring, and `Header` integration.
- `usePopup` coordinate reset on close, `offsetWidth` placement lock, and compositor `popup-enter` animation with full Vitest test suites.

---

## [DSM-00131] Multi-Agent SKILL.md Presets, UI/UX Design, and Security Audit Workflows

- **Type**: `Task`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Migrate workspace agent skills into standardized `.agents/skills/*/SKILL.md` directories, wire `.agents/skills.json` to `sdlc-skills-repo` presets, and introduce DSM-specific `ui-ux-design` and `security-audit` skill specifications synchronized with `.github/copilot-instructions.md`.

### Delivered Capabilities

- Migration of `code-convention`, `code-review`, `feature-implementation`, `react-styleguide`, `tests-implementation`, `typescript-styleguide`, and `webapp-testing` to `SKILL.md` folders.
- New `.agents/skills/ui-ux-design/SKILL.md` (Aegis `h-9` geometry, dual-theme tokens, 9-pass redline protocol) and `.agents/skills/security-audit/SKILL.md`.
- Updated `.agents/skills.json` and `.github/copilot-instructions.md`.

---

## [DSM-00130] Multi-Line Release History Sync and Static Content Parser Hardening

- **Type**: `Bug`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00121`

### Summary

Harden `scripts/sync-static-content.ts` so `history.md` generation reliably preserves multi-line nested Markdown bullet lists, blank lines, CRLF normalization, and single trailing EOF newlines across consecutive runs. Ensure `parseDoneBacklogItems` also handles annotated `DONE` status suffixes and parenthetical scope qualifiers (`Included (...)` / `Excluded / Deferred (...)`) without silently dropping merged PBIs.

### Delivered Capabilities

- Multi-line block extraction (`extractContinuationLines`, `dedentBlockLines`), CRLF/LF normalization, and idempotent `history.md` output in `scripts/sync-static-content.ts`.
- Support for annotated `DONE` statuses and parenthetical `Included (...)` / `Excluded / Deferred (...)` labels in `parseBacklogSection` and `parseScopeField`.
- Comprehensive Vitest unit coverage in `scripts/__tests__/sync-static-content.spec.ts`.

---

## [DSM-00129] Toolchain Modernization, Parallel CI/PR Workflows, and Automated PR Summary

- **Type**: `Task`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Upgrade critical runtime, security, Storybook 10.x, ESLint, and Vitest dependencies with exact version pinning, split CI and PR validation pipelines into parallel check jobs with job-scoped Nx caching and path filters, fix cycle-check path alias resolution, and modernize the automated PR architectural summary generator script.

### Delivered Capabilities

- Dependency updates across `package.json` and `pnpm-lock.yaml`, plus shared `.github/actions/setup-workspace/action.yml`.
- Parallelized `.github/workflows/ci.yaml` and `.github/workflows/pr-validation.yaml` pipelines, CodeQL/Sonar/Storybook workflow hardening, and removal of redundant `sonar-fork-pr.yaml`.
- Updated `.github/scripts/generate-pr-summary.cjs` and `.github/scripts/normalize-lcov.cjs`, plus cycle-check path alias fixes (`Header.tsx`).

---

## [DSM-00128] Aegis Console Rebrand, Namespace Migration (`@aegis/*`), and Brand Header Interaction

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00101, DSM-00105`

### Summary

Rebrand the workspace and runtime console from `@dsm/*` / Outlive to `@aegis/*` / Aegis Console across `apps/web`, `apps/server`, `libs/*`, TypeScript path mappings, Vite/Vitest/Storybook resolvers, and agent documentation. Clean up the footer layout by removing the duplicate animated logo and elevate the brand header lockup into a `/dashboard` navigation link featuring an SVG-isolated 3D hover animation easter egg.

### Delivered Capabilities

- Full package/import migration from `@dsm/*` to `@aegis/*` across `tsconfig.base.json`, `eslint.config.js`, `libs/ui/package.json`, `apps/web`, `apps/server`, and `libs/*`.
- Aegis Console branding across `index.html`, `Sidebar`, and `libs/ui` stories.
- SVG-isolated `.aegis-logo.animate-on-hover:hover` 3D rotation easter egg, clickable `/dashboard` brand header link with mobile drawer close, and duplicate footer logo removal.

---

## [DSM-00126] Steam Integration Workbench, Interactive Authentication, and Credential Vault

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105, DSM-00107, DSM-00108`

### Summary

Deliver the dedicated Steam integration workbench at `/settings/steam` in `apps/web` alongside backend SteamCMD process orchestration, encrypted credential storage, and reactive Steam Guard handling. Enable operators to configure SteamCMD binary paths (`steamCmdPath`), high-capacity workshop storage directories (`steamWorkshopPath`), metadata caches (`steamMetaPath`), and DayZ Steam application IDs (vanilla server `223350`, experimental server `1042420`, workshop content `221100`). Manage authenticated Steam sessions securely by storing passwords with AES-256-GCM encryption in SQLite (`steam_settings` table) and caching SteamCMD session tickets (`ssfn` / `config.vdf`) to prevent plaintext exposure. Reactively handle Steam Guard 2FA by monitoring child process stdout for both 5-character OTP prompts and Steam Mobile App push confirmations, dispatching info toast notifications and presenting an interactive challenge modal to complete verification.

### Delivered Capabilities

- Dedicated route `/settings/steam` with grouped configuration cards (Account & Authentication, Storage Paths & SteamCMD Runtime, Application IDs & Branch Selection), `Fingerprint` session banner/actions, and dynamic Workshop storage partition capacity `ProgressBar`.
- Dual-Scope Navigation (`server` vs. `appliance`) with a single polymorphic `Sidebar`, contextual top switcher (`<ServerSelector />` vs. `[ ← Server Name ]`), appliance breadcrumbs, and search query parameter isolation.
- Zod API contracts and DTO schemas in `libs/api-contracts` (`SteamSettingsDto`, `UpdateSteamSettingsDto`, `SteamChallengeEventDto`, `SteamChallengeResponseDto`, `SteamChallengeAbortDto`, `SteamDiagnosticsResultDto`, `StorageStats`).
- Encrypted credential vault using AES-256-GCM in SQLite (`steam_settings` singleton table in `libs/database`) with hybrid master key resolution (`STEAM_VAULT_KEY` / `DSM_VAULT_KEY` / `.vault.key`) and atomic TOCTOU-safe key generation (`flag: 'wx'`).
- Defensive timestamp self-healing in migration `0004_steam_settings` and `toSafeIsoDate` route guard.
- Fastify REST controllers in `apps/server` (`GET /api/v1/settings/steam`, `PATCH /api/v1/settings/steam`, `POST /api/v1/settings/steam/session/login`, `POST /api/v1/settings/steam/session/clear`, `POST /api/v1/settings/steam/challenge/respond`, `POST /api/v1/settings/steam/challenge/abort`, `POST /api/v1/settings/steam/diagnostics`).
- Headless SteamCMD runner (`apps/server/src/services/steam/steam-runner.service.ts`) with cached session ticket prioritization, bidirectional `stdin`/`stdout` streams, timeout guards (90s challenge extension), process tree termination, and dual Steam Guard detection (5-character OTP vs Mobile App push).
- Real-time Server-Sent Events (`/api/v1/realtime/sse`) broadcasting Steam challenge and session status events to the reactive Steam Guard modal and diagnostics/toast notifications in `apps/web`.

---

## [DSM-00125] DayZ CLI Launch Parameter Compiler and Process Execution Contract

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00124`

### Summary

Construct a sanitized, OS-agnostic command-line argument compiler that transforms server configuration, port allocations, profile paths, engine flags (`-doLogs`, `-adminLog`, `-freezeCheck`, `-scriptDebug`), and CPU/FPS clamps into a clean argument array (`string[]`) ready for `child_process.spawn()`. Enforce strict input validation preventing shell parameter injection, path traversal, or unescaped characters, and expose an inspection endpoint/helper allowing administrators to preview the exact compiled command line before launching.

### Delivered Capabilities

Strongly typed launch argument compiler; sanitization against argument injection; compilation of standard Bohemia server flags (`-config=`, `-port=`, `-profiles=`, `-cpuCount=`, `-limitFPS=`); CLI preview DTO and REST endpoint.

---

## [DSM-00124] serverDZ.cfg Raw Editor, Validator, Edit Locks, Revisions, and BattlEye Sync

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00123, DSM-00136`

### Summary

Replace per-field gameplay UI controls with a raw text editor for `serverDZ.cfg`: the physical file is the source of truth for every key it contains (including plaintext `password` and `passwordAdmin`), while the database keeps only a read-only parsed projection for `steamQueryPort` and `maxPlayers` (`servers.missionPath` stays DB-owned and is edited via the `Active Mission` `<Select id="missionPath">` dropdown in `StoragePathsCard`, not overwritten from `serverDZ.cfg` `template`). `hostname` lives only in `serverDZ.cfg` and is decoupled from the internal DSM server `name`; the game port remains a DB-owned launch parameter (`-port=`, `DSM-00125`). Under the admin-only operator model (`'admin'` single role in Zod contracts, SQLite migration `0008_admin_only_and_unredacted_revisions`, and `apps/web` UI while preserving fail-closed `ensureAdminRole` / `requireAdmin` + `AUTH_FORBIDDEN_ADMIN_REQUIRED` backend JWT invariants), secrets in `serverDZ.cfg` are edited unmasked without sentinel redaction, `SecurityCredentialsCard` is removed, and decrypted `rconPassword: string | null` (`serverDetailSchema`, `500 VAULT_KEY_UNAVAILABLE` on vault error) is managed via `#server-rcon-password` in `Network & BattlEye RCON`. Editing `serverDZ.cfg` is allowed only while the server is stopped and opens read-only by default (`CodeEditor` `aria-readonly="true"`, `EditorView.editable.of(false)`) until clicking `Edit` acquires a pessimistic per-editor-session DB lease lock with TTL and heartbeat (`Done` restores read-only state); server start is blocked while a lock is held. Every committed write is recorded as a plaintext revision (`server_config_revisions.content`) with author, timestamp, and source. The BattlEye RCON file (`beserver_x64.cfg` / `beserver.cfg` in `<profilePath>/BattlEye/`) remains DSM-generated from `RConPassword`, `RConPort`, and `RConIP`.

### Delivered Capabilities

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

---

## [DSM-00123] Server Filesystem Inspector and Mission Discovery Service

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Build a dedicated server filesystem inspection and validation engine in `apps/server` (via `libs/platform`). Verify the physical existence and binary execution permissions of the DayZ server executable (`DayZServer_x64.exe` on Windows, `DayZServer` on Linux) under `installPath`. Automatically scan and discover installed missions under `mpmissions/` (e.g. `dayzOffline.chernarusplus`, `dayzOffline.enoch`, `dayzOffline.sakhal`), inspect the profile directory structure (`profiles/`, `profiles/BattlEye`), and verify OS write permissions. Expose validation REST endpoints (`POST /api/v1/servers/:id/validate-paths`) returning structured diagnostic issue reports for missing directories, invalid binaries, or permission errors.

### Delivered Capabilities

Filesystem validator inspecting `installPath`, executable binary presence, profile structure, and mission folders; auto-discovery of valid DayZ missions; REST endpoint and Zod contract for server path validation; diagnostic issue codes (`MISSING_EXECUTABLE`, `MISSING_MISSION`, `PERMISSION_DENIED`).

---

## [DSM-00121] Static Documentation Pipeline, FAQ Modal, and Release History Integration

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105`

### Summary

Establish an automated static documentation packaging pipeline and deliver an accessible in-app FAQ / Help modal in `apps/web`. Maintain root `faq.md` as the single source of truth for DayZ operator cheatsheets, referenced directly in `README.md` alongside release version history links. Implement `scripts/sync-static-content.ts` to copy `faq.md` and dynamically generate `history.md` from `BACKLOG.md` into `apps/web/public/assets/content/`. Deliver `FaqModal` in `apps/web` rendering formatted markdown via `marked` with instant keyword search filtering, triggered via the header `(?)` button and keyboard shortcut (`Shift + ?`).

### Delivered Capabilities

Root `faq.md` cheatsheet; `README.md` references to FAQ and version history; `scripts/sync-static-content.ts` asset sync and history generator; pre-build integration in `apps/web`; `useStaticDoc` TanStack Query hook; accessible `FaqModal` with `marked` rendering and search filtering; header `(?)` button integration.

---

## [DSM-00119] Steam Workshop Mod Management, Load Order, and Key Distribution (Phase 1)

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105, DSM-00126`

### Summary

Deliver the foundational mod lifecycle workbench at `/mods` alongside Steam Workshop lookup/search APIs and server-scoped mod persistence (`server_mods` SQLite schema & migration `0005`). Provide drag-and-drop and keyboard load order sequencing (`useSortableList`), batch/local/Workshop mod CRUD, encrypted Steam Web API key storage (`steam_settings`), upstream Workshop update detection, sortable columns with column visibility persistence, and a read-only `-mod=` / `-serverMod=` launch parameter preview.

### Delivered Capabilities

- Server-scoped mod inventory (`server_mods` SQLite schema & migration `0005`) and Zod contracts/client endpoints in `libs/api-contracts` and `libs/api-client`.
- Steam Workshop item/collection lookup, keyword search, and encrypted Steam Web API key storage in `steam_settings`.
- Interactive `/mods` workbench with single/batch/local mod CRUD (`AddModModal`, `EditModModal`), upstream update detection & sync acknowledgement, drag-and-drop/keyboard load order sequencing (`useSortableList`), sortable columns, column configurator, and read-only `-mod=` / `-serverMod=` launch flag preview.

---

## [DSM-00110] Dual Visual Theme Palette and Dynamic Style Switching

- **Type**: `Story`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105, DSM-00109`

### Summary

Provide a theme selection engine supporting paired light and dark palettes (e.g. Vanilla and Obsidian) with live theme switching without page reloads. Deliver `ThemeSelectorCard` within the Personal Settings workbench displaying interactive palette swatches, system preference synchronizers, and instant DOM attribute updates. Ensure operator theme preferences are persisted across browser sessions via local storage and synchronized with the backend operator profile record.

### Delivered Capabilities

- Semantic CSS custom property tokens and `data-theme` definitions in `libs/ui/src/styles/{theme.css,themes.css}`.
- React theme state & toggle (`apps/web/src/features/theme/{ThemeProvider.tsx,theme.context.ts,theme.types.ts,ThemeToggleButton.tsx}`).
- Persistence hook (`apps/web/src/features/profile/hooks/useThemePreference.ts`) and `ThemeSelectorCard` (`apps/web/src/features/profile/components/ThemeSelectorCard.tsx`) in `/profile`.

---

## [DSM-00109] Personal Settings Workbench and Stateful Active Sessions

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00107, DSM-00108`

### Summary

Implement the Operator Profile and Personal Settings workbench (`/profile`) allowing logged-in operators to manage their credentials and regional preferences. Provide `ProfileIdentityCard` for editing callsign (display name), notification email, regional timezone, and 12h/24h time formatting. Include `PasswordRotationCard` with strict complexity requirements and a real-time password strength meter, alongside `ActiveSessionsCard` displaying stateful session tokens, parsed user-agent device signatures, client IP addresses, and remote session revocation controls.

### Delivered Capabilities

- SQLite migration `0003_profile_and_sessions` (`users.display_name`, `timezone`, `time_format` + `sessions` table in `libs/database/src/lib/migrations.ts`).
- Zod contracts (`profile.contract.ts`, `session.contract.ts`), client endpoints (`endpoints/{profile.ts,sessions.ts}`), and Fastify routes (`/api/v1/profile`, `/api/v1/auth/profile`, `/api/v1/auth/sessions` in `apps/server/src/routes/{profile.ts,sessions.ts}` + `utils/user-agent.ts`).
- Frontend workbench at `/profile` (`apps/web/src/features/profile/{views/ProfileView.tsx,api/profile.queries.ts,api/profile.mutations.ts}`, `components/{ProfileIdentityCard.tsx,PasswordRotationCard.tsx,PasswordStrengthBar.tsx,ActiveSessionsCard.tsx}`).

---

## [DSM-00108] Unified Toast Notification Dispatcher and Error Translation

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105`

### Summary

Establish a unified toast notification architecture that transforms low-level REST errors and asynchronous operational mutations into clear, user-facing feedback toasts. Define structured API error contracts (`ApiErrorCode`, `ApiErrorParams`, `ApiFieldErrorsMap`) in `libs/api-contracts` and emit structured error payloads from Fastify route handlers. Mount a global `Toaster` component in `apps/web`, integrate `i18next` localized error dictionaries, and provide high-level notification helpers (`notifySuccess`, `notifyApiError`, `showToast`) that wire directly into TanStack Query mutations and form validation bindings.

### Delivered Capabilities

- Structured error envelope & `ApiErrorCode` registry (`libs/api-contracts/src/lib/error.contract.ts`) plus Fastify helpers (`sendApiError`, `formatZodFieldErrors` in `apps/server/src/utils/api-error.ts`).
- Toast primitives in `libs/ui/src/toast/{Toaster.tsx,CustomToast.tsx,toast.utils.tsx}`.
- Frontend `i18next` error dictionaries (`apps/web/src/core/i18n/{i18n.ts,locales/en-US.ts}`) and notification dispatchers (`notifySuccess`, `notifyApiError`, `showToast` in `apps/web/src/core/notifications/notify.ts`).

---

## [DSM-00107] Operator Authentication and Secure Sign-In Experience

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105`

### Summary

Deliver an end-to-end authentication and operator login workflow securing the DSM management console. Provide Fastify authentication REST endpoints (`/api/v1/auth/login`, `/api/v1/auth/logout`) with SQLite operator verification and secure `scrypt` password hashing. Build the dedicated `/sign-in` view in `apps/web` featuring the Outlive branded `SignInHero`, react-hook-form + Zod validated `SignInForm`, client-side `AuthProvider` session state, and TanStack Router `beforeLoad` redirection guards.

### Delivered Capabilities

- Zod contracts (`libs/api-contracts/src/lib/auth.contract.ts`) and SDK client (`libs/api-client/src/lib/endpoints/auth.ts`).
- Fastify endpoints in `apps/server/src/routes/auth.ts` (`POST /api/v1/auth/login` rate-limited `10 / 1 min`, `/refresh`, `/logout`), `scrypt` helpers + `0001_initial_users` migration (`libs/database`), and JWT + stateful session check (`fastify.authenticate` in `apps/server/src/app/app.ts`).
- Frontend `/sign-in` workbench (`apps/web/src/features/auth/{SignIn.tsx,AuthProvider.tsx,auth.storage.ts,signIn.schema.ts}`, `components/{SignInHero.tsx,SignInForm.tsx}`) and TanStack Router `beforeLoad` guards (`apps/web/src/router.tsx`).

---

## [DSM-00106] Storybook Component Catalog and Interactive Documentation

- **Type**: `Task`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105`

### Summary

Establish an interactive Storybook environment for `libs/ui` that acts as a living style guide and visual documentation catalog for all design system primitives. Build dedicated story files for each UI component covering variant matrices, responsive viewports, state modifiers (hover, focus, disabled, loading), and dynamic theme token rendering. Configure static asset delivery to properly display brand imagery and iconography across stories.

### Delivered Capabilities

- Storybook Vite setup in `libs/ui/.storybook/{main.ts,preview.tsx,StorybookThemeFrame.tsx}`.
- Interactive CSF3 `.stories.tsx` suites colocated across all `libs/ui/src/*` component directories with Controls table bindings.

---

## [DSM-00105] Outlive Design System UI Kit Component Library

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Implement a cohesive, accessible, and lightweight design system component library (`libs/ui`) aligned with the Outlive pastel visual tokens. Provide foundational interactive primitives (`Button`, `Input`, `PasswordInput`, `Checkbox`, `Toggle`, `Select`, `Tag`, `TagInput`, `TagSelect`, `StatusTag`, `Badge`), feedback containers (`Card`, `HeroBanner`, `Notice`, `ProgressBar`, `Skeleton`, `Tooltip`, `EmptyState`, `KpiCard`), data presentation surfaces (`Tabs`, `Pagination`, `Breadcrumbs`, `Table`, `TableBulkActions`, `TableColumnVisibility`), and safety dialogs (`ConfirmationDialog`, `KeywordConfirmationDialog`). Ensure every component satisfies WCAG contrast, ARIA specifications, keyboard focus management, and comprehensive Vitest unit tests.

### Delivered Capabilities

- Reusable component library exported from `libs/ui/src/index.ts` (`autosuggest`, `breadcrumbs`, `button`, `card`, `checkbox`, `confirmation`, `date-picker`, `empty-state`, `hero-banner`, `input`, `kpi-card`, `loader`, `menu`, `notice`, `notification-menu`, `pagination`, `progress-bar`, `select`, `skeleton`, `status-tag`, `table`, `tabs`, `tag`, `tag-input`, `toast`, `toggle`, `tooltip`).
- Shared UI hooks (`libs/ui/src/hooks/{useDebounce.ts,usePopup.ts,useSortableList.ts}`) and design tokens/keyframes (`libs/ui/src/styles/{theme.css,themes.css,keyframes.css,fonts.css}`).
- Vitest + React Testing Library specs alongside every primitive in `libs/ui/src/**`.

---

## [DSM-00104] Full-Stack Monorepo Architecture and Application Bootstrapping

- **Type**: `Task`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

Establish the foundational Nx monorepo architecture, developer tooling, and baseline application runtime shells for the DSM platform. Configure the Fastify backend server (`apps/server`) with environment schema validation, healthcheck probes (`/api/v1/health`), and modular Drizzle ORM database decorators. Configure the React 19 single-page application (`apps/web`) with Vite, TanStack Router topology, TanStack Query client, Tailwind CSS, and strict cross-package compile-time boundary enforcement (`libs/api-contracts`, `libs/api-client`, `libs/database`).

### Delivered Capabilities

- Nx + `pnpm` workspace setup (`nx.json`, `tsconfig.base.json`, `package.json`) with module boundary enforcement and `check:cycles` (Madge).
- Fastify backend bootstrap (`apps/server/src/main.ts`, `app/app.ts`, `config/env.ts`) and health endpoint (`GET /api/v1/health` in `apps/server/src/routes/health.ts`).
- Drizzle ORM + `better-sqlite3` WAL persistence and `runMigrations()` (`libs/database/src/lib/{db.ts,migrations.ts,schema.ts}`).
- Shared Zod contracts (`libs/api-contracts`), type-safe fetch client (`libs/api-client/src/lib/http-client.ts`), and React 19 + TanStack Router/Query shell (`apps/web/src/router.tsx`, `core/query/query-client.ts`).

---

## [DSM-00103] Seamless In-App Bootstrapping and Route Transition Continuity

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00101`

### Summary

When the JavaScript bundle finishes bootstrapping React, TanStack Router, and TanStack Query, the visual experience transitions smoothly from the pre-bootstrap splash into the application shell. The in-app root pending fallback (`RootLoader`) is aligned with the animated Aegis logo identity to prevent layout shift or generic spinner regressions while initial authentication or route data resolves. A subtle reveal/fade transition eliminates abrupt visual jumps as the final UI renders.

### Delivered Capabilities

- `RootLoader` and `RootErrorFallback` in `apps/web/src/components/layout/RootFallback.tsx`.
- `AppErrorBoundary`, `InnerApp`, and `RouterProvider` context wiring (`{ auth, features }`) in `apps/web/src/App.tsx` and `apps/web/src/router.tsx`.

---

## [DSM-00102] Theme-Aware Pre-Bootstrap Loading State and Accessibility

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00101`

### Summary

When a user with an active dark theme preference or system dark mode launches the application, the pre-bootstrap splash screen displays matching background and logo palette colors instantly to prevent jarring white-screen flashes. The pre-bootstrap loader respects user motion preferences by disabling spinning 3D animations when reduced motion is preferred. Accessible labeling informs screen readers and assistive technology that the application is currently loading.

### Delivered Capabilities

- Synchronous pre-bootstrap script in `apps/web/index.html` reading `localStorage` (`dsm-theme-settings` / `dsm-theme-preference`) and setting `data-theme` on `documentElement` before first paint.
- Light/dark/preferred-scheme CSS custom properties (`--splash-bg`, `--splash-fg-main`, `--splash-fg-secondary`) plus `@media (prefers-reduced-motion: reduce)` animation suppression.
- Screen-reader accessible status semantics (`role="status"`, `aria-live="polite"`, `.sr-only`) on `#dsm-splash`.

---

## [DSM-00101] Instant Pre-Bootstrap Animated Splash Screen

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

When a user opens the application on slow network connections, an animated Aegis logo is displayed immediately in the center of the viewport before JavaScript bundles are downloaded and executed. The pre-bootstrap markup renders with critical self-contained styles to avoid any blank white screen or flash of unstyled content, providing clear visual confirmation that the application is launching. Once React mounts, the initial splash screen seamlessly yields to the mounting application root without visual breakage.

### Delivered Capabilities

- Critical inline SVG and CSS assets in `apps/web/index.html` (`#dsm-splash`, `.aegis-logo.is-loading`, `@keyframes aegis-tent-loading` / `aegis-bridge-loading` with `perspective: 900px`).
- Clean React root mounting handoff in `apps/web/src/main.tsx` (`__dsmRoot` replacing `#dsm-splash` inside `#root`).

---
