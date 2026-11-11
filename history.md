# Release History & Changelog

This document records all completed product backlog items and operational features deployed to the DayZ Server Manager (DSM) platform.

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

CSS custom property token definitions for light and dark palettes; React `ThemeProvider` and `useThemePreference` hooks; interactive `ThemeSelectorCard` in `/profile`; immediate DOM token updates and persistence.

---

## [DSM-00109] Personal Settings Workbench and Stateful Active Sessions

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00107, DSM-00108`

### Summary

Implement the Operator Profile and Personal Settings workbench (`/profile`) allowing logged-in operators to manage their credentials and regional preferences. Provide `ProfileIdentityCard` for editing callsign (display name), notification email, regional timezone, and 12h/24h time formatting. Include `PasswordRotationCard` with strict complexity requirements and a real-time password strength meter, alongside `ActiveSessionsCard` displaying stateful session tokens, parsed user-agent device signatures, client IP addresses, and remote session revocation controls.

### Delivered Capabilities

Operator profile REST endpoints (`/api/v1/profile`, `/api/v1/sessions`); frontend workbench at `/profile`; identity updating; password rotation with live strength feedback; active session list with current session indicator and revoke actions.

---

## [DSM-00108] Unified Toast Notification Dispatcher and Error Translation

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105`

### Summary

Establish a unified toast notification architecture that transforms low-level REST errors and asynchronous operational mutations into clear, user-facing feedback toasts. Define structured API error contracts (`ApiErrorCode`, `ApiErrorParams`, `ApiFieldErrorsMap`) in `libs/api-contracts` and emit structured error payloads from Fastify route handlers. Mount a global `Toaster` component in `apps/web`, integrate `i18next` localized error dictionaries, and provide high-level notification helpers (`notifySuccess`, `notifyApiError`, `showToast`) that wire directly into TanStack Query mutations and form validation bindings.

### Delivered Capabilities

API error contracts and Fastify structured error formatting; global toast container and stack management; `i18next` error and notification dictionary (`en-US`); field error mapping to form inputs.

---

## [DSM-00107] Operator Authentication and Secure Sign-In Experience

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104, DSM-00105`

### Summary

Deliver an end-to-end authentication and operator login workflow securing the DSM management console. Provide Fastify authentication REST endpoints (`/api/v1/auth/login`, `/api/v1/auth/logout`) with SQLite operator verification and secure `scrypt` password hashing. Build the dedicated `/sign-in` view in `apps/web` featuring the Outlive branded `SignInHero`, react-hook-form + Zod validated `SignInForm`, client-side `AuthProvider` session state, and TanStack Router `beforeLoad` redirection guards.

### Delivered Capabilities

Secure password verification via `scrypt`; session issuance and token storage; React `/sign-in` route with client validation and submission states; route authentication guards redirecting unauthenticated traffic.

---

## [DSM-00106] Storybook Component Catalog and Interactive Documentation

- **Type**: `Task`
- **Priority**: `P2 (Medium)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00105`

### Summary

Establish an interactive Storybook environment for `libs/ui` that acts as a living style guide and visual documentation catalog for all design system primitives. Build dedicated story files for each UI component covering variant matrices, responsive viewports, state modifiers (hover, focus, disabled, loading), and dynamic theme token rendering. Configure static asset delivery to properly display brand imagery and iconography across stories.

### Delivered Capabilities

Storybook Vite configuration and add-ons in `libs/ui/.storybook`; interactive `.stories.tsx` files for every UI component; documentation parameters and Controls table bindings.

---

## [DSM-00105] Outlive Design System UI Kit Component Library

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00104`

### Summary

Implement a cohesive, accessible, and lightweight design system component library (`libs/ui`) aligned with the Outlive pastel visual tokens. Provide foundational interactive primitives (`Button`, `Input`, `PasswordInput`, `Checkbox`, `Toggle`, `Select`, `Tag`, `TagInput`, `TagSelect`, `StatusTag`, `Badge`), feedback containers (`Card`, `HeroBanner`, `Notice`, `ProgressBar`, `Skeleton`, `Tooltip`, `EmptyState`, `KpiCard`), data presentation surfaces (`Tabs`, `Pagination`, `Breadcrumbs`, `Table`, `TableBulkActions`, `TableColumnVisibility`), and safety dialogs (`ConfirmationDialog`, `KeywordConfirmationDialog`). Ensure every component satisfies WCAG contrast, ARIA specifications, keyboard focus management, and comprehensive Vitest unit tests.

### Delivered Capabilities

Reusable UI component primitives and compound patterns in `libs/ui`; CSS custom property design tokens; keyboard accessibility and focus rings; 100% test-covered unit test suites.

---

## [DSM-00104] Full-Stack Monorepo Architecture and Application Bootstrapping

- **Type**: `Task`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

Establish the foundational Nx monorepo architecture, developer tooling, and baseline application runtime shells for the DSM platform. Configure the Fastify backend server (`apps/server`) with environment schema validation, healthcheck probes (`/api/v1/health`), and modular Drizzle ORM database decorators. Configure the React 19 single-page application (`apps/web`) with Vite, TanStack Router topology, TanStack Query client, Tailwind CSS, and strict cross-package compile-time boundary enforcement (`libs/api-contracts`, `libs/api-client`, `libs/database`).

### Delivered Capabilities

Monorepo scaffolding with Nx and pnpm workspaces; Fastify backend startup and healthcheck endpoint; React 19 client setup with TanStack Router context contracts; Zod API contracts and type-safe HTTP client boundary; SQLite WAL database connection setup.

---

## [DSM-00103] Seamless In-App Bootstrapping and Route Transition Continuity

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00101`

### Summary

When the JavaScript bundle finishes bootstrapping React, TanStack Router, and TanStack Query, the visual experience transitions smoothly from the pre-bootstrap splash into the application shell. The in-app root pending fallback (`RootLoader`) is aligned with the animated Aegis logo identity to prevent layout shift or generic spinner regressions while initial authentication or route data resolves. A subtle reveal/fade transition eliminates abrupt visual jumps as the final UI renders.

### Delivered Capabilities

Updating `RootLoader` and route pending fallbacks with the animated Aegis logo; smooth visual handoff between the HTML splash state and the interactive React root; graceful exit animations.

---

## [DSM-00102] Theme-Aware Pre-Bootstrap Loading State and Accessibility

- **Type**: `Story`
- **Priority**: `P1 (High)`
- **Status**: `DONE`
- **Dependencies**: `DSM-00101`

### Summary

When a user with an active dark theme preference or system dark mode launches the application, the pre-bootstrap splash screen displays matching background and logo palette colors instantly to prevent jarring white-screen flashes. The pre-bootstrap loader respects user motion preferences by disabling spinning 3D animations when reduced motion is preferred. Accessible labeling informs screen readers and assistive technology that the application is currently loading.

### Delivered Capabilities

Synchronous pre-bootstrap theme resolution (reading persisted storage or matching system `prefers-color-scheme`) in document head; dark/light theme CSS variables for the splash screen; `prefers-reduced-motion` compliance; accessible loading indicators and ARIA semantics.

---

## [DSM-00101] Instant Pre-Bootstrap Animated Splash Screen

- **Type**: `Story`
- **Priority**: `P0 (Critical)`
- **Status**: `DONE`
- **Dependencies**: `None`

### Summary

When a user opens the application on slow network connections, an animated Aegis logo is displayed immediately in the center of the viewport before JavaScript bundles are downloaded and executed. The pre-bootstrap markup renders with critical self-contained styles to avoid any blank white screen or flash of unstyled content, providing clear visual confirmation that the application is launching. Once React mounts, the initial splash screen seamlessly yields to the mounting application root without visual breakage.

### Delivered Capabilities

Critical inline SVG and CSS assets for viewport centering, responsive sizing, and 3D logo loading animation embedded directly in `index.html`; clean mounting handoff into `#root`.

---
