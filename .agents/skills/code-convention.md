---
name: code-convention
description: General clean code principles, naming conventions, project organization, and engineering standards for DayZ Server Manager (DSM).
applyTo: '**/*.{ts,tsx,js,jsx,json,css,md}'
---

# Code Conventions & Clean Code Standards — DayZ Server Manager (DSM)

## 1. Core Engineering Philosophy

The DayZ Server Manager is an enterprise-grade, self-hosted operational control plane. The codebase prioritizes **architectural predictability**, **readability**, **long-term maintainability**, and **safety**.

Every contributor and AI agent must adhere to these foundational principles:

### 1.1. Clean Code Principles

- **Single Responsibility Principle (SRP):** Every module, component, hook, and function must have exactly one reason to change. If a function or component performs multiple unrelated tasks, decompose it.
- **KISS (Keep It Simple, Stupid):** Choose the simplest design that completely satisfies the requirements. Avoid speculative abstractions, unnecessary design patterns, or premature generalizations.
- **DRY (Don't Repeat Yourself) with Pragmatism:** Eliminate duplication of domain logic, business rules, and contracts. However, do not prematurely couple distinct components that happen to share superficial structural similarity.
- **YAGNI (You Aren't Gonna Need It):** Never implement props, configuration options, or architectural hooks for hypothetical future features. Implement only demonstrated requirements.
- **Boy Scout Rule:** Always leave the code cleaner than you found it. When modifying a file, fix adjacent type warnings or extract complex logic if within scope.

---

## 2. Naming Conventions

Consistent naming communicates intent immediately and eliminates cognitive friction across the monorepo:

### 2.1. File & Directory Naming

| Target                     | Convention               | Example                                                 |
| -------------------------- | ------------------------ | ------------------------------------------------------- |
| **React Components**       | `PascalCase.tsx`         | `HeroBanner.tsx`, `KpiCard.tsx`, `DatePicker.tsx`       |
| **Component Types**        | `PascalCase.types.ts`    | `HeroBanner.types.ts`, `KpiCard.types.ts`               |
| **Component Utils**        | `kebab-case.utils.ts`    | `kpi-card.utils.ts`, `tag.utils.ts`, `tooltip.utils.ts` |
| **Component Tests**        | `PascalCase.test.tsx`    | `HeroBanner.test.tsx`, `Tooltip.test.tsx`               |
| **Component Stories**      | `PascalCase.stories.tsx` | `HeroBanner.stories.tsx`, `KpiCard.stories.tsx`         |
| **Component Directories**  | `kebab-case/`            | `libs/ui/src/hero-banner/`, `libs/ui/src/kpi-card/`     |
| **Custom Hooks**           | `camelCase.ts`           | `usePopup.ts`, `useDebounce.ts`, `useSortableList.ts`   |
| **General Utilities**      | `kebab-case.ts`          | `date-formatter.ts`, `xml-parser.ts`, `crypto.ts`       |
| **State Stores (Zustand)** | `kebab-case.store.ts`    | `console-layout.store.ts`, `tactical-theme.store.ts`    |
| **API Contracts**          | `kebab-case.contract.ts` | `server-lifecycle.contract.ts`, `types-xml.contract.ts` |

### 2.2. Variables, Functions & Identifiers

- **Variables & Functions:** `camelCase` (e.g., `calculatePlacement`, `formatBytes`, `activeServerId`).
- **Exported Constants:** `UPPER_SNAKE_CASE` for global configuration, magic number replacements, and static mappings:
  ```typescript
  export const POPUP_GAP = 4;
  export const VIEWPORT_PADDING = 8;
  export const MAX_RETRY_ATTEMPTS = 3;
  ```
- **Booleans:** Must always be prefixed with a descriptive modal verb (`is`, `has`, `can`, `should`):
  - ✅ `isOpen`, `isLoading`, `hasError`, `canExecute`, `shouldAutoScroll`
  - ❌ `open`, `loading`, `error`, `execute`, `autoScroll`
- **Event Callbacks vs. Handlers:**
  - **Props (Callbacks):** Prefix with `on*` (`onClick`, `onClose`, `onSelectionChange`).
  - **Internal Handlers:** Prefix with `handle*` (`handleClick`, `handleClose`, `handleSelectionChange`).

### 2.3. Types, Interfaces & Enums

- **PascalCase** for all types, interfaces, classes, and enums (`ServerStatusDto`, `ProcessManager`, `HeroBannerProps`).
- **Props Interfaces:** Always name component props as `[ComponentName]Props` (`TagProps`, `KpiCardProps`).
- **Never Prefix with `I` or `T`:** Use `ProcessManager`, not `IProcessManager`. Use `ServerStatus`, not `TServerStatus`.

---

## 3. Code Organization & Architecture

### 3.1. High Co-Location Pattern

Group all assets related to a single unit of functionality within its dedicated directory:

```
libs/ui/src/kpi-card/
  ├── KpiCard.tsx             # Pure React component implementation
  ├── KpiCard.types.ts        # Public TypeScript interfaces & types
  ├── kpi-card.utils.ts       # Mathematical algorithms & pure helper functions
  ├── KpiCard.test.tsx        # Vitest + RTL automated test suite
  ├── KpiCard.stories.tsx     # Storybook CSF3 documentation & stories
  └── index.ts                # Clean barrel export
```

### 3.2. Clean Barrel Exports (`index.ts`)

- Barrel exports must expose **only the public API** of the module or component.
- Internal calculation helpers and private sub-utilities must remain unexported unless explicitly intended for shared library consumption.
- Use explicit named exports. Avoid `export * from ...` where possible to prevent accidental namespace leakage.

### 3.3. Monorepo Boundary Discipline

- Dependencies flow inward: `apps/web` $\rightarrow$ `libs/ui`, `libs/api-client` $\rightarrow$ `libs/api-contracts`.
- Never import upwards or across prohibited boundaries. Client code must never import Node runtime modules (`better-sqlite3`, `fastify`, `child_process`).

---

## 4. Function Design & Clean Code Practices

### 4.1. Function Length & Complexity

- Functions must be concise and focused on a single responsibility (ideally $< 30$ lines).
- Extract nested loops, complex arithmetic, or multi-step transformations into isolated pure utility functions.
- Limit function arguments to a maximum of **3 parameters**. When 4 or more arguments are required, consolidate them into a typed options object.

### 4.2. Guard Clauses & Early Returns

Avoid deeply nested `if-else` blocks (arrow anti-pattern). Validate preconditions at the top of the function and return early:

```typescript
// ✅ Good: Guard clauses with early returns
function calculateRenderedHeight(isOpen: boolean, popup: HTMLElement | null): number {
  if (!isOpen || !popup) {
    return 0;
  }
  return Math.min(popup.scrollHeight, window.innerHeight);
}

// ❌ Bad: Nested conditional pyramid
function calculateRenderedHeight(isOpen: boolean, popup: HTMLElement | null): number {
  let height = 0;
  if (isOpen) {
    if (popup) {
      height = Math.min(popup.scrollHeight, window.innerHeight);
    }
  }
  return height;
}
```

### 4.3. Immutability

- Treat all arguments, props, and existing state as immutable.
- Use non-mutating array methods (`map()`, `filter()`, `reduce()`, `slice()`, `toSorted()`) rather than mutating methods (`splice()`, `sort()`, `reverse()`, `push()`).
- Avoid parameter reassignment. Never modify input arguments directly.

---

## 5. Comments & Documentation Standards

- **Code Should Explain "What" and "How":** Write expressive code with self-explanatory variable and function names.
- **Comments Must Explain "Why":** Reserve comments for non-obvious business logic, domain nuances (DayZ economy rules, BattlEye RCON timing), or OS workarounds (Windows Job Objects vs. Linux POSIX).
- **No Dead Code:** Remove commented-out code blocks, obsolete test cases, and temporary `console.log()` statements before submitting changes.
- **JSDoc on Public APIs:** Provide concise JSDoc comments for exported utility functions, custom hooks, and shared library contracts:
  ```typescript
  /**
   * Generates a smooth cubic Bezier SVG path string from an array of numeric values.
   *
   * @param values - Array of numbers to plot.
   * @param width - ViewBox width in pixels.
   * @param height - ViewBox height in pixels.
   * @returns SVG path data string (`d` attribute).
   */
  export function generateSparklinePath(values: number[], width: number, height: number): string;
  ```

---

## 6. Error Handling & Resilience

### 6.1. Fail Fast, Fail Predictably

- Detect and reject invalid inputs immediately at system and component boundaries.
- Validate external inputs, API responses, and URL search parameters using **Zod schemas**.

### 6.2. No Swallowing of Errors

- Never write empty catch blocks (`catch (e) {}`).
- When catching an exception:
  1. Log the error with actionable diagnostic context.
  2. Map it to a typed domain error or fallback state.
  3. Re-throw if the operation cannot safely proceed.

### 6.3. Custom Typed Errors

Define domain-specific error classes with stable error names and error codes:

```typescript
export class RconCommandTimeoutError extends Error {
  readonly code = 'RCON_TIMEOUT';
  constructor(command: string, timeoutMs: number) {
    super(`BattlEye RCON command "${command}" timed out after ${timeoutMs}ms.`);
    this.name = 'RconCommandTimeoutError';
  }
}
```
