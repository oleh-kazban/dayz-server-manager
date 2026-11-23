# Tech Debt Register

|              |                                                                                       |
| :----------- | :------------------------------------------------------------------------------------ |
| **Status**   | Living document. The UI kit audit is in progress; the other areas are not yet audited |
| **Verified** | Findings were checked against commit `cc0b1dd` unless an entry says otherwise         |
| **Audience** | Maintainers and AI agents                                                             |

Each finding has evidence, an impact and the smallest correction. Findings are collected first and fixed one by one afterwards, in the order the product owner picks. An entry marked **Decision** needs a product or architecture decision before work starts.

| Priority     | Meaning                                                             |
| :----------- | :------------------------------------------------------------------ |
| **Critical** | A serious functional, accessibility or security defect              |
| **High**     | A significant inconsistency, or a defect that blocks other work     |
| **Medium**   | A maintainability, documentation, testing or interaction deficiency |
| **Low**      | A minor improvement with limited impact                             |

Entries that are verified defects are separated from suspected risks. A suspected risk says what check would confirm it.

## 1. UI kit (`libs/ui`)

The audit follows one process per component: investigate (implementation, API, tokens, stories, usage, tests), evaluate, report, then fix after agreement. The criteria are responsibility, public API, design-system consistency, behavior, accessibility, Storybook and tests, and maintainability.

### Audit progress

| Component               | Status                                                      |
| :---------------------- | :---------------------------------------------------------- |
| Button                  | Audited. Findings TD-UI-001 to TD-UI-009 (TD-UI-002 closed) |
| Cross-cutting scan      | Done. Findings TD-UI-010 to TD-UI-012                       |
| Remaining 30 components | Not yet audited                                             |

The cross-cutting scan covered every component for deprecated React APIs, hardcoded colors, off-standard control heights, `size` props, `containerClassName` and missing tests or stories. It found no deprecated APIs (`forwardRef`, `MutableRefObject`), and every component directory has tests and stories.

### Findings

#### TD-UI-001 · Storybook renders no stories when `NX_WORKSPACE_ROOT_PATH` has a lowercase drive · Closed (environment)

- **Where:** the environment of the shell that starts Nx, not the repository.
- **Problem:** with `NX_WORKSPACE_ROOT_PATH=d:\...` (lowercase drive), `pnpm storybook` and `pnpm nx run ui:build-storybook` produce a build in which every story fails with `importers[path] is not a function`.
- **Cause:** Nx reads `NX_WORKSPACE_ROOT_PATH` before the real working directory (`node_modules/nx/dist/src/utils/workspace-root.js:17-18`) and gives Storybook a lowercase-drive cwd. Storybook's bundled path library treats `D:` and `d:` as different drives, so the story keys come out as `./D:/...` while `index.json` has `./libs/...` (`@storybook/builder-vite` `generateImportFnScriptCode`).
- **Evidence:** seven combinations of shell cwd, variable and Nx daemon were run. Only the lowercase variable made a build fail. With `NX_WORKSPACE_ROOT_PATH='D:\...'` the Button story renders with no console errors.
- **Resolution (product owner):** no repository change. The variable comes from the launcher of that session (not found in the repo or the Windows environment). A defensive wrapper script was designed and tested but not added. The fix upstream would be in the path library's `cwd()`.
- **If it returns:** check `echo $env:NX_WORKSPACE_ROOT_PATH`. See [getting started](engineering/getting-started.md).

#### TD-UI-002 · Button: loading state · Closed (by design)

- **Decision (product owner):** a loading button is disabled and shows a spinner. The current behavior is correct: `Button` sets `disabled` while `isLoading` and renders the spinner.
- **Left over:** `SaveButton` uses `aria-disabled` for its "no changes" state, which is a different state with a tooltip, so the two mechanisms do not conflict. A natively disabled button can lose keyboard focus during an async action. That stays an accepted trade-off unless a user-facing problem appears.

#### TD-UI-003 · Button: width changes when loading starts without an icon · Medium

- **Problem:** the spinner replaces `leftIcon` only. With no left icon it is added, widening the button.
- **Evidence:** measured in the browser. A button with no icon grows from 121.3 px to 145.3 px (+24 px) when loading starts. A button with an icon keeps its width (105.2 px), because the spinner replaces the icon. `rightIcon` still disappears while loading.
- **Recommendation:** reserve a fixed slot for the spinner, or keep the width stable while loading.
- **Decision:** no.

#### TD-UI-004 · Button tests check class names, not behavior · Medium

- **Evidence:** six of ten tests in `Button.test.tsx` assert that `className` contains token strings. No test covers keyboard activation (Enter and Space), the `aria-disabled` path used by `SaveButton`, or the `text` variant ignoring icon-only.
- **Impact:** the tests pass when the visuals break and miss real regressions. This breaks the [testing rules](engineering/testing.md#4-what-a-good-test-looks-like).
- **Recommendation:** rewrite around behavior: click, keyboard, loading and disabled states, accessible names.
- **Decision:** no.

#### TD-UI-005 · Button: icon-only API · Medium

- **Decision (product owner):** the kit keeps an icon-only button.
- **Evidence:** all 11 usages of `isIconOnly` are on self-closing buttons that have an icon, so auto-detection (no children plus an icon) already produces the same result. Ten of the eleven are `ghost`; no `secondary` or `primary` icon-only button exists. All 12 icon-only buttons have an accessible name, but nothing in the types enforces it.
- **Problem:** the explicit prop is redundant, and an icon-only button without `aria-label` is allowed by the types.
- **Recommendation:** remove `isIconOnly` and make icon-only a typed form: an icon plus a required `aria-label` and no children, so the accessible name is enforced at compile time.
- **Decision (product owner):** approved as recommended.

#### TD-UI-006 · Button: element-form icons are speculative · Medium

- **Evidence:** `ButtonIcon` accepts a Lucide component, any component, or a React element, and `renderIcon` has a `cloneElement` branch for elements. No production call site passes an element. Only one test does.
- **Recommendation:** accept components only and delete the branch.
- **Decision (product owner):** approved as recommended.

#### TD-UI-007 · Button: `text` and `ghost` need defined roles · Low

- **Decision (product owner):** the kit keeps a text-only variant.
- **Evidence:** `ghost` has 23 usages (11 icon-only, 12 labelled: Cancel, Back, dialog actions). `text` has one (`ModsView`, "Reset to Load Order"). They differ in more than color:

|            | `ghost`                  | `text`               |
| :--------- | :----------------------- | :------------------- |
| Size       | 36 px high, `px-3.5`     | `h-auto`, no padding |
| Color      | muted (`text-secondary`) | brand (`primary`)    |
| Hover      | surface background       | underline            |
| Focus ring | `ring-2` with offset     | `ring-1`, no offset  |

- **Fit:** they are not redundant. `ghost` is a padded low-emphasis action for toolbars and dialog footers, and the icon-only form. `text` is an inline action that must not add height, for example inside a line of text. It is also the more prominent of the two, which reverses the usual emphasis order.
- **Problems:** the focus ring differs. With no padding the hit area is about 16 px high, which is below the WCAG 2.2 target size minimum (24 px) unless it counts as an inline target. A `text` button that navigates should be a link, not a button.
- **Recommendation:** keep both and write down the rule: `ghost` for low-emphasis actions, `text` for inline actions only. Give `text` the same focus ring as the others and a minimum hit area that does not change line height. Use a link for navigation.
- **Decision:** yes, to confirm the roles.

#### TD-UI-008 · Button stories do not match the API · Low

- **Evidence:** the controls for `leftIcon`, `rightIcon` and `isIconOnly` are not wired. `WorkbenchToolbarShowcase` and `TableActionsShowcase` are application compositions, not parts of the Button contract. Storybook renders correctly once the environment is fixed, so this can be checked directly.
- **Recommendation:** wire the controls and move the showcases out of the Button stories.
- **Decision:** no.

#### TD-UI-009 · Button: small cleanups · Low

- **Evidence:** `font-medium` is duplicated in the `text` variant. `aria-busy="false"` is always rendered. The `className` passed by `TableColumnVisibility` repeats what Button already applies.
- **Recommendation:** remove the duplicates.
- **Decision:** no.

#### TD-UI-010 · `HeroBanner` hardcodes colors · Medium

- **Evidence:** `HeroBanner.tsx:146` defines a gradient with `rgba(...)` values. Nine class names use `bg-white/10`, `text-white` and `border-white/...`.
- **Impact:** these ignore the theme tokens. The banner sits on an image, so a fixed light-on-dark treatment may be intended.
- **Recommendation:** define overlay tokens (for example `--color-overlay`, `--color-on-image`) in `themes.css`, or document the exception. No page uses `HeroBanner` today.
- **Decision:** yes.

#### TD-UI-011 · Raw `black` and `white` classes outside tokens · Low

- **Evidence:** `Confirmation.tsx:43` and `KeywordConfirmation.tsx:66` use `bg-black/50` for the scrim. `Toggle.tsx:143` uses `bg-white` for the knob. The app sidebar scrim uses `bg-black/60` as well.
- **Recommendation:** add a scrim token and a toggle-knob token, then use them everywhere.
- **Decision:** yes, to approve new tokens.

#### TD-UI-012 · Segmented `Tabs` are 32 px high · Low

- **Evidence:** `Tabs.tsx:110` uses `h-8` for the `segmented` variant. The standard for interactive controls is 36 px (`h-9`). One call site uses the variant.
- **Recommendation:** use `h-9`, or document tabs as a separate control class.
- **Decision:** yes.

#### TD-UI-013 · `customClassName` duplicates `containerClassName` · Medium

- **Where:** `Input`, `PasswordInput`, `Autosuggest`, `Checkbox`, `DatePicker` and `FileUploader` declare both props, and `Loader` has only `customClassName`.
- **Evidence:** `Input.tsx` resolves `containerClassName || customClassName`. No code outside the kit passes `customClassName`. The standard (`containerClassName` on the outermost wrapper) is the documented one.
- **Impact:** two names for one hook, with an unclear winner. It breaks the consistency pillar.
- **Recommendation:** remove `customClassName` everywhere and give `Loader` a `className`. Check each remaining control against the same rule.
- **Decision:** no (it follows the existing standard).

#### TD-UI-014 · Arbitrary font sizes across the kit · Medium

- **Evidence:** about 80 hardcoded sizes in kit sources: 46 × `text-[11px]`, 28 × `text-[10px]`, 2 × `text-[9px]`, 2 × `text-[13px]`, plus `text-[27px]` and `text-[32px]`. The scale in the [design system](design/design-system.md) is 12 px (`text-xs`) upward.
- **Impact:** type sizes drift per component, and nothing says which small size is correct for errors, badges or metadata.
- **Decision (product owner):** the design system has no hardcoded values. Named small-text tokens are defined and the literals are replaced.
- **Recommendation:** start from two tokens, `--text-caption` (11 px, for errors, helper text and metadata) and `--text-micro` (10 px, for badges and counters), each with a line height. Map the single `9px` and `13px` uses to the nearest token. The names and values are proposals to confirm when the work starts.

#### TD-UI-018 · Hardcoded values beyond colors and font sizes · Medium

- **Rule (product owner):** the design system has no hardcoded values. Every color, size, radius, shadow and font size comes from a token.
- **Evidence from the scans so far:** raw `rgba(...)` and `white`/`black` classes (TD-UI-010, TD-UI-011), arbitrary font sizes (TD-UI-014), and fixed dimensions such as the sidebar widths (`w-[228px]`, `w-[260px]`) and hardcoded radii and shadows in individual components. A full inventory of arbitrary Tailwind values (`[...]` classes that are not `var(--...)`) is part of the audit of each component.
- **Recommendation:** list the arbitrary values per component as the audit proceeds, then add tokens for the ones that recur, and review the rest case by case. Consider a lint rule that rejects arbitrary values outside `var(--...)`, once the inventory is down.
- **Decision:** yes, to approve the lint rule when the time comes.

#### TD-UI-015 · `PasswordInput` toggle is a hand-built 20 px button · Medium

- **Where:** `libs/ui/src/input/PasswordInput.tsx`.
- **Evidence:** measured in Storybook: the show or hide button is 20 × 20 px, below the WCAG 2.2 target size minimum of 24 px. The spacing exception may not apply, because the input field sits 10 px away. It is a raw `<button>` with its own focus ring (`ring-1`) instead of the kit's icon-only `Button`.
- **Recommendation:** use the kit's icon-only `Button` (ghost) at a compliant size, which also gives it the standard focus ring.
- **Decision:** no.

#### TD-UI-016 · `PasswordInput` API duplicates `Input` · Low

- **Evidence:** `PasswordInputProps` is a hand copy of `InputProps` without `rightAction`. `showToggle` is never passed by any consumer, only by a test.
- **Recommendation:** derive the props from `InputProps`, and remove `showToggle` (the toggle is the point of the component).
- **Decision:** no.

#### TD-UI-017 · `Input` small cleanups · Low

- **Evidence:** the input sets both `disabled` and `aria-disabled`, and renders `aria-disabled="false"` when enabled. The ref merge uses a type assertion. The Storybook story text cites a section of the old specification ("§2.2.1") that no longer exists.
- **Recommendation:** drop `aria-disabled`, simplify the ref handling, and remove the reference.
- **Decision:** no.

## 2. Other known items (not yet audited)

These came up while writing the documentation. Each was verified against the code, but the areas have not had a full audit.

| ID    | Priority | Item                                                                                                                                                                               | Evidence                                                                                      |
| :---- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| TD-01 | Medium   | **Role checks are duplicated and cannot fail.** About 35 `ensureAdminRole` and `requireAdmin` call sites; replace with one `requireRoot` on operator endpoints (**Decision made**) | `apps/server/src/routes/{servers,server-mods,steam,workshop,server-config,launch-command}.ts` |
| TD-02 | Medium   | **Fonts load from Google Fonts at runtime.** Offline or LAN hosts fall back to system fonts and every page load contacts Google (**Decision**: bundle locally)                     | `libs/ui/src/styles/fonts.css`, `apps/web/src/styles/fonts.css`                               |
| TD-03 | Medium   | **Node version is inconsistent.** CI runs Node 24, the README says 20 or 22, and there is no `engines` or `.nvmrc`. Target: the latest LTS (26), pinned                            | `.github/actions/setup-workspace/action.yml`, `README.md`, `package.json`                     |
| TD-04 | Medium   | **README is stale.** The roadmap shows built features as unchecked and the Moderator and Viewer roles no longer exist                                                              | `README.md` roadmap and roles sections                                                        |
| TD-05 | Low      | **Footer quote rotation** differs from the design decision (**Decision**: rotate every 60 s, or change per session)                                                                | `apps/web/src/features/flavor-text/use-flavor-text.ts`                                        |
| TD-06 | Low      | **Test fixture name** carries an unrelated project name                                                                                                                            | `apps/server/src/services/server/battleye-config.service.spec.ts:25`                          |
| TD-07 | Low      | **Seeded `admin`/`admin` account** until the first-run root setup exists                                                                                                           | `README.md`, `apps/server` seed                                                               |
