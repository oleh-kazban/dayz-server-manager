---
name: react-styleguide
description: React 19 architectural style guide, rules of hooks, component composition patterns, and state conventions for DayZ Server Manager (DSM).
applyTo: '**/*.{tsx,jsx}'
---

# React 19 Architectural Style Guide — DayZ Server Manager (DSM)

## 1. The Rules of React (React 19 Core Standards)

Every React component and custom hook in this repository must strictly adhere to the official Rules of React.

### 1.1. Components and Hooks Must Be Pure

- **Purity & Idempotence:** Given the same props, state, and context, a component must return the exact same JSX.
- **No Side Effects in Render:** Never perform mutations, network requests, timers, or DOM measurements during the render phase. All side effects belong inside `useEffect` or event handlers.
- **Never Mutate Props, State, or Context:** Treat all props and hook returns as strictly immutable. Use immutable updates (object spread, array methods like `.filter()` and `.map()`).
- **Never Mutate Component Children or Child Props:** Never inspect or mutate `child.props.ref` or child props during render. If you need to attach event handlers or measure a child element, wrap it in a lightweight host element (`<span className="inline-flex">`).

### 1.2. The Rules of Hooks

- **Top-Level Invocations Only:** Call hooks exclusively at the top level of your function component or custom hook. Never call hooks inside loops, conditionals, or nested functions.
- **Only Call Hooks from React Functions:** Call hooks only from React function components or custom hooks (`use*`).
- **No Cascading Synchronous Effects:** Never call `setState` unconditionally in the synchronous body of a `useEffect` that triggers immediate re-renders (`react-hooks/set-state-in-effect`). Manage reset logic in event handlers or compute derived values during render.

### 1.3. React 19 Ref Handling

- **Ref as a Standard Prop:** In React 19, `ref` is a standard prop. Pass `ref` directly as a prop (`props.ref`).
- **Do Not Use `forwardRef`:** Avoid `React.forwardRef` boilerplate unless required for legacy third-party library interop.

---

## 2. Component Architecture & Structure

### 2.1. Pure Function Components

- Use standard named function declarations.
- Avoid `React.FC` or `React.FunctionComponent` (deprecated pattern in modern React):
  ```tsx
  // ✅ Good: Explicit props interface with clean function signature
  export function HeroBanner({ variant = 'default', children, className }: HeroBannerProps): ReactNode {
    return (
      <div className={cn('hero-banner', className)}>
        {children}
      </div>
    );
  }

  // ❌ Bad: React.FC with implicit children
  export const HeroBanner: React.FC<HeroBannerProps> = ({ children }) => { ... };
  ```

### 2.2. Fast Refresh Purity (`react-refresh/only-export-components`)

To ensure Vite Fast Refresh functions without losing component state during HMR:

- Component files (`*.tsx`) must **only export React components**.
- Type definitions and interfaces must live in `[Component].types.ts`.
- Pure calculation functions, math helpers, and styling resolvers must live in `[Component].utils.ts`.

### 2.3. Slot-Based Compound Component Pattern

Complex composite components must use compound subcomponents rather than taking dozens of unrelated props:

```tsx
// Definition
export function KpiCard({ children, className }: KpiCardProps) { ... }

KpiCard.Header = function KpiCardHeader({ children }: { children: ReactNode }) { ... };
KpiCard.Value = function KpiCardValue({ children }: { children: ReactNode }) { ... };
KpiCard.Sparkline = function KpiCardSparkline({ data }: { data: number[] }) { ... };
KpiCard.Footer = function KpiCardFooter({ children }: { children: ReactNode }) { ... };

// Consumption
<KpiCard>
  <KpiCard.Header>Active Players</KpiCard.Header>
  <KpiCard.Value>58 / 60</KpiCard.Value>
  <KpiCard.Sparkline data={[42, 48, 55, 58]} />
  <KpiCard.Footer>+12% vs last hour</KpiCard.Footer>
</KpiCard>
```

### 2.4. Sizing & Modularity Guardrails

- **Max Component Length:** Aim for $< 150-200$ lines per component file. If a component exceeds this, break out compound slots or internal helper components into separate files.
- **No God Components:** Components should do one thing well. A `Card` provides a structured surface; it should not also handle API polling and form validation.

---

## 3. UI Kit Geometric Standards & Layout Contract (`@dsm/ui`)

### 3.1. The Canonical 36px Standard (`h-9`)

- All interactive controls (`Button`, `Input`, `PasswordInput`, `DatePicker`, `Autosuggest`, `Toggle`) share the **uniform 36px baseline height (`h-9`)**.
- The `size` prop has been eliminated across form controls. Do not add `size="sm"` or `size="lg"`.
- Control styling standard: `h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-xs font-medium`.

### 3.2. Input Geometric Uniformity

All input controls must share the identical physical footprint, padding, and corner radius as `Button`. They differ **only in behavior**, ensuring seamless visual alignment across forms, toolbars, and table filters.

### 3.3. Wrapped Control Contract (`containerClassName`)

Every composite form control that includes labels, prefix icons, or error messages MUST expose `containerClassName?: string` on its outermost root element:

```tsx
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}
```

### 3.4. CSS Variable Design Tokens

Never hardcode raw hex codes or ad-hoc border radii. Always use semantic Outlive design system tokens:

- **Surfaces:** `bg-[var(--color-surface)]`, `bg-[var(--color-surface-sunken)]`, `bg-[var(--color-surface-elevated)]`
- **Borders:** `border-[var(--color-border)]`, `border-[var(--color-border-subtle)]`
- **Brand / Accent:** `text-[var(--color-primary)]`, `bg-[var(--color-primary)]`
- **Radii:** `rounded-lg` (8px), `--radius-card: 12px`, `--radius-banner: 16px`

---

## 4. State Management & Data Topology

Follow strict architectural separation between state tiers:

```
+-------------------------------------------------------------------------+
| Client UI State (Zustand): Layout, Theme, Rail/Drawer, Column Visibility |
+-------------------------------------------------------------------------+
| Route State (TanStack Router): Validated URL Search Params (Zod)        |
+-------------------------------------------------------------------------+
| Server State (TanStack Query v5): Cached API Data, SSE Live Updates     |
+-------------------------------------------------------------------------+
| Local State (useState / useReducer): Ephemeral Form Inputs, Open/Close  |
+-------------------------------------------------------------------------+
```

### 4.1. Derived State Rule

- **Never sync state via `useEffect`:** Do not store derived values in `useState` and update them with `useEffect` when props change.
- **Compute on the fly:** Calculate derived values during render. Wrap in `useMemo` only if the computation is genuinely expensive (> 1ms):
  ```typescript
  // ✅ Good: Calculated directly during render
  const filteredMods = useMemo(() => {
    return mods.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  }, [mods, search]);

  // ❌ Bad: Duplicating state with useEffect synchronizer
  const [filteredMods, setFilteredMods] = useState([]);
  useEffect(() => {
    setFilteredMods(mods.filter(m => m.name.includes(search)));
  }, [mods, search]);
  ```

### 4.2. Custom Hooks Guidelines

- Always prefix with `use*` (`usePopup`, `useSortableList`, `useDebounce`).
- Always clean up side effects in `useEffect`:
  ```typescript
  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updatePosition]);
  ```

---

## 5. Accessibility (A11y) & Semantic Markup

### 5.1. Semantic HTML Elements

- Use `<button type="button">` for actions, never `<div onClick={...}>`.
- Use `<nav>`, `<header>`, `<main>`, `<aside>`, `<footer` for page landmarks.
- Use native form elements (`<input>`, `<select>`, `<textarea>`) where possible.

### 5.2. ARIA & Keyboard Accessibility

- **Icon-Only Buttons:** Must always have an `aria-label`: `<button aria-label="Restart Server"><RestartIcon /></button>`.
- **Expandable Elements:** Use `aria-expanded={isOpen}` and `aria-haspopup="true"`.
- **Popovers & Overlays:** Must dismiss on `Escape` key and restore focus to trigger.
- **Focus Rings:** Always provide prominent focus styles: `focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-hidden`.
