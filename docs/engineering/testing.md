# Testing

|              |                           |
| :----------- | :------------------------ |
| **Status**   | Implemented               |
| **Verified** | Against commit `49b09cc`  |
| **Audience** | Maintainers and AI agents |

A change is not done until it is tested, checked in a running app where a user can see it, and reported honestly.

## 1. Strategy

- **Unit and component tests** with Vitest cover behavior. They are the automated safety net.
- **Agentic manual testing** with Playwright covers what a user sees in the running app, in several types and modes (see [Manual testing](#6-manual-testing)). There is no automated end-to-end suite, and none is planned.

## 2. Stack

Vitest, React Testing Library, `@testing-library/user-event`, `@vitest/coverage-v8`. Every project has a `vitest.config.ts` that extends `vitest.shared.ts` through `mergeConfig`.

> `mergeConfig` concatenates arrays. A project's `coverage.include` adds to the shared `src/**/*.ts`, it does not replace it. Never override the coverage reporter locally (`--coverage.reporter=text`): Vitest cleans the coverage folder first and writes no `lcov.info`.

Run tests through Nx: `pnpm nx run <project>:test` and `pnpm test:coverage`.

## 3. Coverage policy

Two independent levels, both mandatory:

| Level        | Requirement                                                                                |
| :----------- | :----------------------------------------------------------------------------------------- |
| Overall      | At least 80% for each project                                                              |
| Changed code | 100% of the lines you add or modify, and a changed source file with no coverage data fails |

Rules:

- Overall coverage above 80% is not evidence that changed code is covered.
- Never inflate coverage by weakening assertions, excluding files, or changing production behavior to be easier to test. Document every exclusion.
- New code on a branch must keep duplication at or below 3.0% (SonarQube Cloud). Extract shared components and parameterized tests (`it.each`, fixture factories) instead of copy-pasting.

## 4. What a good test looks like

- **Behavior, not implementation.** Call the code the way its user does and check what that user sees. If a test would still pass when every function returned nothing, rewrite or delete it.
- **No bare mock assertions.** A bare `toHaveBeenCalled()` or a lone `not.toHaveBeenCalled()` proves little. Assert the arguments, the rendered text or the resulting state.
- **Operator-visible feedback.** For every mutation, assert the exact toast title and description (`expect(showToast.error).toHaveBeenCalledWith('<Title>', '<Description>', undefined)`, or the rendered toast text) and the inline field message. See the [feedback contract](conventions.md#6-user-feedback-contract).
- **Queries by role, label and text** (`getByRole`, `getByLabelText`, `getByText`), not test IDs or CSS selectors.
- **Mock at the boundary.** In web tests, mock the `libs/api-client` facade or the TanStack Query layer, not internals.
- **Deterministic time.** Use fake timers (`vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`) for debounce, polling and animation. No arbitrary sleeps.
- **Independent tests.** No shared mutable state and no order dependence.
- **Cover** success, failure, boundary and empty cases, plus loading and error states for UI.

## 5. Bugs and refactoring

- **Bug fix:** reproduce first with a failing test, then fix the cause. A guard that only hides the crash is not a fix. The regression test covers the defective and the corrected behavior.
- **Refactoring:** pin the current behavior with tests, change the structure, and prove the pins still pass unchanged.

## 6. Manual testing

Manual testing checks behavior, not code: what an operator sees and can do in the running app. An agent drives it with Playwright, and the product owner repeats the important flows during acceptance. Web runs on `4200`, the server on `5000`. Reuse servers that are already running. Start new ones only from the uppercase drive path, record their PIDs, and stop exactly those afterwards.

### Test types

Each task states which types it needs. The rows build on each other, from cheap and frequent to thorough.

| Type           | Question it answers                                  | When                                                            | Done when                                                                                              |
| :------------- | :--------------------------------------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Smoke**      | Does the app still start and do the basics work?     | After every change that touches the UI or the API               | Sign in, open the dashboard, select the active server and open a settings page, with no console errors |
| **Feature**    | Does the change do what its acceptance criteria say? | For every backlog item                                          | Each criterion is checked on the success path, and every touched mutation also on one failure path     |
| **Regression** | Did the change break something that worked?          | For every change, plus the reproduction steps for every bug fix | The reproduction no longer fails, and the neighboring flows of the touched area still pass             |
| **Acceptance** | Does it solve the operator's problem?                | Before approval, by the product owner                           | The product owner signs off                                                                            |

### Test modes

A mode describes how the tester works, and combines with any type.

| Mode            | How it works                                                                                            | Use it for                                        |
| :-------------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------ |
| **Scripted**    | Follow written steps and expected results                                                               | Smoke, feature and regression tests               |
| **Negative**    | Feed invalid, boundary and hostile input: empty, too long, wrong type, path traversal, duplicate submit | Every form and every endpoint that takes input    |
| **Exploratory** | Time-boxed, goal-driven exploration without a script, noting what looks wrong                           | New screens and features with several states      |
| **Monkey**      | Random or rapid input with no plan: clicks, keys, resizing, navigation during loading                   | Finding crashes and races that scripts miss       |
| **Resilience**  | Break the environment on purpose: stop the server, drop the network, return `500`, reload mid-action    | Mutations, live updates and the process lifecycle |

### What to check in every session

- **Feedback:** each touched mutation shows a green toast on success and a red toast on failure, with inline field messages where fields are involved. See the [feedback contract](conventions.md#6-user-feedback-contract).
- **Forms:** the form rules in [conventions](conventions.md#7-forms).
- **Viewports:** a desktop (1440 x 900) and a phone (390 x 844) at least.
- **Console and network:** no unexpected console errors, failed requests or uncaught exceptions. Expected ones, caused by a negative test, are noted.
- **Duplicate submits:** a rapid double click on a save button sends one request.
- **Themes:** the screen is readable in a light and a dark theme.

### Evidence

Report what was run and what was not: the types and modes used, the viewports, the findings with reproduction steps, and anything left untested. Attach screenshots for visual changes. Never claim a check that was not performed.

## 7. Definition of done

1. Tests written and passing, with coverage meeting both levels.
2. `pnpm typecheck`, `pnpm lint` and `pnpm format:check` pass.
3. Manual testing done for visible changes, with the types and modes the task required.
4. `git status --short` is clean of stray files.
5. The report says exactly what ran and what did not.
