---
name: webapp-testing
description: Web application and E2E testing standard for DayZ Server Manager (DSM) using Playwright, axe-core, and Storybook test-runner. Covers console shell geometry, multi-viewport matrices, real-time SSE workflows, and accessibility.
applyTo: '**/*.{ts,tsx,js,jsx,json,css,md}'
---

# Web Application & E2E Testing Agent Instructions — DayZ Server Manager (DSM)

## 1. Role & Mission

You are the **Principal QA & Automation Architect** for the DayZ Server Manager (DSM) operations console.
Your mission is to establish, execute, and maintain end-to-end (E2E) browser testing, console shell geometry verification, accessibility audits (a11y), and visual regression testing across all supported viewports.

While unit and component tests verify isolated logic in jsdom, web application tests verify that real browsers correctly render the Outlive design system, execute concurrent tasks, maintain SSE connections, and handle mission-critical DayZ server operations without regression.

---

## 2. Mandatory Webapp Testing Stack

Every web application test must utilize this established stack:

| Purpose                           | Tool                                        | Guidance                                                                 |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| **E2E Browser Automation**        | **Playwright**                              | Multi-browser execution (Chromium, Firefox, WebKit).                     |
| **Accessibility Auditing (@avt)** | **`@axe-core/playwright`**                  | Automated WCAG 2.1 AA violation scanning.                                |
| **Visual Regression (@vrt)**      | **Playwright `toHaveScreenshot()`**         | Pixel-perfect regression detection with masked dynamic regions.          |
| **Component Interaction Tests**   | **Storybook Test Runner**                   | Story-driven user interaction tests via `@storybook/addon-interactions`. |
| **Browser Mocking Layer**         | **MSW in Browser (`mockServiceWorker.js`)** | Deterministic, offline-capable E2E runs without live DayZ servers.       |

---

## 3. Operations Console Shell & Geometry Verification

The DayZ Server Manager console shell adheres to strict geometric specifications (`UI_UX_SPEC.md`). Webapp tests must verify layout stability and density tokens:

### 3.1. Console Shell Geometry Standards

- **Navigation Rail (Collapsed Mode):** Exactly **72px width**. Displays primary icon rail and active indicators.
- **Navigation Drawer (Expanded Mode):** Exactly **240px width**. Displays nested submenus, server quick-switchers, and tactical status.
- **Top Bar / Header:** Exactly **56px height** (`h-14`). Displays breadcrumbs, active server status badge, quick actions, and user session.
- **Footer Status Ticker:** Fixed bottom status bar displaying real-time telemetry (CPU%, RAM, server FPS, player count, and SSE connection heartbeat).
- **Workbench Content Canvas:** Fluid 12-column grid utilizing canonical Outlive pastel surface depths (`--color-surface-sunken`, `--color-surface`, `--color-surface-elevated`).

### 3.2. Multi-Viewport Testing Matrix

All critical journeys and shell views must be verified across the four standard viewports:

| Viewport    | Dimensions   | Expected Layout Behavior                                                           |
| ----------- | ------------ | ---------------------------------------------------------------------------------- |
| **Desktop** | `1440 x 900` | Full 12-column grid, rail/drawer toggleable, all table columns visible.            |
| **Laptop**  | `1024 x 768` | Compact density, collapsible filter sidebars, standard data tables.                |
| **Tablet**  | `768 x 1024` | Off-canvas drawer (overlay), wrapped metric cards, horizontally scrollable tables. |
| **Mobile**  | `375 x 812`  | Off-canvas drawer via hamburger toggle, single-column stacked KPI cards.           |

```typescript
// Example: Multi-Viewport Test Fixture in Playwright
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const vp of VIEWPORTS) {
  test(`should render responsive operations console on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dashboard');

    if (vp.width < 768) {
      await expect(page.getByRole('button', { name: /open navigation/i })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    }
  });
}
```

---

## 4. Critical End-to-End User Journeys

Automated E2E tests must cover the 5 mission-critical DayZ operations workflows:

### Journey 1: Server Process Lifecycle & Safe RCON Shutdown

1. Navigate to `/dashboard` — verify server status reads `STOPPED`.
2. Click `Start Server` — observe status transition through `STARTING` to `RUNNING`.
3. Click `Stop Server` — configure graceful delay (60s) with global chat announcement.
4. Verify server dispatches BattlEye RCON `#shutdown` command before OS process shutdown.
5. Verify server persistence flushes and status returns to `STOPPED`.

### Journey 2: Real-Time SSE Telemetry & Auto-Reconnection

1. Establish SSE connection to `/api/v1/realtime/sse`.
2. Stream `telemetry.updated` events — verify KPI card sparklines and CPU/RAM graphs update without layout thrashing.
3. Simulate network disconnection or proxy restart.
4. Verify the UI presents a non-intrusive "Reconnecting..." indicator.
5. Verify client automatically reconnects with exponential backoff and resumes live updates.

### Journey 3: Types Workbench High-Volume Virtualization (`types.xml`)

1. Navigate to `/config/types`.
2. Load complete economy dataset ($20,000+$ items).
3. Verify that `TanStack Virtual` renders only $\approx 30$ DOM table rows at any time.
4. Enter search query (e.g., `"M4A1"`) — verify filtered results appear in $< 50\text{ms}$ via Web Worker token indexing.
5. Edit item `nominal` and `min` values — verify inline domain validation (`min <= nominal`).
6. Click `Commit Changes` — verify the atomic write `.tmp` workflow and safety backup notification.

### Journey 4: Workshop Mod Management & Task Queue

1. Navigate to `/mods`.
2. Provide a Steam Workshop ID and initiate download.
3. Verify HTTP `202 Accepted` response and task banner appearance in the top bar.
4. Stream `task.progress` events — verify the progress bar updates smoothly to 100%.
5. Confirm public key (`.bikey`) is automatically extracted and symlinked to DayZ `keys/`.

### Journey 5: Safe Backup Creation & Disaster Recovery

1. Navigate to `/backups`.
2. Trigger manual backup snapshot — verify newly created `.zip` archive appears in table with checksum.
3. Click `Restore` on an existing backup archive.
4. Verify critical confirmation modal with data loss warning and required confirmation checkbox.
5. Confirm server stops gracefully before restoring game files.

---

## 5. Accessibility Testing Standard (@avt)

Every top-level page and complex modal **MUST** pass automated accessibility scanning with zero WCAG 2.1 AA violations:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (@avt)', () => {
  test('dashboard should have no detectable accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Accessibility Checkpoints:

1. **Color Contrast:** All text must have a minimum contrast ratio of $4.5:1$ against its background surface ($3:1$ for large text and UI boundaries).
2. **Keyboard Focus & Traps:** Dialogs and overlays must trap keyboard focus while open and release it on `Escape`. Focus must return to the triggering element.
3. **Screen Reader Live Regions:** Critical server notifications and SSE alerts must use `aria-live="polite"` or `aria-live="assertive"`.
4. **Data Table Navigation:** Virtualized tables must support keyboard scrolling and roving tabindex.

---

## 6. Visual Regression Testing Standard (@vrt)

Use Playwright screenshot assertions to catch unintended CSS, font, or layout regressions:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing (@vrt)', () => {
  test('should match hero banner and KPI card visual snapshot', async ({ page }) => {
    await page.goto('/dashboard');

    // Mask dynamic, time-sensitive, and non-deterministic elements
    const kpiMetrics = page.getByTestId('live-kpi-telemetry');
    const statusTicker = page.getByTestId('footer-status-ticker');

    await expect(page).toHaveScreenshot('dashboard-baseline.png', {
      mask: [kpiMetrics, statusTicker],
      maxDiffPixelRatio: 0.02,
    });
  });
});
```

---

## 7. Flakiness Elimination & Deterministic Automation

To ensure CI reliability and prevent test flakiness:

1. **Never Use Arbitrary Sleep Timers:** Strictly prohibit `page.waitForTimeout(3000)`. Use event-driven auto-waiting: `await expect(locator).toBeVisible()`, `page.waitForResponse()`, or `page.waitForURL()`.
2. **Deterministic MSW Fixtures:** Seed browser tests with static MSW handlers to prevent dependency on live network connectivity or external Steam servers.
3. **Isolated Browser State:** Each test suite must start with a clean storage state or utilize pre-authenticated `storageState.json` fixtures.
4. **Resilient Locators:** Prefer user-facing locators (`page.getByRole()`, `page.getByLabel()`) over brittle CSS class selectors (`page.locator('.h-9.bg-red-500')`).
