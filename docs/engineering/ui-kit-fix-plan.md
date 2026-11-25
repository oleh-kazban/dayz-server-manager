# UI Kit Fix Plan

|              |                                                                                              |
| :----------- | :------------------------------------------------------------------------------------------- |
| **Status**   | Approved as a plan. No package starts yet: this session's goal is the audit and the register |
| **Verified** | Against the [tech debt register](../tech-debt.md), findings TD-UI-001 to TD-UI-075           |
| **Audience** | Maintainers and AI agents                                                                    |

This plan orders the work that turns the findings of the UI kit audit into code. It changes no code by itself. Each package is approved before it starts.

## 1. How the work runs

- **One branch per package**, named `cr/ui-<package>` (or `bugfix/...` for package 1), created from `master`.
- **One commit per finding or per small group**, each one building and passing its tests. Commits follow [git and releases](git-and-releases.md).
- **The delivery flow is the sdlc plugin.** Package 1 uses the bugfix lane (failing test first). The other packages use the small-change lane per finding. Packages that need new design (the modal, the shared field shell) get their requirements written and approved first, by hand, because the feature lane is not built yet.
- **Definition of done** is the one in [testing](testing.md): tests, review by the code reviewer and the security engineer, coverage, and manual testing with Playwright for visible changes.
- **Every package updates** the register (status of each finding), Storybook (a story per behavior) and the design system document when it changes a token or a rule.

## 2. Packages

| #   | Package                        | Findings                                                                                | Depends on | Size |
| :-- | :----------------------------- | :-------------------------------------------------------------------------------------- | :--------- | :--- |
| 1   | Fix what users hit today       | 047, 049, 052 (focus and label), 053, 055, 059, 071                                     | none       | S    |
| 2   | Design tokens and global rules | 010, 011, 012, 014, 018, 020, 022, 034                                                  | none       | L    |
| 3   | Button family                  | 003 to 009, 015, 021 (kit buttons)                                                      | 2          | M    |
| 4   | Shared building blocks         | 013, 019, 028, 029, 035, 037 (names), 038, 041 (heading), 051, 070, 072 (provider only) | 2, 3       | L    |
| 5   | Form controls                  | 016, 017, 024, 025, 026, 027, 030, 031, 032, 033, 067, 068                              | 4          | L    |
| 6   | Overlays, modals and popups    | 042, 043, 044, 045, 046, 047 (rest), 048, 052 (rest)                                    | 4, 5       | L    |
| 7   | Data display                   | 036, 037, 039, 040, 041, 050, 054, 056, 057, 066, 069, 073, 074, 075                    | 4          | L    |
| 8   | Code editor and log viewer     | 060, 061, 062, 063, 064, 065                                                            | 4, 6       | M    |
| 9   | Kit translations               | 072                                                                                     | 4 to 8     | M    |
| 10  | Guardrails                     | 018 (lint rule), 013 (no `customClassName`), 038 (no test IDs), token checks            | 2 to 9     | S    |

Sizes compare the packages only: S is a few commits, M is one to two weeks of focused work, L is longer. They are not estimates.

Findings with no code work: TD-UI-001, 002, 058 (closed), TD-UI-023 (kept), TD-UI-054 (accepted).

### 1. Fix what users hit today

Independent fixes in components the app already uses. Each one has a failing test first.

- `CodeEditor` and `CodeDiffView`: make the read-only content focusable (059).
- `Table`: focusable scroll region, one accessible name, no `aria-selected` on rows, a button inside sortable headers (049).
- `TableBulkActions`: wrap the actions so they never overlap (053).
- `TableColumnVisibility`: focus the search field once the popup is positioned, and label it (052).
- `NotificationMenu`: width limited to the viewport, dismiss control visible on touch (047).
- `Pagination`: wrap on narrow screens, keep focus with `aria-disabled` while loading (071).
- `Tabs`: horizontally scrollable list with the active tab in view (055).

### 2. Design tokens and global rules

The foundation. Every later package uses these tokens, so it comes first.

- Named small-text tokens (proposed `--text-caption` 11 px and `--text-micro` 10 px) and the form label and hint styles (014, 022).
- One focus ring token (proposed 2 px with a 2 px offset) (020).
- Scrim, toggle knob and on-image tokens (010, 011), a z-index scale, and tokens for the other hardcoded values found in the audit (018).
- A global `prefers-reduced-motion` rule (034), with the `Skeleton` pulse as the model.
- Segmented `Tabs` at 36 px (012).
- Documentation: update the [design system](../design/design-system.md).

### 3. Button family

`Button` first, because later packages replace raw buttons with it.

- The typed icon-only form with a required `aria-label`, and the removal of `isIconOnly` and of the element-form icons (005, 006).
- The `ghost` and `text` roles, the no-icon loading width, tests that check behavior, and stories that match the API (003, 004, 007, 008, 009).
- The `PasswordInput` toggle uses it (015). Kit raw buttons become icon-only `Button` (021).

### 4. Shared building blocks

Removes the copied code that causes most drift.

- `useMergedRef` (019). One `FormField` shell for label, hint and error, plus a shared control surface; `customClassName` goes away (013, 028).
- One popup surface and one option row (029). One tone map for `Tag`, `StatusTag`, `Notice` and the toast, with `info` on the info token everywhere (035). One name, `danger`, and one heading prop name (037, 041).
- One `Loader`/spinner used by every component (070). `TableEmpty` and `NotificationMenu` use `EmptyState` (051). Test IDs leave the DOM (038).
- The message provider for the kit strings, with English defaults (the infrastructure of 072).

### 5. Form controls

Each control moves onto the shared shell and gets its own fixes: `Input` and `PasswordInput` (016, 017), `Select` (024, 025, with the test and story its kept props need), `Checkbox` and `Toggle` (026, 027), `Autosuggest` (033), `DatePicker` with locale support (032), `TagInput` (031), `TagSelect` (030), `FileUploader` (067, 068).

### 6. Overlays, modals and popups

The riskiest package, because it touches every modal in the app.

- A kit `Modal` on the native `<dialog>`, used by the nine app modals, and `useModalDialog` retired (042).
- `Confirmation` and `KeywordConfirmation` on a shared shell; the dialog stays open with a spinner while the action runs, and shows the error on failure (043).
- Toasts and popups in the top layer. Error toasts stay until dismissed (045). Tooltips do nothing on touch (044).
- The menus share one keyboard hook, with the `Select` and `FloatingMenu` split documented (046, 047). `usePopup` returns the trigger and popup props and owns its state (048).

### 7. Data display

`Table` (050, 054 accepted), `Tabs` (056, 057), `Tag` and `StatusTag` (036, 039), `Notice` (037), `Card`, `EmptyState` and `KpiCard` (040, 041), `HeroBanner` (069), `ProgressBar` (073), `Skeleton` (074), the hooks (075). `Breadcrumbs` get the router fit, and the header uses them (066).

### 8. Code editor and log viewer

The rebuilt search panel (060), the automatic unified diff on narrow containers (061), the field props (062), and the `LogViewer` live region, copy limits and API (063 to 065). It ships together with the live log page where the viewer is first used.

### 9. Kit translations

Ukrainian, Polish, German, Italian and French besides English (072). Plural-aware messages, because Ukrainian and Polish have several plural forms. Dates and numbers follow the locale.

### 10. Guardrails

Keeps the result clean: an ESLint rule that rejects arbitrary Tailwind values outside `var(--...)` (018), a rule against `customClassName` and fixed `data-testid` values, and a check that every token the code uses is defined.

## 3. Order and why

Package 1 can start at any time and does not wait for the others. Packages 2 to 4 are the foundation and run in order. Packages 5 to 8 can then run in any order, and the product owner picks the one that matters most. Package 9 comes after the strings stop changing. Package 10 closes the work.

## 4. Decisions and open questions

- **Start (decided):** no package starts now. The goal of the current phase is the audit, its results and the register. The product owner chooses the first package later.
- **Translations (decided):** machine translation is acceptable for the five languages (package 9).
- **Outside the kit:** the items in section 2 of the [register](../tech-debt.md) (TD-01 to TD-07: role checks, fonts, Node version, README, quote rotation, a test fixture name, the seeded admin) are not in this plan. They form their own packages after the `apps/web` and `apps/server` audit.
