# Tech Debt Register

|              |                                                                                                                     |
| :----------- | :------------------------------------------------------------------------------------------------------------------ |
| **Status**   | Living document. The UI kit, server and web app audits are complete (first pass); the libraries are not yet audited |
| **Verified** | Findings were checked against commit `cc0b1dd` unless an entry says otherwise                                       |
| **Audience** | Maintainers and AI agents                                                                                           |

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

| Component                                           | Status                                                                                                          |
| :-------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| Button                                              | Audited. Findings TD-UI-001 to TD-UI-009 (TD-UI-001 and TD-UI-002 closed)                                       |
| Cross-cutting scan                                  | Done. Findings TD-UI-010 to TD-UI-012, TD-UI-014, TD-UI-018 to TD-UI-022                                        |
| Input, PasswordInput                                | Audited. Findings TD-UI-013, TD-UI-015 to TD-UI-017                                                             |
| Select, Checkbox, Toggle                            | Audited. Findings TD-UI-024 to TD-UI-027                                                                        |
| Autosuggest, DatePicker, TagInput, TagSelect        | Audited from the source and checked in Storybook. Findings TD-UI-023, TD-UI-028 to TD-UI-033                    |
| Card, KpiCard, Tag, StatusTag, Notice, EmptyState   | Audited from the source and checked in Storybook. Findings TD-UI-034 to TD-UI-041                               |
| Confirmation, Tooltip, Toast, menus, `usePopup`     | Audited from the source and checked in Storybook. Findings TD-UI-042 to TD-UI-048                               |
| Table, TableColumnVisibility, TableBulkActions      | Audited from the source and checked in Storybook. Findings TD-UI-049 to TD-UI-054                               |
| Tabs                                                | Audited from the source and checked in Storybook. Findings TD-UI-055 to TD-UI-058                               |
| CodeEditor, CodeDiffView                            | Audited from the source and checked in Storybook. Findings TD-UI-059 to TD-UI-062                               |
| LogViewer                                           | Audited from the source and checked in Storybook. Findings TD-UI-063 to TD-UI-065                               |
| Breadcrumbs                                         | Audited from the source and checked in Storybook. Finding TD-UI-066                                             |
| FileUploader                                        | Audited from the source and checked in Storybook. Findings TD-UI-067 and TD-UI-068                              |
| HeroBanner                                          | Audited from the source and checked in Storybook. Finding TD-UI-069 (colors: TD-UI-010)                         |
| Loader                                              | Audited from the source and checked in Storybook. Finding TD-UI-070                                             |
| Pagination                                          | Audited from the source and checked in Storybook. Findings TD-UI-071 and TD-UI-072 (kit strings, cross-cutting) |
| ProgressBar                                         | Audited from the source and checked in Storybook. Finding TD-UI-073                                             |
| Skeleton, hooks `useSortableList` and `useDebounce` | Audited. Findings TD-UI-074 and TD-UI-075                                                                       |
| Remaining                                           | None. The component audit is complete                                                                           |

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

- **Where:** `Input`, `PasswordInput`, `Select`, `Toggle`, `Autosuggest`, `Checkbox`, `DatePicker` and `FileUploader` declare both props, and `Loader` has only `customClassName`. `Select` labels it a "legacy container className alias".
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

#### TD-UI-019 · Ref-merge code is copied into 10 components · Medium

- **Evidence:** the same "assign a function or object ref" block (`'current' in ref`, often with a type assertion) appears in `DatePicker`, `Input`, `DotsFloatingMenu`, `FloatingMenu`, `NotificationMenu`, `Select` (as `assignRef`), `TableColumnVisibility`, `Tabs`, `TagInput` and `TagSelect`. `Checkbox` has a variant of it.
- **Recommendation:** one tested `useMergedRef` helper in `libs/ui/src/hooks`, used everywhere.
- **Decision:** no.

#### TD-UI-020 · Focus indicators differ across components · Medium

- **Evidence:** 29 × `focus-visible:ring-1`, 6 × `focus-visible:ring-2`, 10 × `focus-within:ring-1`, and only three uses of a ring offset. `Button` and `Checkbox` use `ring-2` with an offset. `Toggle`, the clear and show buttons, and most others use a 1 px ring with no offset or `ring-offset-1`.
- **Impact:** keyboard users see a different focus style depending on the control, and the 1 px rings are hard to see on some themes.
- **Recommendation:** define one focus-ring token (width, offset, color) and use it in every component.
- **Decision (product owner):** one focus style everywhere. Proposed: 2 px ring with a 2 px offset, as `Button` has today.

#### TD-UI-021 · Small touch and click targets · Medium

- **Evidence (from the classes, not measured in a browser except the first):** the `PasswordInput` toggle is 20 × 20 px (measured), the `Select` clear button is about 18 × 18 px (`p-0.5` plus a 14 px icon), the `Toggle` track is 32 × 18 px, and a `Checkbox` is 16 × 16 px (its label enlarges the target when present). WCAG 2.2 sets a 24 px minimum target. The kit has 39 raw `<button>` elements outside `Button`.
- **Recommendation:** use the kit's icon-only `Button` where a control has a button, and give toggles and checkboxes a 24 px minimum target.
- **Decision:** no. It follows TD-UI-005 and TD-UI-015.

#### TD-UI-022 · Form label and hint typography is inconsistent · Medium

- **Evidence:** `Input` and `Select` labels are 12 px, medium weight, main color. `Checkbox` labels are 11 px in the secondary color. `Toggle` labels are 12 px. Error text is 11 px in `Input` and `Checkbox` but 12 px in `Select`. Descriptions are 10 px in `Checkbox` and `Toggle`.
- **Recommendation:** define one form-label style and one form-hint style as tokens (with TD-UI-014) and use them in every field.
- **Decision (product owner):** one style everywhere. Proposed: labels 12 px medium in the main color, hints and errors in the caption token (11 px).

#### TD-UI-023 · Four components have no consumers · Medium

- **Evidence:** `Autosuggest` (369 lines), `DatePicker` (275), `TagInput` (444) and `TagSelect` (415) are not used by any application code or by any other kit component. No backlog item names them. They carry tests, stories and, for `DatePicker`, the `react-day-picker` dependency. About 1,500 lines of source in total.
- **Impact:** every audit, dependency update and design change has to keep them correct, with no user for them.
- **Recommendation:** keep them if features on the roadmap need them (for example the Types workbench filters or the restart scheduler) and audit them when those features start, or remove them now and restore them from history when needed.
- **Decision (product owner):** keep all four. They are audited in detail and made clean and tidy like the rest of the kit (consumer-free does not mean exempt from the standards).

#### TD-UI-024 · `Select`: unused options and a large file · Medium

- **Evidence:** the app uses `Select` 10 times. `clearable`, `renderOption` and `renderValue` are never passed. `helperText` and `leftIcon` are passed once each. `Select.tsx` is 608 lines and holds the popup, the keyboard logic and the option rows. The project convention puts helpers in `*.utils.ts`.
- **Recommendation:** drop the three unused props, or keep them only after a consumer needs them. Move the keyboard and option helpers into `select.utils.ts`.
- **Decision (product owner):** keep `clearable`, `renderOption` and `renderValue`; they will be needed for flexibility. Condition: a kept prop must have a test and a story. `clearable` has both. `renderOption` and `renderValue` have neither today, so they need a story and a test that prove they work. Moving the helpers into `select.utils.ts` still applies.

#### TD-UI-025 · `Select`: robustness · Low

- **Evidence:** `aria-controls` points at the listbox id while the listbox is not in the DOM (it renders only when open). `key={String(option.value)}` and the `===` comparison break for object values, but the generic `T` is not restricted to primitives. The popup uses `shadow-lg` and `rounded-xl` instead of the `--shadow-dropdown` and radius tokens (14 other places use the shadow token).
- **Recommendation:** set `aria-controls` only while open, restrict `T` to `string | number`, and use the tokens.
- **Decision:** no.

#### TD-UI-026 · `Checkbox` and `Toggle`: redundant ARIA · Low

- **Evidence:** `Checkbox` sets `aria-checked="mixed"` on a native checkbox. `Toggle` sets `aria-checked` on a native checkbox with `role="switch"`. The native `indeterminate` and `checked` states already reach assistive technology, and ARIA in HTML advises against `aria-checked` on `input type=checkbox`. `Checkbox` also focuses itself through an effect instead of the native `autoFocus`.
- **Recommendation:** remove the redundant attributes and keep the tests on the native state.
- **Decision:** no.

#### TD-UI-027 · `Toggle` color variants · Low

- **Evidence:** `color` offers `primary`, `success` and `danger`. One call site uses `danger` (the `filePatching` launch option), and none uses `success`. The hover fills reuse the `-border` tokens (`--color-status-success-border`), which are border colors. The knob is `bg-white` (TD-UI-011).
- **Recommendation:** drop `success`, add a proper hover token or a darker `-hover` color, and use a knob token.
- **Decision (product owner):** `color` has two options only, brand (`primary`) and `danger`. Remove `success`.

> The next six findings come from reading the source of `Autosuggest`, `DatePicker`, `TagInput` and `TagSelect`, then checking the doubtful ones in a Storybook build with Playwright. **Verified** marks a behavior seen in the browser, **Code** a fact read from the source, and **Not verified** an item no story could show.

#### TD-UI-028 · Each form control re-implements the field shell · Medium

- **Evidence:** the label block, the error paragraph (`text-[11px] ... leading-tight`), the `containerClassName || customClassName` resolution, the border classes for the error state and the ref merge are copied into `Input`, `Select`, `Autosuggest`, `DatePicker`, `TagInput` and `TagSelect`. `TagInput` and `TagSelect` each define their own `getContainerBorderClasses` or `getTriggerBorderClasses`. `Autosuggest` has a fixed search icon and no `leftIcon`, while `Input` has one.
- **Impact:** every design decision (TD-UI-020, TD-UI-022, TD-UI-014) must be applied six times, and the copies already drift.
- **Recommendation:** one `FormField` wrapper for label, hint and error, one shared control-surface class helper (border, ring, disabled state), and `useMergedRef` (TD-UI-019). This is the structural fix behind most form-related findings.
- **Decision:** no.

#### TD-UI-029 · Popup surfaces and option rows differ between controls · Medium

- **Evidence:** the dropdown surface is written out in `Select`, `Autosuggest`, `DatePicker`, `TagInput` and `TagSelect`. `Autosuggest` and `DatePicker` use `shadow-[var(--shadow-card)]`, the other three use `shadow-lg`, and a `--shadow-dropdown` token exists. `TagInput` and `TagSelect` animate in (`animate-in fade-in zoom-in-95`), the others do not. `z-50` is a class in some and an inline `zIndex: 50` in others. Option rows are copied four times (`Select`, `Autosuggest`, `TagInput`, `TagSelect`) with different highlight colors: `Autosuggest` highlights in the primary tint, `TagInput` in the subtle surface. `TagSelect` hardcodes a minimum width of 220 px.
- **Recommendation:** a shared `PopupSurface` and `OptionRow` (or tokens plus one class helper) with one shadow, one radius, one motion and one z-index token (TD-UI-018).
- **Decision:** no.

#### TD-UI-030 · `TagSelect` accessibility and keyboard · High

- **Evidence:**
  - **Verified:** the trigger is a `div` with `role="combobox"` that contains three real buttons in the default story (two tag remove buttons and the clear-all button). Interactive controls nested in a combobox fail the "nested-interactive" accessibility rule.
  - **Verified:** the search field in the popup has no `aria-label` (placeholder only).
  - **Verified:** after opening with Enter, focus stays on the trigger. Tab moves to the clear-all button, then to each tag's remove button, while the popup stays open and focus never enters it. A keyboard user cannot reach the search field, which sits at the end of `body`.
  - **Not verified:** the arrow keys highlight disabled options (`TagInput` skips them). No story has a disabled option. The code shows it.
  - **Code:** the same arrow and escape handling is written twice (`handleTriggerKeyDown` and `handlePopupKeyDown`).
  - The clear-all button is about 18 px square with no focus style (`focus:outline-none`), see TD-UI-021.
- **Recommendation:** make the trigger a button-like element that holds the tags outside the combobox role, move focus to the search field on open and return it on close, label the search field, skip disabled options, and use one key handler.
- **Decision:** no.

#### TD-UI-031 · `TagInput` behavior · Medium

- **Evidence:**
  - **Verified:** Escape leaves the component in an inconsistent state. The popup becomes invisible (`visibility: hidden`) but its listbox stays in the DOM, so the open state (`showSuggestions`) and the popup state (`usePopup`) disagree. It shows again only after the filter changes.
  - **Verified:** selecting the suggestion "Hunting" (value `hunting`) adds a chip that reads `hunting`, not the label (`TagSelect` shows the label).
  - **Verified:** clicking the empty area inside the field leaves focus on `body`, though the cursor suggests it focuses the input.
  - **Code:** the popup open state lives twice: `usePopup` keeps one and an effect copies `showSuggestions` into it.
  - **Code:** the input disappears when `maxTags` is reached. The label then points at nothing and focus is lost (no story sets `maxTags`).
  - **Code:** there is no `name` prop, so the control cannot take part in a native form (`TagSelect` renders hidden inputs).
  - **Code:** the default `transformTag` is a new function on every render, which defeats the `useCallback` around `commitTag`.
  - **Code:** suggestion rows set `aria-selected` for the highlighted row; in a listbox that attribute means selected, not highlighted (`Autosuggest` does the same).
- **Recommendation:** fix each item with a test. Keep the input (disabled) at the limit, or move focus to the last chip.
- **Decision:** no.

#### TD-UI-032 · `DatePicker` · Medium

- **Evidence:**
  - **Code:** the trigger's `aria-label` replaces its visible `<label>`. The stories pass an `ariaLabel` equal to the label, so they look right (**Verified**: both read "Backup Snapshot Date"). A consumer that omits `ariaLabel` gets the default "Select date", and assistive technology never reads the visible label.
  - **Verified:** the calendar opens with focus on the selected or current day, the weekday header starts on Sunday ("Su") and is English only.
  - A hidden `<input type="date">` with an empty `onChange` exists only to reuse native form validation, and the open handler finds the focus target with `button[tabindex="0"]`, which depends on `react-day-picker` internals.
  - `react-day-picker/style.css` is imported in full and then overridden by `classNames`, inline `--rdp-*` variables and `[&_.rdp-...]` selectors. Sizes (28 px), `text-[10px]` and colors are hardcoded (TD-UI-014, TD-UI-018).
  - Both month buttons repeat the same class string. The clear button is about 22 px with no focus style.
  - The validation messages ("A date is required.") are fixed English strings.
  - The component exposes no locale or week-start option. **Decision (product owner):** locale support is wanted.
- **Recommendation:** name the trigger from the visible label (`aria-labelledby`), drop the duplicated style overrides, and decide on locale support.
- **Decision:** no.

#### TD-UI-033 · `Autosuggest` · Low

- **Evidence:**
  - Option rows select on `onMouseDown` and again on `onClick`. **Verified:** a mouse click selects once, because the list unmounts on mouse down and the click never fires. The `onClick` handler serves keyboard and assistive-technology activation, so it stays. Not a defect.
  - Both `disabled` and `aria-disabled` are set (as in TD-UI-017).
  - The clear button has no focus style and an icon-sized target (TD-UI-021).
  - "Searching...", "Clear search" and the default placeholder are fixed English strings.
  - The input uses `focus:ring-1` (TD-UI-020), `text-xs` and `text-[11px]` (TD-UI-014).
- **Recommendation:** apply the shared decisions from TD-UI-020 to TD-UI-022.
- **Decision:** no.

> The next eight findings cover the display components. The labels are the same: **Verified** (seen in Storybook), **Code** (read from the source).

#### TD-UI-034 · Reduced-motion preference is ignored · Medium

- **Verified:** with `prefers-reduced-motion: reduce` emulated, `StatusTag` still runs `animate-ping` and the `KpiCard` skeleton still runs `animate-pulse`. Only two custom animations (`animate-bell-ring`, `animate-popup-enter`) have a reduced-motion rule in `keyframes.css`.
- **Code:** the same Tailwind utilities (`animate-spin`, `animate-pulse`, `animate-ping`, `animate-in`) are used by `Button`, `Loader`, `Skeleton`, `ProgressBar`, `NotificationMenu`, `Autosuggest`, `TagInput`, `TagSelect` and `TableColumnVisibility`.
- **Impact:** users who ask the system for less motion still get continuous animation. The design system lists reduced motion as an accessibility rule.
- **Recommendation:** one global `prefers-reduced-motion` rule in the kit styles that disables or shortens animation and transition durations, with a test or story note.
- **Decision:** no.

#### TD-UI-035 · Semantic color maps are copied between `Tag`, `StatusTag` and `Notice` · Medium

- **Code:** `Tag` and `StatusTag` each hold the same three maps (subtle, solid, outline) over the same six colors, plus identical shape maps and icon renderers (`renderTagIcon`, `renderStatusTagIcon`). `Notice` holds a fourth copy of the subtle map. `Tag` has a `neutral` variant that duplicates `variant="subtle"` with `color="default"`. `Tag` and `StatusTag` both use `customClassName || className`.
- **Impact:** a color change must be made in three files. `StatusTag` is a `Tag` with a dot, so it can be built on `Tag`.
- **Recommendation:** one shared tone map (`tone.utils.ts`) used by all three, `StatusTag` composed from `Tag`, and `neutral` removed.
- **Open question:** `Notice` with `variant="info"` uses the brand color (`--color-primary`), while `Tag` and `StatusTag` use `--color-status-info`. **Decision (product owner):** `info` uses the info token everywhere, for consistency.
- **Decision:** no.

#### TD-UI-036 · `StatusTag` is a live region by default, and `Tag` names a plain `span` · Medium

- **Verified:** one `StatusTag` story renders 22 elements with `role="status"`. In a table of servers, every tag becomes a live region, so a screen reader may announce many changes at once.
- **Code:** `Tag` accepts `aria-label` on a `span` with no role. ARIA does not allow a name on a generic element, so assistive technology ignores it.
- **Recommendation:** make `role` opt-in on `StatusTag` (use it for a single indicator that changes while the user watches). Drop `aria-label` from `Tag`, or give the element a role when a name is passed.
- **Decision:** no.

#### TD-UI-037 · `Notice` ARIA and heading · Medium

- **Verified:** the `warning` notice has `role="alert"` and `aria-live="polite"`, which contradict each other (an alert is assertive). `error` is `alert` and `assertive`, `info` is `status` and `polite`.
- **Verified:** the title is always an `h5`. `Card` offers `titleLevel` and `EmptyState` offers `titleAs` for the same purpose, so three components solve the heading level in three ways.
- **Code:** `variant` accepts both `error` and `danger` (an alias). The app passes `error` 9 times and `danger` once, and `ConfigLockBanner` mixes `warning`, `info` and `danger` in one file. The other components use `danger`. The close button is a hardcoded 36 px square with a 1 px focus ring (TD-UI-020).
- **Recommendation:** drop the `aria-live` override and let the role decide (warning becomes `status` unless it blocks work). Use one heading prop name (`titleAs`) with a sensible default in all three components. Settle on `danger` as the only name and migrate the 10 call sites.
- **Decision:** no.

#### TD-UI-038 · Test hooks ship in the production DOM · Low

- **Verified:** `data-testid="kpi-sparkline"` is present in the rendered `KpiCard`. **Code:** `kpi-skeleton`, `empty-state-icon`, `hero-banner-bg` and `hero-banner-scrim` are the same. The testing rules say to query by role, label and text.
- **Recommendation:** remove the fixed test IDs from the components and let tests query by role or by a passed-in `data-testid`.
- **Decision:** no.

#### TD-UI-039 · `Tag` small details · Low

- **Verified:** the remove button is 18 × 18 px (TD-UI-021). **Code:** the tag has a hardcoded negative margin (`-mr-[7px]`), a 1 px `ring-current` focus ring (TD-UI-020), and uses `rounded-md` while form controls use `rounded-lg`. `title` is passed through, but a truncated tag has no tooltip by default.
- **Recommendation:** make the remove button an icon-only `Button` (TD-UI-005), and replace the margin with a spacing token.
- **Decision:** no.

#### TD-UI-040 · `KpiCard` · Medium

- **Verified:** the component has no consumer in the app (0 uses). **Verified:** the loading skeleton has no `aria-busy`, no role and no text, so assistive technology reads nothing.
- **Code:** hardcoded `min-h-[114px]`, `text-[27px]`, sparkline defaults of 94 × 35 and stroke width 2 (TD-UI-014, TD-UI-018). `aria-label` and `aria-labelledby` are set on a `div` with no role. The sparkline `svg` block is written twice (children and data variants). `isLoading` replaces children, so a compound card cannot show a skeleton of its own shape.
- **Recommendation:** add `role="group"`, a loading label, tokens for size and one sparkline element.
- **Decision (product owner):** keep it; it was built in advance for a planned feature.

#### TD-UI-041 · `Card` and `EmptyState` · Low

- **Code:** `Card` has 16 uses in 11 files. `EmptyState` has 2 (`MarkdownViewer`, `FaqModal`). An earlier version of this entry said "no consumer" for `EmptyState` because a search missed JSX that wraps onto the next line; the counts here were redone with a multi-line aware search.
- **Code:** `Card` renders `children &&`, so a child of `0` shows nothing, uses a type assertion for `ref` and has a fixed `p-5` with no density option. `EmptyState` has `text-sm sm:text-base`, `sm:text-[13px]` and fixed widths (`max-w-sm`, `max-w-md`) that are not tokens. `Card` takes props (`title`, `actions`, `footer`) while `KpiCard` and `EmptyState` use slots, so the kit has two composition styles.
- **Recommendation:** pick one composition style for new components (props with optional slots), and use tokens for sizes.
- **Decision:** no.

> The next seven findings cover the overlays: `Confirmation`, `KeywordConfirmation`, `Tooltip`, `Toast`, the three menus and `usePopup`. Use counts in the app: `Confirmation` 10 (6 files), `KeywordConfirmation` 1, `Tooltip` 1, `DotsFloatingMenu` 1, `NotificationMenu` 1, `FloatingMenu` 0, toasts through `notify.ts`.

#### TD-UI-042 · Two modal systems, and no `Modal` in the kit · High

- **Code:** `Confirmation` and `KeywordConfirmation` use the native `<dialog>` with `showModal()`. Nine app modals (`StopServerDialog`, `AddModModal`, `EditModModal`, `ExportPresetModal`, `ImportModsModal`, `CreateServerModal`, `SteamDiagnosticsModal`, `SteamGuardChallengeModal`, `FaqModal`) use a `div role="dialog"` with the app hook `useModalDialog`, which re-implements Escape, the Tab focus trap, the scroll lock and a workaround for stacked native dialogs (`hasStackedDialog`). The kit has no `Modal`, `Drawer` or `Popover`.
- **Verified:** an element appended to `body` with `z-index: 9999` (the toaster) is painted under the backdrop of an open native modal, and a hit test at its position returns the dialog. A toast raised while a `Confirmation` is open sits under the backdrop and its close button cannot be used. The same applies to every `usePopup` popup (`z-50`) rendered inside a native modal.
- **Impact:** focus handling, scroll lock, backdrop, animation and Escape exist twice and differ. A failure toast during a native dialog breaks the feedback contract visually.
- **Recommendation:** one kit `Modal` on the native `<dialog>`, used by every modal; `Confirmation` built on it; `useModalDialog` retired. Render toasts and popups in the top layer (the `popover` attribute) so they stack correctly.
- **Decision (product owner):** standardize on the native `<dialog>`. This is the largest overlay change.

#### TD-UI-043 · `Confirmation` and `KeywordConfirmation` · Medium

- **Code:** the two components share about 70 lines (header, icon, close button, cancel and confirm buttons, timer text) and differ only by the keyword input. Both hardcode `backdrop:bg-black/50` (TD-UI-011) and `rounded-2xl`. The corner close button and `Cancel` do the same thing, and the close button uses `isIconOnly` (TD-UI-005).
- **Code:** in `KeywordConfirmation` the input has no label (the keyword is its placeholder), and the instruction "Type ... to confirm" is a sibling paragraph not linked with `aria-describedby`.
- **Code, to verify in the running app:** a confirm click closes the native dialog first and then calls `onConfirm`. The app passes `isLoading={mutation.isPending}` from five call sites, but by then the dialog is already closed, so the spinner and the blocked Escape are never visible. The Storybook stories cannot show this, because they unmount the dialog on confirm.
- **Recommendation:** build both on a shared `ConfirmDialogShell`, label the keyword input, and decide the confirm flow: either keep the dialog open until the action ends (then `isLoading` works), or remove `isLoading`.
- **Decision (product owner):** the dialog stays open with a spinner while the action runs, then closes when it ends. `isLoading` stays and must work. On failure the dialog stays open and the error toast shows (see TD-UI-042).

#### TD-UI-044 · `Tooltip` · Medium

- **Code:** the trigger is wrapped in an extra `span.inline-flex`, which can change the layout of the child. The tooltip opens on hover and focus only, so it never appears on a touch device. The 250 ms and 100 ms delays and `shadow-md` are hardcoded, two `data-testid` values ship in the DOM (TD-UI-038), and `children as ReactElement` is a cast with no runtime guard. It has one consumer (`SaveButton`).
- **Decision (product owner):** a tooltip does nothing on touch devices. It is a hint for hover and keyboard focus, so essential text must not live only in a tooltip.
- **Recommendation:** read the delays from tokens, remove the wrapper where possible, and decide the touch behavior.
- **Decision:** no.

#### TD-UI-045 · `Toast` · Medium

- **Verified:** the close button is 22 × 22 px (TD-UI-021), the title is an `h3` inside a live region, and the toaster container has `z-index: 9999` while every other popup uses `z-50` (there is no z-index scale, TD-UI-042).
- **Code:** every toast lasts 4000 ms, errors included. A failure toast is the contract's only signal of an error, and a long description can be gone before it is read. The `info` type uses the brand color (the product owner decided that `info` uses the info token everywhere, TD-UI-035). The type is `error`, while `Tag`, `StatusTag` and `NotificationMenu` say `danger` and `Notice` accepts both (four vocabularies).
- **Decision (product owner):** an error toast stays until the user dismisses it.
- **Recommendation:** per-type default durations, a `danger` name everywhere, and a non-heading title element.
- **Decision:** no.

#### TD-UI-046 · The three menus overlap · Medium

- **Code:** `FloatingMenu` and `DotsFloatingMenu` share about 90 lines (trigger ref merge, closing when disabled, focusing the first option, arrow, Home and End handling). `FloatingMenu` supports no disabled options while `DotsFloatingMenu` does. `FloatingMenu` picks one value, as `Select` does, with a different role (`menuitemradio` against `listbox`). `DotsFloatingMenu` keys options by `label`, so two equal labels collide. The triggers are raw `button` elements with a 1 px focus ring (TD-UI-005, TD-UI-020), and `aria-controls` points at a menu that does not exist while closed (TD-UI-025). These two menus are the only popups that use `--shadow-dropdown` (TD-UI-029).
- **Decision (product owner):** keep `FloatingMenu` (built in advance) and define the split: `Select` for form fields, `FloatingMenu` for toolbar and filter choices. Document it in the component stories.
- **Recommendation:** one `useMenuKeyboard` hook for both, disabled options in both, and a key from a stable id.
- **Decision:** no.

#### TD-UI-047 · `NotificationMenu` · Medium

- **Verified:** at a 390 px viewport the panel is 384 px wide and spans 8 to 392 px, so it overflows the right edge (more on a 360 px phone). `usePopup` returns a `maxWidth`, but the panel ignores it and uses a fixed `w-96`.
- **Verified:** the per-item dismiss button (22 × 22 px) has `opacity: 0` at rest and appears on hover or focus, so touch users never see it.
- **Code:** the row content is written twice (button variant and `div` variant, about 35 duplicated lines). The empty state re-implements `EmptyState`. The panel is a `role="dialog"` popover that moves focus in but does not trap it. It hardcodes `text-[10px]`, `text-[11px]` and `max-h-84`. It has one consumer (`Header`).
- **Recommendation:** apply `maxWidth` from `usePopup` with a `w-[min(24rem,100vw-1rem)]` style size, always show the dismiss control (or show it on touch), extract one row layout, and reuse `EmptyState`.
- **Decision:** no.

#### TD-UI-048 · `usePopup` · Medium

- **Code:** eight components use the hook (`Select`, `Autosuggest`, `DatePicker`, `TagInput`, `TagSelect`, `FloatingMenu`, `DotsFloatingMenu`, `NotificationMenu`), and each one re-implements the same surrounding code: ref merge (TD-UI-019), closing when disabled, focus on open, and the popup surface (TD-UI-029).
- **Code:** the hook closes the popup on Escape through its own document listener. That is the root cause of the `TagInput` state mismatch in TD-UI-031: the component computes "open" from its own state, so after Escape its listbox stays in the DOM, hidden.
- **Code:** popups render in `document.body` with `z-50`, so inside a native modal they fall under it (TD-UI-042).
- **Recommendation:** make the hook return props for the trigger and the popup (ref, ARIA, keys), own the open state, and render in the top layer.
- **Decision:** no.

> The next five findings cover `Table`, `TableColumnVisibility` and `TableBulkActions` (one consumer: `ModsView`). The drag-and-drop hook `useSortableList` is covered in TD-UI-075.

#### TD-UI-049 · `Table` accessibility · High

- **Verified:** the scroll region (`role="region"`) has no `tabindex`, though it carries focus styles. A keyboard user cannot scroll a table that is wider than its container.
- **Verified:** `aria-selected` is set on three `<tr>` elements in a plain table. ARIA allows it on rows only in a `grid` or `treegrid`, so the selection is not announced.
- **Verified:** a sortable `<th>` is a clickable cell with `role="columnheader"` and `tabindex="0"`, with no button inside. Enter sorts and a 2 px focus ring shows, but assistive technology does not announce a control.
- **Code:** when a consumer passes `aria-label` (`ModsView` does), the region and the `<table>` both receive it, so the name is read twice. `isClickable` rows only change the cursor: they have no keyboard access and no role.
- **Recommendation:** make the region focusable (`tabIndex={0}`) and name only one element, put a `<button>` inside sortable headers (keep `aria-sort` on the `<th>`), show selection with a checkbox column instead of `aria-selected`, and open a clickable row from a link or button in its first cell.
- **Decision:** no.

#### TD-UI-050 · `Table` API · Medium

- **Code:** in `TableHead`, `{...props}` is spread after the internal `onClick`, `onKeyDown` and `tabIndex`. A consumer's `onKeyDown` therefore replaces the sort key handler (the handler calls `props.onKeyDown` itself, but the spread then overwrites it).
- **Code:** `TableSortDirection` is `'asc' | 'desc' | false | null`, plus `undefined`: `false` means sortable but unsorted, `undefined` means not sortable (unless `onSort` is set), `null` shows no icon. Three "not sorted" values.
- **Code:** `TableEmptyProps` declares `children`, `aria-label` and `data-testid`, and `children` is never rendered. `TableEmpty` uses an `h5` for its title (see TD-UI-037). Every sub-component type repeats `className` and `children`, which `HTMLAttributes` already has.
- **Code:** the column checkboxes get the id `col-toggle-<column id>`, which collides when two tables share a page. The table has no loading state (skeleton rows) and no sticky header. `first:pl-5 last:pr-5` and the row paddings are hardcoded (TD-UI-018).
- **Recommendation:** spread `props` first, then the internal handlers, and use one sort-state type (`'asc' | 'desc' | 'none'`, with sortability from `onSort`). Add a loading state, because every list needs one for the feedback rules.
- **Decision:** no.

#### TD-UI-051 · Empty states are built four times · Medium

- **Code:** `TableEmpty`, `NotificationEmptyState` (in `NotificationMenu`), `EmptyState`, and the plain text rows in `TagSelect` all draw an icon circle, a title and a description with different sizes and heading levels (`h5`, `p`, `h3`).
- **Recommendation:** `TableEmpty` and `NotificationMenu` render `EmptyState` with a compact variant.
- **Decision:** no.

#### TD-UI-052 · `TableColumnVisibility` · Medium

- **Verified:** after the menu opens, focus stays on the trigger and does not move to the search field. The focus effect runs while the popup is still `visibility: hidden`, so `focus()` has no effect (`DatePicker` avoids this by waiting for the position).
- **Verified:** the search field has no label. "Show all" and "Reset to default" are raw buttons of 48 × 16 px and 89 × 16 px (TD-UI-021) styled as links. They should use the `text` `Button` variant (TD-UI-007). The reorder handle is 22 × 22 px. At 390 px the panel fits (8 to 296 px).
- **Code:** Escape is handled twice (the component and `usePopup`). `w-72`, `maxHeight ?? 400`, `text-[10px]` and `text-[11px]` are hardcoded. The panel is the second copy of "search inside a popup" (`TagSelect` has the first). A stale comment refers to an image, "Header matching Editor.png". The popup uses `animate-in` (TD-UI-034).
- **Recommendation:** focus the field once the popup is positioned, use `Input` and `Button` inside the panel, and share the popup shell (TD-UI-029).
- **Decision:** no.

#### TD-UI-053 · `TableBulkActions` · Low

- **Verified (also in the product owner's screenshots):** the bar overflows and its items overlap. At 390 px "Bulk edit" and "Clear selection" overlap. In a wider container (about 470 px) "Clear selection" overlaps "Delete". The action group is `whitespace-nowrap` with `min-w-0` and the clear button is `shrink-0`, so nothing wraps or shrinks. The bar needs to wrap its actions (or scroll them) at any width.
- **Code:** no consumer (keep: built in advance). The selected count is not in a live region, so a screen reader does not hear it change. The region name "Table bulk actions" and the "item(s) selected" plural are fixed English text. The clear button is a raw 36 px button (TD-UI-005, TD-UI-007), and `px-5` repeats the table's cell padding as a magic number.
- **Recommendation:** make the count a polite live region, take the strings as props with defaults, and use the kit `Button`.
- **Decision:** no.

#### TD-UI-054 · `Table` on phones · Medium

- **Verified:** at 390 px the content (458 px) scrolls inside its region (286 px). The page itself does not overflow.
- **Decision (product owner):** horizontal scrolling inside the table is acceptable on phones. The fixed-size parts around it (the bulk actions bar, TD-UI-053) must still not overflow.
- **Decision:** no.

> The next four findings cover `Tabs` (`Tabs`, `TabList`, `TabTrigger`, `TabContent`). The app uses `Tabs` with the `items` prop in three places (`FaqModal`, `AddModModal`, `ImportModsModal`) and `TabContent` in two. `TabList` and `TabTrigger` are used only in stories.

#### TD-UI-055 · Tab lists overflow on narrow screens · Medium

- **Verified:** at 320 px wide, all three tested stories overflow. The underline list ends at 489 px (the page grows to 489 px wide), and the segmented lists end at 475 px and 405 px. The list has `overflow: visible`, so nothing scrolls or wraps. The measured lists are 362 to 432 px wide, so the four-tab segmented list also overflows a 390 px phone.
- **Recommendation:** make the list horizontally scrollable (with the active tab scrolled into view and no visible scrollbar), as the product owner accepted for tables.
- **Decision (product owner):** yes, a horizontally scrollable tab list with the active tab scrolled into view.

#### TD-UI-056 · `Tabs` accessibility and keyboard order · Medium

- **Verified:** arrow keys, Home and End move focus and selection with wrap-around, and inactive tabs have `tabindex="-1"`. This part is correct.
- **Verified:** 2 of 3 triggers have an `aria-controls` that points at a panel that is not in the DOM, because inactive panels are unmounted (TD-UI-025 has the same pattern in `Select`).
- **Verified:** the count badge is `aria-hidden`, so counts such as "12" or "24" are not part of the tab's accessible name.
- **Code:** arrow-key order comes from an array that effects fill in mount order. A tab that appears later is appended at the end even when it renders in the middle. Selection follows focus, so every arrow press calls `onChange` and mounts or unmounts a panel. Every panel has `tabIndex={0}`, which the WAI-ARIA pattern recommends only when the panel has no focusable content.
- **Recommendation:** read the tab order from the DOM (`[role="tab"]` inside the list), set `aria-controls` only when the panel is mounted, give the badge a visually hidden text, and keep panel `tabIndex` only when needed.
- **Decision:** no.

#### TD-UI-057 · `Tabs` API and details · Medium

- **Code:** `aria-label` and `ariaLabel` both exist on `Tabs` and on `TabList` (two names for one prop, as in TD-UI-016). The default tab is `items[0]` even when that tab is disabled. With the compound API and no `defaultValue`, no tab is active and no panel shows. `containerClassName || 'space-y-4'` replaces the default spacing instead of merging with it. The context value is a new object on every render, so all tabs re-render. `item.label as ReactNode` is a needless cast. The ref merge is the eleventh copy (TD-UI-019). Other values are hardcoded: `text-[11px]` on the badge, `gap-6`, a 1 px focus ring (TD-UI-020) and the 32 px segmented height (TD-UI-012).
- **Recommendation:** one `aria-label` prop, skip disabled items for the default, merge class names, and memoize the context.
- **Decision:** no.

#### TD-UI-058 · Tab selection has no motion · Low

- **Code:** the active tab changes instantly (only the color and border transition). The product pillar "modern UI/UX" names smooth animations. A sliding indicator (underline) or segment (segmented) would fit it, and it must respect the reduced-motion rule (TD-UI-034).
- **Decision (product owner):** no sliding indicator; the instant change is fine. Closed.

> The next four findings cover `CodeEditor` and `CodeDiffView` (CodeMirror 6), each used once in the app (`ServerConfigCard`, `ConfigRevisionsPanel`). This component is in good shape. **Verified** as correct: Tab leaves the editor (no keyboard trap), the content has `role="textbox"`, `aria-multiline="true"` and the label. **Code:** both are lazy-loaded in the app, every token the theme uses is defined, and the utilities and the language mode have their own tests.

#### TD-UI-059 · Read-only editor and diff cannot be reached with the keyboard · High

- **Verified:** in `readOnly` mode the content has `contenteditable="false"` and no `tabindex`, and the scroller has `tabindex="-1"`. Pressing Tab skips the editor, although its content scrolls. A keyboard or screen-reader user cannot scroll or select the text. `ServerConfigCard` shows the config this way whenever the user is not editing.
- **Verified:** the diff container (`role="group"`) has `tabindex="-1"`, and the diff content is read-only, so the same applies to `CodeDiffView`.
- **Recommendation:** add `tabindex="0"` to the read-only content (through `EditorView.contentAttributes`) and to the diff panes, and keep the visible focus style.
- **Decision:** no.

#### TD-UI-060 · The search panel and the theme do not follow the kit · Medium

- **Verified:** the built-in search panel (Ctrl+F) uses 25 px high controls (kit controls are 36 px), 13 × 13 px checkboxes and an 8 × 18 px close button. Its labels are CodeMirror's English defaults ("next", "previous", "all", "match case", "regexp", "by word", "replace", "replace all"), and the app's i18n does not reach them.
- **Code:** `aegis-theme.ts` hardcodes `12px`, `6px`, `3px`, `0.6em` and `1.6` (TD-UI-014, TD-UI-018). It reads the base tokens (`--color-danger`, `--color-warning`) while the components read the semantic `--color-status-*` tokens, so the kit has two token layers for the same colors.
- **Recommendation:** replace the panel with one built from the kit's `Input`, `Checkbox` and `Button` (CodeMirror accepts a custom panel), with translated labels. Use named tokens for the sizes and read the semantic color tokens.
- **Decision (product owner):** rebuild the panel from the kit components.

#### TD-UI-061 · `CodeDiffView` · Medium

- **Verified:** at 390 px the side-by-side layout gives two panes of 146 px each, and each scrolls sideways (373 px of content in 146 px). The unified layout fits.
- **Code:** the whole CodeMirror instance is rebuilt whenever any prop changes. Changes are marked only by tint and gutter color (WCAG 1.4.1, use of color), and the side-by-side layout has no `+` or `-` markers. `ariaLabel` is optional, so the group can be unnamed. The component has no `ref`, so the page cannot focus it.
- **Recommendation:** fall back to the unified layout on narrow containers, require a name, and add a text marker for added and removed lines.
- **Decision (product owner):** the side-by-side layout switches to unified automatically on narrow containers.

#### TD-UI-062 · `CodeEditor` API and large documents · Low

- **Code:** it is not a form field like the other controls (TD-UI-028): there is no `label`, `id`, `name`, `required` or `error` prop and no `onBlur`. The container uses a 1 px focus ring (TD-UI-020). `onChange` serializes the whole document (`doc.toString()`) after every edit, which costs time in proportion to the file size.
- **Not verified:** no measurement was made. The only editing consumer is `serverDZ.cfg`, which is small. This matters if large files (for example `types.xml`) get an editor.
- **Recommendation:** give it the same field props as the other controls through the shared field shell, and revisit `onChange` (a debounced or on-demand value) before a large-file editor is built.
- **Decision:** no.

> The next three findings cover `LogViewer`. It has no consumer yet: it is `DSM-00207` (in progress), and the live RPT page `DSM-00208` will use it. **Verified** as correct: the scroll area is a focusable `role="log"` region with a 2 px inset focus ring, and the windowing works (44 to 65 rows are in the DOM for 100,000 lines). The warning color has a 5.32:1 contrast on the default light theme (the other themes are not measured, see the contrast question in the design system document).

#### TD-UI-063 · The status region announces every new line · Medium

- **Verified:** while following is paused, the `role="status"` text ("Following paused. 11 new lines.") changed 10 times in 4 seconds, once per incoming line (the story adds one line every 0.4 s). A screen reader announces each change. The component's own comment says that announcing each line would drown a screen reader on a busy server (hundreds of lines per second).
- **Recommendation:** announce once when following pauses, and drop the running count from the live region (the visible button already shows it). If a count is needed, update it at a coarse interval.
- **Decision:** no.

#### TD-UI-064 · Windowing limits copy and find · Medium

- **Verified:** in the 100,000-line story, Ctrl+A selects only the 44 rendered rows, so copying gives 44 lines, not the log. **Code:** the browser's find (Ctrl+F) also sees only rendered rows. **Code, not verified:** the horizontal scroll width follows the widest rendered row, so it can change while scrolling when line lengths differ (the story's lines have equal length).
- **Recommendation:** document the limit in the component, and keep `DSM-00210` (filter by text) and `DSM-00211` (download the full file) ahead of the release of the live log page.
- **Decision (product owner):** `DSM-00210` and `DSM-00211` are enough for search and the full copy. No "Copy all" in the viewer.

#### TD-UI-065 · `LogViewer` API and tokens · Low

- **Code:** `height` is a fixed pixel number, so the viewer cannot fill the available space or follow the viewport on a phone. `label` and `emptyMessage` use different names from the rest of the kit (`ariaLabel`, `emptyText`). Severity colors use the base tokens `--color-danger` and `--color-warning` (the two token layers in TD-UI-060). The row height, overscan and `text-xs` are named constants or classes, but not tokens (TD-UI-018). The default `detectLogSeverity` matches the word "error" anywhere, so a line such as a player named "Error" is colored as an error.
- **Recommendation:** accept a CSS height (or fill the parent), unify the prop names, read the semantic color tokens, and anchor the severity match to the log format.
- **Decision:** no.

#### TD-UI-066 · `Breadcrumbs` is unused while the header builds its own · Medium

- **Code:** the kit component has no consumer. `Header.tsx` renders its own `<nav aria-label="Breadcrumb">` with the router `Link` and a `ChevronRight`, as plain elements, not a list. The kit version cannot take a router link directly: `BreadcrumbLink` renders `<a href>` and, with `asChild`, only merges `className` into the child (the other props are not forwarded).
- **Verified:** the ellipsis button is 18 × 18 px and a text link is 16 px high (TD-UI-021). After the ellipsis is clicked the trail cannot collapse again. It fits at 320 px.
- **Code:** the collapse does not check that anything is hidden: with `maxItems` just below the item count, the ellipsis can replace nothing. The current page is a `span` with `role="link"` and `aria-disabled`, where `aria-current="page"` alone is enough. `ref` is accepted by the link type but forwarded only for `<a>`. The ellipsis label "Show more breadcrumbs" is fixed English, and the focus ring is 1 px (TD-UI-020).
- **Recommendation:** make the kit component fit the router (`asChild` forwarding all props, or a `renderLink` prop), replace the header's inline trail with it, and fix the collapse and the markup.
- **Decision (product owner):** yes, replace the header's inline trail with the kit `Breadcrumbs` once the router fit is fixed.

> The next two findings cover `FileUploader`, used once (`ImportModsModal`, a `.json` preset up to 2 MB).

#### TD-UI-067 · `FileUploader` semantics and focus · Medium

- **Verified:** the drop zone is a `div` with `role="button"`. Its accessible name is only the label ("Upload File"). The visible instruction ("Click to upload or drag and drop") and the constraints (".json • up to 500 KB") are in neither the name nor the description (`aria-describedby` has only the helper text).
- **Verified:** `aria-invalid` is set on the `role="button"` element, always rendered (`false` or `true`). ARIA does not support it on a button, so it is ignored. The focus ring is 1 px (TD-UI-020).
- **Verified:** after a file is dropped, the drop zone is replaced by the file card and focus moves to `body`. Nothing is announced when a file is selected or removed (no live region). The remove button is 28 × 28 px and is labeled only "Remove file", without the file name.
- **Code, not verified:** the hidden `required` file input has no `onInvalid` handler, so a native validation bubble would appear at the hidden input's position (`DatePicker` handles this case).
- **Recommendation:** use a native `<button>` for the drop zone, describe it with the constraints, move focus to the file card after selection and back to the drop zone after removal, announce the file name politely, and include the name in the remove label. Handle `onInvalid` as `DatePicker` does.
- **Decision:** no.

#### TD-UI-068 · `FileUploader` behavior and API · Low

- **Verified:** dropping two files keeps the first and ignores the second without a message.
- **Code:** `customClassName` is marked "Legacy" in its own type (TD-UI-013), and `className` styles the drop zone or the file card depending on the state. The error text is 12 px with an icon, a fourth error style (TD-UI-022). The messages are fixed English. `text-[11px]`, `border-2` and `p-6` are hardcoded (TD-UI-018). The component only selects a file, with no upload or progress, despite its name. The code carries "GUARD-01" to "GUARD-03" comments that add noise. It reports a rejected file through `onError` and an inline message, and the consumer must add the red toast required by the feedback contract.
- **Recommendation:** remove `customClassName`, share the field shell and the error style, and add the message for extra files.
- **Decision (product owner):** when several files are dropped, the component says that only one is used ("Only one file is allowed. Using preset.json.").

#### TD-UI-069 · `HeroBanner` · Low

- **Context:** no page uses it. The product owner's rule is to keep components built in advance for a planned feature. The colors are covered by TD-UI-010. Whether it gets a role is the open "section voice" question in the design system document.
- **Verified:** at 390 px the banner fits (no page overflow) and the background image request succeeds. The banner is dark in every theme, because the default scrim is a fixed dark gradient (this is the exception TD-UI-010 asks to document).
- **Code:** `backgroundImage` goes into an inline style as `url('${backgroundImage}')` without escaping, so a URL with a quote or a parenthesis breaks the declaration. Passing `scrimClassName` replaces the whole default gradient, so a custom scrim can remove the protection that keeps the white text readable on the image. The `ref` type is `Ref<HTMLDivElement>` while `as` can be `section`, `article` or `header`. The size values are hardcoded (`min-h-[180px]`, `text-[32px]`, `text-[10px]`, `text-[13px]`, `p-6 sm:p-7`, TD-UI-014, TD-UI-018). The heading prop is `titleAs` here, `titleLevel` in `Card` and `titleAs` plus `as` in `EmptyState` (TD-UI-037). It has two composition styles (props, or nine slot components plus statics), like `EmptyState` and `KpiCard` (TD-UI-041).
- **Recommendation:** encode the image URL (or set it through a CSS variable), keep a minimum contrast scrim whatever `scrimClassName` says, type the ref from `as`, and use tokens for sizes.
- **Decision:** no.

#### TD-UI-070 · `Loader` and the other spinners · Medium

- **Verified:** with `prefers-reduced-motion: reduce` emulated, all three variants keep animating (`spin`, `loader-bounce`, `loader-pulse`). This extends TD-UI-034.
- **Code:** the app draws a spinner in five ways. The kit `Loader` has one use (`ActiveSessionsCard`). `FaqModal` uses `Loader2` directly, `RootFallback` and `SteamDiagnosticsModal` draw a CSS ring by hand, and `Autosuggest` and `Button` use `Loader2` with their own sizes. Only the `spinner` variant is used; `dots` and `pulse` have no consumer.
- **Code:** `customClassName` duplicates the container class prop (TD-UI-013). The color is fixed to the brand color with no way to inherit it. The animation delays, bounce heights and sizes are inline or hardcoded (TD-UI-018). The default label "Loading..." is fixed English. Every `Loader` is a `role="status"` live region (TD-UI-036).
- **Recommendation:** one `Loader` (or one `Spinner` primitive) used by `Button`, `Autosuggest`, `FaqModal`, `RootFallback` and `SteamDiagnosticsModal`, with a `currentColor` option, tokens for sizes, and a reduced-motion behavior (slower spin, or a non-moving indicator).
- **Decision (product owner):** keep the `dots` and `pulse` variants.

#### TD-UI-071 · `Pagination` · Medium

- **Verified:** at 390 px the full footer story overflows: the last button ends at 880 px and the page becomes 880 px wide. The root is `flex` without `flex-wrap`. The one consumer (`AddModModal`) works around it with `className="flex-wrap gap-y-2"`.
- **Verified:** a focused page button that becomes `disabled` drops focus to `body`. The consumer passes `disabled={searchMutation.isPending}`, so after a keyboard user presses a page button, every button is disabled while the search runs and focus is lost.
- **Code:** nothing announces a page change (no live region and no focus move to the results). `role="navigation"` is redundant on `<nav>`. The buttons are raw `<button>` elements with a 2 px ring without offset (TD-UI-005, TD-UI-020). The strings ("Showing ... items", "Rows per page:", "Go to next page", "Page 3") are fixed English (see TD-UI-072). The select width `w-20` is hardcoded, and a `pageSize` that is not in `pageSizeOptions` shows an empty select. The ellipsis is the text "..." instead of one character or icon. `getPaginationItems` has no test of its own and is covered only through the component test.
- **Recommendation:** wrap by default and stack the counter above the buttons on narrow screens, keep focus (use `aria-disabled` while loading, as the pending state is short), announce "Page 3 of 10" in a polite status, and add a unit test for `getPaginationItems`.
- **Decision (product owner):** use `aria-disabled` while loading so keyboard focus stays on the button.

#### TD-UI-072 · Kit strings are fixed English · Medium

- **Code:** the kit renders user-facing English text that a consumer cannot translate without a prop on every use: "Searching...", "Clear search", "A date is required.", "Cancel", "Confirm", "Dismiss notification", "Show more breadcrumbs", "Rows per page:", "Showing ... items", "Click to upload or drag and drop", "No records found", "No options found", "Loading...", "Jump to latest", the search panel labels in the code editor and more. The web app has its own i18n resources (`apps/web/src/core/i18n`), and the product owner wants locale support for `DatePicker` (TD-UI-032).
- **Decision (product owner):** the web app will be translated into at least Ukrainian, Polish, German, Italian and French, besides English. The kit therefore needs a way to receive its strings (a provider with a message map and English defaults), and its components must not build sentences from fragments. Plural rules differ between these languages (Ukrainian and Polish have several plural forms), so counts such as "3 items selected" need plural-aware messages. Dates and numbers follow the same locale (TD-UI-032).

#### TD-UI-073 · `ProgressBar` · Low

- **Verified:** with reduced motion emulated, the indeterminate bar keeps sliding (TD-UI-034). The fill has a contrast of 4.9 to 5.3 against the track in all four tested variants, which is enough. The track itself has only 1.05:1 against the page, so the full length of the bar is almost invisible.
- **Code:** `SteamGuardChallengeModal` renders a countdown bar with no `label` and no `aria-label`, so the `role="progressbar"` has no name. The component does not require one. The root class has three names, `className`, `containerClassName` and `customClassName` (TD-UI-013), and `...props` goes to the wrapper rather than to the progressbar element. The `11px` text, the 300 ms transition and the `h-1`, `h-2` and `h-3` heights are hardcoded (TD-UI-014, TD-UI-018).
- **Recommendation:** make `label` or `aria-label` required in the type, give the track a visible edge token, and use named tokens for the sizes and the transition.
- **Decision:** no.

#### TD-UI-074 · `Skeleton` · Low

- **Verified, correct:** the `pulse` animation stops when reduced motion is on (`motion-reduce:animate-none`). It is the only animated part of the kit that does this, so it is the pattern for TD-UI-034. The `wave` shimmer is hidden with `motion-reduce:before:hidden` (not checked visually).
- **Verified:** every skeleton is a `role="status"` region labeled "Loading...". The table placeholder story renders 14 of them and the wave story 4, so a loading screen can announce "Loading..." many times (TD-UI-036).
- **Code:** the `wave` shimmer hardcodes `via-white/15` and 1.6 s (TD-UI-011, TD-UI-018). The last line of a multi-line skeleton is a fixed `75%`. `data-testid="skeleton"` and `"skeleton-line"` ship in the DOM (TD-UI-038). The `aria-hidden` type comment ("paired with explicit aria-busy parent") does not match the code, which only checks for `true`. The app passes fixed pixel heights copied from the final content (96, 320, 448), so a content change reintroduces layout shift. `KpiCard` draws its own skeleton instead of using this component (TD-UI-040), and `Table` has none (TD-UI-050).
- **Recommendation:** one `role="status"` per loading area (or `aria-busy` on the container with the skeletons `aria-hidden`), tokens for the shimmer, and skeleton rows for `Table`.
- **Decision:** no.

#### TD-UI-075 · Hooks: `useSortableList` and `useDebounce` · Low

- **Code:** `useSortableList` supports mouse drag and the keyboard (arrow keys on the handle, with locked rows respected, and the drop index math is correct). Native HTML drag and drop does not fire on most touch devices, so a phone user has no way to reorder columns. Nothing announces a move for screen readers (the only instruction is a `title` on the handle).
- **Code:** `useDebounce` is minimal and correct. `usePopup` is covered in TD-UI-048. Both hooks have tests.
- **Recommendation:** add "move up" and "move down" actions for touch (in the menu's row), and a polite status such as "Moved Name to position 3 of 7".
- **Decision:** no.

## 2. Other known items (not yet audited)

These came up while writing the documentation. Each was verified against the code, but the areas have not had a full audit.

| ID    | Priority | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                                                                                                |
| :---- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-01 | Medium   | **Role checks are duplicated and cannot fail.** Five copies of the same no-op helper (`ensureAdminRole` in four route files, `requireAdmin` in one) and 31 call sites; replace with one `requireRoot` on operator endpoints (**Decision made**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `apps/server/src/routes/{servers,server-mods,steam,workshop,server-config,launch-command}.ts`                                                                                                                                           |
| TD-02 | Medium   | **Fonts load from Google Fonts at runtime.** Offline or LAN hosts fall back to system fonts and every page load contacts Google (**Decision**: bundle locally)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `libs/ui/src/styles/fonts.css`, `apps/web/src/styles/fonts.css`                                                                                                                                                                         |
| TD-03 | Medium   | **Node version is inconsistent.** CI runs Node 24, the README says 20 or 22, and there is no `engines` or `.nvmrc`. Target: the latest LTS (26), pinned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `.github/actions/setup-workspace/action.yml`, `README.md`, `package.json`                                                                                                                                                               |
| TD-04 | Medium   | **README is stale.** The roadmap shows built features as unchecked and the Moderator and Viewer roles no longer exist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `README.md` roadmap and roles sections                                                                                                                                                                                                  |
| TD-05 | Low      | **Footer quote rotation** differs from the design decision (**Decision**: rotate every 60 s, or change per session)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `apps/web/src/features/flavor-text/use-flavor-text.ts`                                                                                                                                                                                  |
| TD-06 | Low      | **Test fixture name** carries an unrelated project name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `apps/server/src/services/server/battleye-config.service.spec.ts:25`                                                                                                                                                                    |
| TD-07 | Low      | **Seeded `admin`/`admin` account** until the first-run root setup exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `README.md`, `apps/server` seed                                                                                                                                                                                                         |
| TD-08 | Medium   | **The bell and the toasts have the wrong jobs in the code.** The product rule: a toast reports the result of an async request (red for failures, including server validation errors, green for success; warning and info are future), and the bell lists background events (delayed or background tasks). The code mirrors every toast into the bell (93 call sites), while background events (`server.stop.failed`, `server.restart.failed`, Steam login events) never reach it (**Decision made**; the list of background events is open). Verified in the running app on 2026-11-25: creating a server and a Steam diagnostics run raised the bell's unread count from 1 to 3, four call sites in the Steam area use info toasts (`notifyInfo`) although none are planned yet, and a page reload empties the bell because the store is not persisted | `apps/web/src/core/notifications/notify.ts`, `notification.store.ts`, `core/realtime/*.realtime.ts`, `components/layout/Header.tsx`                                                                                                     |
| TD-09 | Medium   | **Password rules are written three times in the web app and the contract.** The change-password contract, `validateNewPassword` and `PasswordStrengthBar` hold the same 8 to 64 character rules today, so a change must be made in three places. The seeded `admin` password and `DSM_ADMIN_PASSWORD` (minimum 8 characters) do not follow the policy either                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `libs/api-contracts/src/lib/profile.contract.ts`, `apps/web/src/features/profile/components/PasswordRotationCard.tsx`, `PasswordStrengthBar.tsx`, `apps/server/src/config/env.ts`                                                       |
| TD-10 | Low      | **Error codes that nothing emits.** `INVALID_APP_ID`, `INVALID_BRANCH_NAME` and `STEAMCMD_PROCESS_TERMINATED` are in the contract (and have web messages) but no server code uses them. `AUTH_FORBIDDEN_ADMIN_REQUIRED` goes with TD-01                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `libs/api-contracts/src/lib/error.contract.ts`                                                                                                                                                                                          |
| TD-11 | Low      | **No automated check for drift between web, contract and server.** A manual comparison on 2026-11-24 found no mismatch in endpoints (55 server routes against 50 client calls, the rest are `EventSource` streams or query-string variants) and every contract error code has a web message (enforced by the `TranslationCatalog` type). Nothing keeps it that way for routes and events                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `libs/api-client`, `apps/server/src/routes`, `apps/web/src/core/i18n`                                                                                                                                                                   |
| TD-12 | Low      | **Server defaults are written in several places.** Game port 2302 and RCON port 2310 appear in the contract, the database schema and migration, and the create dialog; the query port 27016 appears in the servers route (`MIN_QUERY_PORT`) and in `libs/dayz-config` (`DEFAULT_STEAM_QUERY_PORT`). They agree today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `libs/api-contracts/src/lib/server.contract.ts`, `libs/database/src/lib/schema.ts`, `apps/web/src/features/server-settings/CreateServerModal.tsx`, `apps/server/src/routes/servers.ts`, `libs/dayz-config/src/lib/projection.ts`        |
| TD-13 | Medium   | **Path rules exist in four copies.** The contract `safePathSchema`, `SteamPathService.validateLexicalPath`, `server-path-safety.validateLexicalCandidate` and the launch compiler each check paths (length, `..`, control characters, absolute form) with slightly different code. `..` is rejected anywhere in the string, so a folder such as `my..mods` is refused by all of them                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `libs/api-contracts/src/lib/server.contract.ts`, `apps/server/src/services/steam/steam-path.service.ts`, `apps/server/src/services/server/server-path-safety.ts`, `libs/dayz-config/src/lib/launch/compiler.ts`                         |
| TD-14 | Low      | **Steam constants and fallbacks.** `getAvailableDiskSpace` returns a fixed 100 GB when `statfs` is unavailable, so the 1 GB check can pass without a real measurement. The 90 s Steam Guard timeout is written in the contract, the daemon and the web modal, and the 20 GB storage warning in the daemon and (with a 10 GB limit) in the settings page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `apps/server/src/services/steam/steam-path.service.ts`, `libs/api-contracts/src/lib/steam.contract.ts`, `apps/server/src/services/steam/steam-runner.service.ts`, `apps/web/src/features/steam/components/SteamGuardChallengeModal.tsx` |

## 3. Server (`apps/server`)

The audit read the daemon's source (36 files, about 10,300 lines), ran its tests with coverage, checked the dependencies, and compared it with the contracts and the web app. Findings about security that are not fixed yet are kept out of this file, in a private note. **Verified** means seen when running the code, **Code** means read from the source.

**What is in good shape:** no `any`, `@ts-ignore`, TODO or `console` calls; typed errors with one envelope; atomic config writes with a backup limit (15 per file); transactions and state guards in the lifecycle service; path safety checks; and 615 tests in 37 files with 96.85% statement coverage (`steam.ts` at 83.6% and `steam-runner.service.ts` at 85.9% are the weakest).

| Area                        | Status                                                                                                                                                                                                        |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static metrics and coverage | Done                                                                                                                                                                                                          |
| Auth, sessions, realtime    | Read in full                                                                                                                                                                                                  |
| Servers, lifecycle, config  | Read: `servers.ts` create path, the lifecycle service structure and start path, `server-dz-config.service.ts` (load, drift, revisions), `server-fs-inspector.service.ts` (install, BattlEye and result parts) |
| Mods, Steam                 | Read: the Steam runner, path service and settings route, the mods route structure and its helpers. The preset import and replace logic was read for structure only                                            |

### Findings

#### TD-SRV-001 · The server and its tests do not run after a Node upgrade until a native rebuild · Medium

- **Verified:** with Node 26.13.1 on this machine, all 15 tests of the first database spec failed (and every other test that opens SQLite): `better_sqlite3.node` had been built for ABI 131 (Node 23), while Node 26 needs ABI 147. `pnpm rebuild better-sqlite3` fixed it (a prebuilt binary for Node 26 exists for `better-sqlite3` 12.11.1), and then 37 files and 615 tests passed. The daemon itself would not have started either.
- **Code:** `package.json` has no `engines` field and there is no `.nvmrc`, so nothing says which Node is expected or warns that a rebuild is needed. This extends TD-03.
- **Recommendation:** pin Node in `engines` and `.nvmrc`, add a start-up check that turns the native-module error into a clear message ("run `pnpm rebuild better-sqlite3`"), and add the rebuild step to [getting started](engineering/getting-started.md).
- **Decision:** no.

#### TD-SRV-002 · Data paths depend on the working directory · Medium

- **Code:** the database (`manager-data/database/manager.sqlite`), the vault key (`manager-data/.vault.key`) and the config backups (`manager-data/backups/configs`) are all resolved from `process.cwd()`. Starting the daemon from another folder silently creates an empty database, a new vault key and a new `admin` seed, and the old data looks lost (and its encrypted secrets cannot be read).
- **Recommendation:** one data directory setting (`DSM_DATA_DIR`) in the validated environment, resolved once at start-up and printed in the log. The appliance layout (`manager-data` next to `app/`) makes this the default.
- **Decision:** no.

#### TD-SRV-003 · Route files hold domain logic · Medium

- **Code:** `servers.ts` (794 lines), `server-mods.ts` (1,010 lines) and `steam.ts` (592 lines) contain the business rules, not only the HTTP handling: port conflict and port picking, defaults read from the disk on creation, preset merge and replace planning, and settings encryption. Lifecycle, config and Steam sign-in have services, but servers, mods and Steam settings do not.
- **Impact:** the rules cannot be reused or tested without an HTTP request, and the route files are the longest in the daemon.
- **Recommendation:** move them into `ServerService`, `ModService` and `SteamSettingsService`, as the lifecycle service already does. Keep the routes to parsing, calling a service and shaping the response.
- **Decision:** no.

#### TD-SRV-004 · Copied code in the daemon · Medium

- **Code:** the same session-activity throttle (60 s) is written in `app.ts` (`isSessionActive`) and in the refresh route. There are two SSE implementations: `SseHub.subscribe` (no `reply.hijack()`, its own heartbeat) and `openEventStream` (hijacks the reply). The role check exists five times (TD-01), and the path rules four times (TD-13).
- **Recommendation:** one session helper, one SSE writer used by both the hub and the per-client stream, and the central `requireRoot`.
- **Decision:** no.

#### TD-SRV-005 · Two validation styles · Low

- **Code:** handlers validate with Zod `safeParse` (35 places, some through `parseOrSendError` and some as repeated inline blocks that build the same error response). Only `auth.ts` and `health.ts` also declare a Fastify JSON schema, and only they have response schemas. Other responses are shaped by hand.
- **Recommendation:** one helper for "parse or send the error", and either Zod for request and response everywhere, or Fastify schemas generated from the contracts.
- **Decision:** no.

#### TD-SRV-006 · Expired sessions are never deleted · Low

- **Code:** a session row is removed only when an operator revokes it or changes the password. Rows whose `expires_at` has passed stay in `sessions` forever, and each sign-in adds one.
- **Recommendation:** delete expired rows at start-up and on a slow timer.
- **Decision:** no.

#### TD-SRV-007 · No `trustProxy` setting · Medium

- **Code:** Fastify's `trustProxy` is not set. Behind the optional reverse proxy that the production plan allows, `request.ip` is the proxy's address, so the login rate limit (10 per minute) is shared by every client. The login route also reads `X-Forwarded-For` by hand for the session's IP, so the two disagree.
- **Recommendation:** a `TRUST_PROXY` setting in the validated environment, used by Fastify for both the rate limit and the recorded IP, and no manual header reading.
- **Decision:** no.

#### TD-SRV-008 · An environment variable outside the schema · Low

- **Code:** `config-atomic-writer.ts` reads `process.env.DSM_BACKUP_DIR`. It is not in `envSchema`, so it is not validated and not documented (see TD-SRV-002).
- **Recommendation:** move it into the schema, or drop it for the data directory setting.
- **Decision:** no.

#### TD-SRV-009 · Silent error handling and blocking calls · Low

- **Code:** 33 `catch` blocks are empty or only swallow the error (for example when a kill signal fails). Some are right (a process that already exited), but each deserves a one-line reason or a log entry. Synchronous file calls (`existsSync`, `statSync`, `readdirSync`, `statfsSync`) run inside request handlers, 17 in the Steam runner and 14 in the Steam path service, and block the event loop while they run. On a local admin tool this is minor.
- **Recommendation:** review each empty `catch`, log at `debug` where it is deliberate, and use the promise-based `fs` API in request paths.
- **Decision:** no.

#### TD-SRV-010 · No log entry for failed sign-ins and rate-limit hits · Low

- **Code:** a wrong password, an unknown user and a `429` leave no log line. An operator cannot see that someone is guessing passwords.
- **Recommendation:** log failed sign-ins (user name, IP, reason) at `warn`, and later write them to the audit trail.
- **Decision:** no.

#### TD-SRV-011 · Dependency advisories in `fast-uri` · Low

- **Verified:** `pnpm audit --prod` reports four advisories (two moderate, two low) in `fast-uri`, a transitive dependency of Fastify through `ajv`. All are fixed in `fast-uri` 3.1.9 or later.
- **Recommendation:** add a `pnpm-workspace.yaml` override for `fast-uri`, as is done for `undici`, until Fastify updates.
- **Decision:** no.

#### TD-SRV-012 · Password hashes carry no parameters · Low

- **Code:** a hash is stored as `salt:hex` (scrypt with its default cost, 64-byte key). The format has no version or cost, so raising the cost later needs a format change and a rehash on the next sign-in.
- **Recommendation:** store `scrypt$N$r$p$salt$hash` and rehash after a successful sign-in when the cost is out of date.
- **Decision:** no.

#### TD-SRV-013 · A `GET` request writes to the database · Medium

- **Code:** `GET /servers/:id/config/server-dz` calls `ServerDzConfigService.load`, which calls `recordExternalDriftIfNeeded`. When the file on disk differs from the last stored revision, the read inserts a new revision with the source `external` and also overwrites the server's `queryPort` and `maxPlayers` with the values found in the file (unless the query port collides with another server). So opening the editor page changes stored data.
- **Impact:** a safe-looking read has side effects, concurrent opens can race on the revision list, and the stored port can change without a visible save. The behavior itself (keeping the database in step with a file edited outside Aegis) is intended.
- **Recommendation:** keep the behavior but make it explicit: a `POST .../config/server-dz/sync` that the page calls first, or a file check at server start and at save, and keep `GET` free of writes.
- **Decision:** no.

#### TD-SRV-014 · `server-fs-inspector.service.ts`: repeated status objects and a probe that writes · Low

- **Code:** the 914-line file builds each path status by hand: 28 object literals with `configuredPath`, and eight near-identical early returns that repeat the same nine fields (`executableRunnable: false` and the others). A small builder for "status plus issue" would cut the file by a large part. The code `INSTALL_DIR_MISSING` is also used for "lacks read or traverse permissions", which is a different problem.
- **Code:** the path check is a `POST` that writes a probe file (`.dsm_fs_probe_<uuid>.tmp`) into the profile and BattlEye folders and removes it. A crash between the write and the delete leaves the file in the game folder. `inspect()` also reads `process.platform` directly instead of taking it as an input.
- **Recommendation:** one builder for status and issue, a dedicated code for the permission case, the platform as a parameter, and a note in the response that the check writes a probe.
- **Decision:** no.

#### TD-SRV-015 · Steam settings start with guessed paths · Low

- **Code:** the first read of the Steam settings stores defaults that look configured: `C:\steamcmd\steamcmd.exe`, `C:\DayZServer\steamapps\workshop` and `C:\DayZServer\steamapps` on Windows, and `/usr/games/steamcmd`, `/var/dayz/workshop` and `/var/dayz/steamapps` on Linux. Nothing checks them until the operator runs diagnostics. The backlog already plans a "not configured" state (`DSM-00340` to `DSM-00342`).
- **Recommendation:** store no path until the operator or the auto-detection sets one, as the backlog item says.
- **Decision:** no.

#### TD-SRV-016 · The "no non-null assertion" rule is not enforced · Low

- **Code:** the conventions say no `!`, but lint uses `tseslint.configs.recommended`, which does not include `no-non-null-assertion`. There are 4 in the daemon (`server-mods.ts` lines 552, 656 and 862, `steam.ts` line 98) and 3 more in the web and libraries.
- **Recommendation:** turn on `@typescript-eslint/no-non-null-assertion` as an error and replace the seven uses with a check or a typed helper.
- **Decision:** no.

#### TD-SRV-017 · `positionAt` is written twice · Low

- **Code:** `server-dz-config.service.ts` has its own `positionAt` (offset to line and column), and `libs/dayz-config` has the same logic in `DiagnosticSink.position`.
- **Recommendation:** export one helper from `libs/dayz-config`.
- **Decision:** no.

## 4. Web app (`apps/web`)

The audit ran the 87 test files (874 tests, 96.12% statement coverage), read the structure and the main flows of the source (147 files, about 16,300 lines), and then drove the running app with Playwright against a scratch database: sign-in (wrong and right password), all 18 routes at 1440 and 390 px, creating and saving a server with good and bad input, the `serverDZ.cfg` editor and its unsaved-changes guard, a mod add with bad and good input and a double click, the profile password form, the Steam settings and diagnostics, the notification bell, the help modal, the theme, sign-out, and a run with the API server stopped. **Verified** means seen in the running app, **Code** means read from the source.

**What is in good shape:** no `any`, `@ts-ignore` or TODO; the feedback contract holds in every flow tested (red toast plus inline message and focus on a server error, green toast on success, one request on a double click); no console errors on any signed-in page; every button and input has a name; no horizontal overflow at 390 px on the eight pages tested; the unsaved-changes guard focuses "Keep editing"; and a failed save kept the typed values, so the retry worked once the server was back.

| Area                         | Status                                                                                                            |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| Static metrics and coverage  | Done                                                                                                              |
| Routing, shell, auth         | Verified in the app, source read                                                                                  |
| Server settings, config      | Verified in the app, source read for structure                                                                    |
| Mods                         | Add, toggle, sort and offline retry verified. Import, export, Workshop search and update check were not exercised |
| Steam, profile               | Settings, diagnostics and password form verified. The Steam Guard challenge was not exercised (needs SteamCMD)    |
| Dashboard, placeholder pages | Verified (placeholders show "Planned feature")                                                                    |
| Not covered                  | Maintenance page actions (start, stop, restart need a real server process), multi-operator and multi-tab behavior |

### Findings

#### TD-WEB-001 · An unknown URL shows a blank page · High

- **Verified:** opening `/no-such-page` renders nothing: no header, no menu, no message. The console warns that `notFoundComponent` is not configured.
- **Code:** `router.tsx` sets an `errorComponent` and `defaultErrorComponent`, but no `notFoundComponent` or `defaultNotFoundComponent`.
- **Recommendation:** a not-found page inside the shell (with a link to the dashboard) for signed-in users, and a redirect to sign-in for signed-out users.
- **Decision:** no.

#### TD-WEB-002 · Every page has the same browser tab title · Medium

- **Verified:** all 18 routes show "Aegis Console — DayZ Server Manager". A tab, the history list and a screen reader cannot tell the pages apart (WCAG 2.4.2).
- **Recommendation:** set the title from the route (`ROUTE_BREADCRUMBS` already holds the labels), for example "Mods · Audit Server · Aegis".
- **Decision:** no.

#### TD-WEB-003 · Pages without a registered server have no heading · Medium

- **Verified:** `/settings/server`, `/mods` and `/maintenance` show "No DayZ Servers Registered" with no `h1` (the dashboard has one). The empty state is an `h3`, so the page has no top-level heading.
- **Recommendation:** keep the page `h1` in the empty state, or let the empty state use `h1` through its `titleAs` prop.
- **Decision:** no.

#### TD-WEB-004 · A server can be registered with an install path that does not exist · Medium

- **Verified:** creating a server with `C:\definitely\not\here` succeeded with the green toast "Server Created". The settings page then showed the error "Installation directory does not exist on the host" from the config card.
- **Code:** the create route checks the path text (no `..`, absolute) and reads defaults from the disk if it can, but does not require the folder to exist. The "Validate paths" button is separate and optional. `DSM-00123` says "register servers, validate paths".
- **Decision (product owner):** creation is allowed with a warning when the install path does not exist or has no server executable. The warning toast and a status on the server tell the operator, so a server can be prepared before its files exist (the clean-install wizard `DSM-00146` needs that).

#### TD-WEB-005 · The config card keeps a stale error after the path is fixed · Medium

- **Verified:** after saving a corrected install path, the `serverDZ.cfg` card kept showing "Installation directory does not exist on the host" until the page was reloaded.
- **Code:** the server save (`ServerSettingsView.tsx`, lines 525 to 579) updates only `serverQueryKeys.list()` and `.detail()`. The config query (`serverConfigQueryKeys.server(serverId)`) is not invalidated.
- **Recommendation:** invalidate the config query when a path, port or name changes. A shared "server changed" helper would avoid missing one.
- **Decision:** no.

#### TD-WEB-006 · Modals do not move focus into the dialog · Medium

- **Verified:** after "Add Mod" opens its dialog, `document.activeElement` is still the "Add Mod" button behind it. Tab stays inside the dialog (0 escapes in 40 presses), Escape closes it and returns focus to the button, so only the initial focus is missing. A screen-reader user hears nothing from the dialog.
- **Code:** `useModalDialog` traps Tab and restores focus but never focuses the dialog or its first field. This belongs with TD-UI-042 (one modal system).
- **Recommendation:** focus the dialog heading or the first field when it opens.
- **Decision:** no.

#### TD-WEB-007 · The header search box is not a control · Medium

- **Verified:** the "Search anything... ⌘K" box in the header is a `span` inside a `div`. It has no input, cannot be focused, and Ctrl+K does nothing.
- **Impact:** it looks like search and keyboard shortcut hints promise it. The design system document lists global search as an open question.
- **Recommendation:** remove it until search exists, or build it.
- **Decision:** no.

#### TD-WEB-008 · Connection loss is shown as a raw message, and the state is invisible · Medium

- **Verified:** with the API stopped, adding a mod showed the red toast "Failed to Add Local Mod: HTTP request failed with status 502" (the status comes from the dev proxy; production, on one origin, was not tested). The dialog stayed open with the typed values, and a retry worked when the server was back. Nothing on the page said the connection was lost, even though the app knows (`RealtimeProvider` tracks `connecting`, `open`, `reconnecting` and `closed`).
- **Recommendation:** map network failures to a readable message ("Cannot reach the Aegis server"), and show the realtime state in the header when it is not `open`.
- **Decision:** no.

#### TD-WEB-009 · Error messages that do not match the cause · Low

- **Verified:** saving the Steam settings with a relative path shows the inline message "Path must be an absolute filesystem path." and the red toast "The provided storage path is invalid or contains forbidden traversal sequences." The toast text belongs to the error code `STORAGE_PATH_INVALID`, which covers several different problems.
- **Recommendation:** use the specific server message as the toast description when the code is generic.
- **Decision:** no.

#### TD-WEB-010 · Very large view components · Medium

- **Code:** `ModsView.tsx` (1,007 lines), `SteamSettingsView.tsx` (948), `AddModModal.tsx` (841), `ServerSettingsView.tsx` (746) and `ImportModsModal.tsx` (648) each mix data fetching, form state, validation rules and markup. The largest have the lowest coverage (`SteamSettingsView` 88.8%, `ModsView` 89.5%, `AddModModal` 90.3% statements).
- **Recommendation:** split each into a data hook, a form hook and presentational parts, as `server-config` already does (`useConfigEditSession`, `ServerConfigCard`).
- **Decision:** no.

#### TD-WEB-011 · Dashboard shows internals · Low

- **Verified:** the dashboard shows "Role: admin", the session user id (a UUID) and the backend uptime in raw form. It is the `Partial` dashboard in the feature map, and these two cards read like debug output.
- **Recommendation:** replace them when the server overview (`DSM-00184`) is built, and until then remove the user id.
- **Decision:** no.

#### TD-WEB-012 · Small conventions · Low

- **Code:** two non-null assertions in `ImportModsModal.tsx` (lines 143 and 371, see TD-SRV-016). `session-storage.driver.ts` logs "Failed to set" in its `remove` function (copy of the set message). Four mutations in `profile.mutations.ts` have no `onError` in the hook (the call sites handle errors, as the profile form showed).
- **Recommendation:** fix the lint rule, the log text, and keep one place for error handling per mutation.
- **Decision:** no.
