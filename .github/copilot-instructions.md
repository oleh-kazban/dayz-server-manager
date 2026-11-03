# GitHub Copilot Instructions — DayZ Server Manager (DSM)

These instructions apply repository-wide for GitHub Copilot in the web interface (Pull Request summaries, reviews, chat) and in IDE extensions (VS Code, Copilot Chat).

---

## 1. Project Context & Architecture

**DayZ Server Manager (DSM)** is a self-hosted operations console and control plane for administering DayZ Dedicated Servers on Windows x64 and Linux x64.

- **Monorepo:** Nx monorepo with `pnpm` workspaces. Strict compilation boundaries enforced via `@nx/enforce-module-boundaries`.
- **Frontend (`apps/web`):** React 19, Vite, TanStack Router (Zod search parameters), TanStack Query v5, Tailwind CSS, MSW v2 for mock-first development.
- **UI Kit (`libs/ui`):** Reusable `@dsm/ui` component kit, Outlive light pastel design system, canonical 36px control standard (`h-9`), Storybook CSF3.
- **Backend (`apps/server`):** Node.js + Fastify modular monolith hosting a versioned REST API (`/api/v1`) and real-time Server-Sent Events (SSE) dispatcher (`/api/v1/realtime/sse`).
- **Contracts (`libs/api-contracts`):** Pure TypeScript + Zod schemas (Single source of truth for all DTOs and runtime validation).
- **Client Data Access (`libs/api-client`):** Typed HTTP client wrapping `fetch` with Zod validation.
- **Persistence (`libs/database`):** SQLite (`manager.sqlite`) in WAL mode via Drizzle ORM. Game files strictly remain on disk.
- **Platform Adapters (`libs/platform`):** `ProcessManager` (Win32 Job Objects on Windows, POSIX process groups on Linux).
- **Testing:** Vitest, React Testing Library, `@testing-library/user-event`, MSW v2, Playwright, `@vitest/coverage-v8`.

Detailed architecture specifications are located under `specs/` and detailed AI agent guidelines are under `.agents/skills/`.

---

## 2. Automatic Pull Request Summary Generation (MANDATORY REQUIREMENT)

Copilot and AI agents **MUST ALWAYS AUTOMATICALLY GENERATE** a comprehensive Pull Request summary whenever drafting, creating, or summarizing any Pull Request across the repository. Do not wait for the user to prompt or ask for a summary.

### Generation Directives:

1. **Trigger Automatically:** Whenever preparing a PR or generating a PR body (via Copilot actions, GitHub CLI `gh pr create`, or chat), immediately produce this summary without asking for confirmation.
2. **Focus on the "Why" and Architecture:** State the technical rationale and link to relevant specifications in `specs/` (e.g., `ARCH_SPEC.md`, `UI_COMPONENTS_SPEC.md`, `CLIENT_SPEC.md`, `TEST_AUDIT_SPEC.md`).
3. **Be Concise and Precise:** Avoid generic boilerplate like "In this PR, we made several changes". Use clear, structured sections.
4. **Always follow the standard output structure below:**

```markdown
### 🎯 Architectural Intent & Overview

<!-- Concise 1-2 paragraph summary explaining the goal, the architectural rationale, and referenced specifications -->

### 🧱 Key Changes by Package

<!-- Group changes by monorepo package -->

- **`libs/ui`** (or `apps/web` / `apps/server` / `libs/api-contracts`):
  - Change 1 with technical detail (e.g. implemented `KpiCard` with cubic Bezier SVG sparklines)
  - Change 2

### 🛡️ Safety, Contracts & Boundary Compliance

<!-- Check and report each of the following: -->

- **Module Boundaries:** [Passed / Not Applicable] — Client code does not import backend packages (`better-sqlite3`, `fastify`, `child_process`). `api-contracts` remains pure TypeScript + Zod.
- **Process & Shutdown Safety:** [Passed / Not Applicable] — Process calls use argument arrays (`spawn(cmd, [args])`). DayZ shutdown sequence triggers BattlEye RCON `#shutdown` first.
- **File Integrity:** [Passed / Not Applicable] — Game configurations written atomically (`.tmp` write + rename + `.bak_{timestamp}`).
- **UI Kit Geometry:** [Passed / Not Applicable] — Interactive controls strictly follow the canonical 36px standard (`h-9`); wrapped controls expose `containerClassName`.

### 🧪 Testing & Verification

<!-- Report test coverage and verification results based on TEST_AUDIT_SPEC.md -->

- **Test Suite:** [X] tests passed across [Y] test files (`pnpm nx run [project]:test`).
- **Two-Level Coverage:**
  - Overall Package Coverage: [>= 80% / Passed]
  - Affected Code Coverage: [100% statements, branches, functions, and lines / Passed]
- **Verification Commands Executed:**
  - `pnpm nx run-many -t typecheck` (0 errors)
  - `pnpm eslint <path> --max-warnings 0` (0 warnings)

### ⚠️ Breaking Changes & Migrations

<!-- List any breaking schema, DTO, or configuration changes, or explicitly state "None". -->

- None.
```

---

## 3. General Development & Coding Guidelines

When assisting with code generation, reviews, or refactoring in this repository:

### 3.1. Non-Negotiable Architecture Guardrails

- **Boundary Isolation:** Never import backend-only packages (`better-sqlite3`, `fastify`, `node:child_process`, `node:fs`) into `apps/web`, `libs/ui`, or `libs/api-client`.
- **Contract-First:** Every API endpoint change must begin with a Zod schema in `libs/api-contracts` before updating `libs/api-client`, MSW handlers, and Fastify routes.
- **Zero Production MSW Leakage:** MSW service workers and mock handlers must be gated behind `import.meta.env.DEV` and omitted from production builds.

### 3.2. Frontend & React 19 Standards (`libs/ui`, `apps/web`)

- **React 19 Ref Handling:** In React 19, `ref` is a standard prop (`props.ref`). Never use `forwardRef`.
- **Fast Refresh Purity:** Component files (`*.tsx`) must only export React components (`react-refresh/only-export-components`). Extract pure helpers to `*.utils.ts` and types to `*.types.ts`.
- **Compound Components:** Multi-part components must use compound subcomponents (e.g. `HeroBanner.Title`, `KpiCard.Sparkline`).
- **Canonical 36px Single-Size Standard:** Interactive buttons and form inputs share a uniform 36px baseline (`h-9`). The `size` prop is retired.
- **Wrapped Form Controls:** Always expose `containerClassName?: string` on root wrappers.
- **Zero Hardcoded Colors:** Consume semantic Outlive CSS variables (`var(--color-primary)`, `var(--color-surface)`, `var(--color-border)`).
- **Derived State:** Calculate derived values during render; never sync state via `useEffect`.

### 3.3. TypeScript & Type Hygiene

- **Strict Zero-`any` Policy:** Never use `any`. Use `unknown` and narrow with type guards or Zod schemas.
- **No Non-Null Assertions:** Avoid `!`. Use optional chaining (`?.`), nullish coalescing (`??`), or runtime guards.
- **Discriminated Unions:** Model asynchronous lifecycles using discriminated unions (`status: 'idle' | 'pending' | 'success' | 'failed'`) with `never` exhaustiveness checks.
- **Immutability & `as const`:** Use `as const` for query key factories and static configurations.
- **Type-Only Imports:** Always use `import type { ... }` when importing types and interfaces.

### 3.4. Testing Standards (`TESTING_SPEC.md`, `TEST_AUDIT_SPEC.md`)

- **Mandatory Stack:** Vitest, React Testing Library, `@testing-library/user-event`, MSW v2, `@vitest/coverage-v8`.
- **No Mock Fetch Hacks:** Network mocking must use MSW (`server.use(...)`). Never monkey-patch `window.fetch`.
- **User-Centric Queries:** Prefer `getByRole`, `getByLabelText`, and `getByText` over test IDs or CSS selectors.
- **Deterministic Timers:** Use `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` for debounced interactions and animations.
- **Strict Coverage Policy:** $\ge 80\%$ global coverage across all metrics; strict $100\%$ coverage on all affected production code and core utilities (`*.utils.ts`).

---

## 4. Reference Skills & Specifications Index

When deeper guidance is needed, consult the specialized files:

- 📋 PR & Code Review: `.agents/skills/code-review.md`
- 🚀 Feature Implementation: `.agents/skills/feature-implementation.md`
- 🧪 Testing & Audit Policy: `.agents/skills/tests-implementation.md`
- 🌐 Webapp & E2E Testing: `.agents/skills/webapp-testing.md`
- 🧼 Code Conventions & Hygiene: `.agents/skills/code-convention.md`
- ⚛️ React 19 Style Guide: `.agents/skills/react-styleguide.md`
- 🔷 TypeScript Style Guide: `.agents/skills/typescript-styleguide.md`
- 🏛️ Master Architecture ADR: `specs/ARCH_SPEC.md`
- 🧩 UI Kit Architecture: `specs/UI_COMPONENTS_SPEC.md`
