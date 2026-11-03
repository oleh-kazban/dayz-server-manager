---
name: typescript-styleguide
description: TypeScript style guide and type-safety standards for DayZ Server Manager (DSM). Covers strict type inference, discriminated unions, zero-any policy, and type hygiene.
applyTo: '**/*.{ts,tsx}'
---

# TypeScript Architectural Style Guide — DayZ Server Manager (DSM)

## 1. Strict Type Safety & The Zero-`any` Policy

TypeScript in the DayZ Server Manager monorepo is configured with strict compiler flags (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`). Type safety is treated as a core architectural constraint.

### 1.1. Zero Tolerance for `any`

- **Never use `any`:** `any` disables the type system and introduces hidden runtime crashes.
- **Use `unknown` for Unverified Inputs:** When receiving data from external APIs, raw JSON, WebSockets, or third-party libraries, type the value as `unknown`.
- **Narrow with Type Guards or Zod:** Narrow `unknown` before accessing properties:
  ```typescript
  // ✅ Good: Narrowing unknown via type guard
  function parseServerMessage(raw: unknown): string {
    if (typeof raw === 'string') {
      return raw.trim();
    }
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'message' in raw &&
      typeof raw.message === 'string'
    ) {
      return raw.message;
    }
    return 'Unknown system message';
  }

  // ✅ Good: Narrowing unknown via Zod schema
  const parsed = serverStatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error);
  }
  const status = parsed.data; // Fully typed
  ```

### 1.2. Nullability & Non-Null Assertions

- **Avoid Non-Null Assertion (`!`):** Do not silence the compiler using `value!`. Use optional chaining (`?.`), nullish coalescing (`??`), or explicit runtime checks:
  ```typescript
  // ✅ Good: Runtime guard narrowing
  const trigger = triggerRef.current;
  if (!trigger) {
    return;
  }
  const rect = trigger.getBoundingClientRect(); // trigger is guaranteed HTMLElement

  // ❌ Bad: Forcing compiler with non-null assertion
  const rect = triggerRef.current!.getBoundingClientRect();
  ```

### 1.3. Suppressions & `@ts-ignore`

- **`@ts-ignore` and `@ts-nocheck` are strictly prohibited.**
- In rare situations where third-party types are broken, use `@ts-expect-error` accompanied by a mandatory explanatory comment explaining the defect and tracking issue:
  ```typescript
  // @ts-expect-error: Third-party library types omit synthetic pointer events in React 19
  element.dispatchEvent(syntheticEvent);
  ```

---

## 2. `interface` vs. `type` Conventions

Follow consistent rules across the codebase:

### 2.1. Use `interface` for:

- **Component Props:**
  ```typescript
  export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
    title: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }
  ```
- **Service Contracts & Platform Adapters:** Object contracts intended to be implemented by classes or extended:
  ```typescript
  export interface ProcessManager {
    start(command: ProcessCommand): Promise<ProcessInfo>;
    stop(pid: number, force?: boolean): Promise<void>;
  }
  ```

### 2.2. Use `type` for:

- **Union and Literal Types:**
  ```typescript
  export type ServerState = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'FAILED';
  export type Placement = 'top' | 'bottom' | 'left' | 'right';
  ```
- **Zod Inferred Types:**
  ```typescript
  export type StopServerDto = z.infer<typeof stopServerRequestSchema>;
  export type ServerStatusDto = z.infer<typeof serverStatusSchema>;
  ```
- **Tuples, Utility Mappings, and Complex Intersections:**
  ```typescript
  export type Coordinates = [x: number, y: number, z: number];
  export type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
  ```

---

## 3. Discriminated Unions for State Modeling

Avoid boolean flags that permit impossible or conflicting states (`isLoading: true` and `isError: true` at the same time). Model lifecycles with **discriminated unions**:

```typescript
// ✅ Good: Discriminated Union eliminating impossible states
export type AsyncResource<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'pending'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'failed'; data: null; error: Error };

// Exhaustiveness checking with never
export function renderResourceState<T>(resource: AsyncResource<T>): string {
  switch (resource.status) {
    case 'idle':
      return 'Ready';
    case 'pending':
      return 'Loading...';
    case 'success':
      return `Loaded: ${JSON.stringify(resource.data)}`;
    case 'failed':
      return `Error: ${resource.error.message}`;
    default: {
      const _exhaustiveCheck: never = resource;
      throw new Error(`Unhandled resource state: ${_exhaustiveCheck}`);
    }
  }
}
```

---

## 4. Literal Types & `as const` Immutability

Use `as const` to prevent TypeScript from widening literals to `string` or `number`:

```typescript
// Query key factory with as const
export const queryKeys = {
  server: {
    all: ['server'] as const,
    status: ['server', 'status'] as const,
    config: ['server', 'config'] as const,
  },
  tasks: {
    detail: (id: string) => ['tasks', id] as const,
  },
} as const;

// Readonly lookup tables
export const DAYZ_DEFAULT_PORTS = {
  game: 2302,
  steamQuery: 27016,
  rcon: 2310,
} as const;
```

---

## 5. Type-Only Imports & Exports

Always use the `type` modifier when importing or exporting types. This guarantees that TypeScript strips type dependencies completely during compilation, eliminating circular import hazards and runtime bundle bloat:

```typescript
// ✅ Good: Explicit type-only imports
import type { ReactNode, RefObject } from 'react';
import type { ServerStatusDto, StopServerDto } from '@server-manager/api-contracts';
import { serverStatusSchema } from '@server-manager/api-contracts';

// ✅ Good: Type-only re-exports in index.ts
export type { KpiCardProps } from './KpiCard.types';
export { KpiCard } from './KpiCard';
```

---

## 6. Function Signatures & Generics

### 6.1. Explicit Return Types

All exported functions, methods, and API boundary handlers must specify an explicit return type:

```typescript
// ✅ Good: Clear contract at function boundary
export function formatUptime(uptimeSeconds: number): string {
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
```

### 6.2. Meaningful Generic Constraints

- Use descriptive generic names (`TData`, `TItem`, `TError`, `TValue`) when there is more than one type parameter or when it clarifies domain meaning.
- Constrain generics rather than leaving them completely unbounded:
  ```typescript
  // ✅ Good: Constrained generic parameter
  export function findEntityById<TEntity extends { id: string }>(
    entities: readonly TEntity[],
    targetId: string,
  ): TEntity | undefined {
    return entities.find(e => e.id === targetId);
  }
  ```

---

## 7. Zod as the Single Source of Truth

Never create a standalone TypeScript interface that duplicates a network DTO or external payload.

1. Define the validation schema using **Zod** in `libs/api-contracts`.
2. Infer the TypeScript type from the schema using `z.infer`.
3. Export both the schema and the inferred type from `libs/api-contracts`.

```typescript
// libs/api-contracts/src/lib/server/telemetry.contract.ts
import { z } from 'zod';

export const telemetryPointSchema = z.object({
  timestamp: z.number().int(),
  cpuPercent: z.number().min(0).max(100),
  memoryUsedMb: z.number().min(0),
  memoryTotalMb: z.number().min(0),
  serverFps: z.number().min(0),
});

export type TelemetryPointDto = z.infer<typeof telemetryPointSchema>;
```

This guarantees runtime contract safety and compile-time synchronization with zero duplication.
