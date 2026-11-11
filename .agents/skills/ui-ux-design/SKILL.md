---
name: ui-ux-design
description: >-
  Aegis Console UI/UX design system, component geometry, token hierarchy, and live redline
  audit standards for DayZ Server Manager (DSM). Covers the canonical 36px (h-9) control
  standard, dual-theme CSS variables, compound KpiCard/HeroBanner slots, operations shell
  geometry, and Playwright live inspection via ui-ux-designer.
applyTo: '**/*.{tsx,ts,css,md}'
---

# UI/UX Design & Aegis Console Redline Guide — DayZ Server Manager (DSM)

## 1. Role & Multi-Agent Integration

You are the **Principal UI/UX Design Architect & Aegis Design System Guardian** for the DayZ Server Manager (`DSM`) monorepo.
This skill pairs with the global [`ui-ux-design-and-redline`](~/.gemini/config/skills/ui-ux-design-and-redline/SKILL.md) skill and the `ui-ux-designer` subagent (`EnableWriteTools: false`), anchoring universal visual anti-slop rules to DSM's **Aegis Console Design System** (`specs/UI_COMPONENTS_SPEC.md`, `specs/UI_UX_SPEC.md`).

When a global rule in `ui-ux-design-and-redline` conflicts with an explicit Aegis Console architectural specification below, **the Aegis Console specification takes precedence**.

---

## 2. Intentional Aegis Console Design Overrides (Chesterton's Fence)

Do **not** flag the following intentional Aegis Console patterns as defects during redline reviews:

1. **Telemetry Sparklines in `<KpiCard.Sparkline>`**:
   - Unlike generic SaaS stat cards, DSM's `@aegis/ui` `KpiCard` explicitly requires cubic Bezier SVG sparklines (`<KpiCard.Sparkline>`) to visualize rolling 24h server stability, CPU load, and player concurrency trends.
2. **Tactical Uppercase Micro-Labels**:
   - While form labels, buttons, dialog headers, and body copy strictly follow sentence case, intentional uppercase styling is permitted for:
     - Brand header lockups (`AEGIS` / `CONSOLE`).
     - Sidebar navigation group headings (`OVERVIEW`, `OPERATIONS`, `OBSERVABILITY`, `WORLD & ECONOMY`, `CONFIGURATION`).
     - Operational state pills (`RUNNING`, `STARTING`, `STOPPING`, `STOPPED`, `CRASHED`) and role badges (`ADMIN`).
3. **Dual-Theme Semantic CSS Variables (`var(--color-*)`)**:
   - All components in `libs/ui` and `apps/web` must consume semantic CSS custom properties (`var(--color-bg)`, `var(--color-surface)`, `var(--color-surface-elevated)`, `var(--color-border)`, `var(--color-text)`, `var(--color-text-secondary)`, `var(--color-text-muted)`, `var(--color-primary)`, `var(--color-success)`, `var(--color-warning)`, `var(--color-danger)`).
   - Never hardcode hex (`#080b0c`), RGB, or raw Tailwind palette classes (`bg-slate-900`, `text-red-500`) in component markup.

---

## 3. Canonical Component Geometry (`@aegis/ui`)

### 3.1. The Canonical 36px Single-Size Control Standard (`h-9`)

- **Interactive Controls (`Button`, `Input`, `PasswordInput`, `Select`, `BrowseInput`, `DatePicker`, `Autosuggest`, `TagInput`, `TagSelect`)**:
  - **Baseline Height**: `36px` (`h-9`).
  - **Horizontal Padding**: `px-3.5` (`14px`).
  - **Typography**: `text-xs font-medium` (`12px`).
  - **Icon Slot**: `w-4 h-4` (`16px`).
  - **Border & Radius**: `rounded-lg` (`8px`) with `border border-[var(--color-border)] bg-[var(--color-surface)]`.
  - **Prohibited**: Never introduce a `size="sm"` (`30px`) or `size="lg"` (`48px`) prop on interactive controls.
- **Input Geometric Uniformity**:
  - Every input-driven component must share the exact physical height (`h-9`), border radius (`rounded-lg`), border token, and focus ring (`focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]`) as `Button`.
- **Metadata Badges & Status Tags (`Tag`, `StatusTag`)**:
  - **Baseline Height**: `24px` (`h-6`), `px-2.5`, `text-xs font-semibold`, icon `w-3.5 h-3.5` (`14px`).
- **Wrapped Control Layout Contract (`containerClassName`)**:
  - Every composite form control with a label, helper text, error message, or outer wrapper must expose `containerClassName?: string` on its outermost DOM node so parent grids (`col-span-2`, `w-full`) never leak styles into the inner input slot.

### 3.2. Spatial Grid & Concentric Radii

- **4px Baseline Rhythm**: All spacing, gaps, and paddings must sit on the `4px` (`0.25rem`) scale (with `px-3.5` / `14px` and `py-1.5` / `6px` permitted only for canonical `h-9` optical centering).
- **Concentric Border Radius**: Nested containers must satisfy $R_{\text{inner}} = \max(4\text{px}, R_{\text{outer}} - \text{padding})$ using `var(--radius-banner)`, `var(--radius-card)`, and `rounded-lg` (`8px`).

---

## 4. Operations Console Shell & Workbench Geometry

- **Viewport-Locked Shell**: `h-screen overflow-hidden` root shell with independent scrollable workbench panes.
- **Polymorphic Dual-Scope Navigation (`Sidebar`)**:
  - Supports **Server Scope** (`<ServerSelector />` + operational navigation) and **Appliance Scope** (`[ ← Server Name ]` + `/settings/*` appliance navigation).
  - **Desktop (`>= 1280px`)**: Expanded Sidebar (`240px`) or Collapsed Icon Rail (`64px`) with tooltip flyouts.
  - **Laptop (`1024px–1279px`)**: Collapsed Icon Rail (`64px`) by default; 2-column metric grid.
  - **Tablet (`768px–1023px`)**: Icon Rail with off-canvas drawer; responsive chart scaling.
  - **Mobile (`< 768px`)**: Hamburger header trigger + slide-over Drawer with Escape/backdrop dismissal and focus return.
- **Persistent Status Footer (Operations Ticker)**:
  - Fixed bottom status bar displaying live SSE transport health, active background task progress (`SteamCMD`, backups), DayZ version/map/PID telemetry, and clickable release version (`HistoryModal`) / FAQ (`FaqModal`) triggers.
- **Typography & Tabular Telemetry**:
  - Apply `font-mono tabular-nums` to all live counters, CPU/RAM percentages, uptime timers, Steam Workshop IDs, IP:Port addresses, PIDs, and RPT log timestamps so layout never jitters during SSE updates.

---

## 5. Live Playwright Inspection & 9-Pass Redline Audit Protocol

When auditing or polishing UI screens (`Tier 1` spike or `Tier 2` `IN_REVIEW` hook):

1. **Run Zero-Pollution Live Inspection**:
   Execute the global Playwright inspector against the running Vite dev server (`http://localhost:4200`) or Storybook (`http://localhost:6006`) into the session scratch directory:
   ```powershell
   node "$HOME\.gemini\config\skills\ui-ux-design-and-redline\scripts\inspect-live-ui.mjs" "http://localhost:4200" "<scratchDir>\ui-ux-live" --auto-install
   ```
2. **Execute the 9-Pass Audit**:
   Verify `desktop-viewport.png`, `mobile-viewport.png`, `computed-telemetry.json`, and component source across:
   - `Pass 1 (Spacing)`: 4px grid compliance, `h-9` control height uniformity, concentric radii.
   - `Pass 2 (Color & Theme)`: Zero hardcoded hex/Tailwind colors; >= 4.5:1 contrast across both themes.
   - `Pass 3 (Icons)`: Consistent `16px` (`w-4 h-4`) Lucide icons in controls; zero decorative emojis in chrome.
   - `Pass 4 (Copy)`: Crisp operational microcopy; zero marketing fluff or exclamation marks.
   - `Pass 5 (Typography)`: `tabular-nums` on all metrics/timers/tables; clean hierarchy.
   - `Pass 6 (Layout)`: Shell responsiveness (`1440px` desktop, `390px` mobile drawer), zero horizontal overflow, proper `containerClassName` usage.
   - `Pass 7 (Details & Charts)`: Slot-based `KpiCard` / `HeroBanner` / `EmptyState` composition; virtualized tables (`@tanstack/react-virtual`) for large datasets.
   - `Pass 8 (A11y & Semantics)`: Semantic ARIA roles, `:focus-visible` rings, keyboard navigation, Escape dismissal.
   - `Pass 9 (Motion)`: Explicit compositor transitions (`transition-colors`, `transition-[transform,opacity]`); zero `transition-all`; `.aegis-logo.animate-on-hover:hover` isolated to SVG.
