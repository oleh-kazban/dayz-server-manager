# Release History & Changelog

This document records all completed product backlog items and operational features deployed to the DayZ Server Manager (DSM) platform.

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
