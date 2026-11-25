# Fix Roadmap

|              |                                                                                                     |
| :----------- | :-------------------------------------------------------------------------------------------------- |
| **Status**   | Proposed. Waiting for the product owner's approval of the order                                     |
| **Verified** | Against the [tech debt register](../tech-debt.md) (UI kit, server, web app, libraries, other items) |
| **Audience** | Maintainers and AI agents                                                                           |

This roadmap puts every finding of the first audit pass into one ordered list of work packages. It changes no code. Each package is approved before it starts, and runs through the delivery flow in [CLAUDE.md](../../CLAUDE.md). The [UI kit fix plan](ui-kit-fix-plan.md) keeps the detail of the ten UI kit packages, and this roadmap places them among the others.

## 1. What the register holds

| Area                                        | Findings | High | Medium | Low |
| :------------------------------------------ | -------: | ---: | -----: | --: |
| UI kit (`TD-UI`, two more are closed)       |       73 |    4 |     46 |  23 |
| Server (`TD-SRV`)                           |       17 |    0 |      6 |  11 |
| Web app (`TD-WEB`)                          |       12 |    1 |      8 |   3 |
| Libraries (`TD-LIB`)                        |        6 |    0 |      1 |   5 |
| Other items (`TD-01` to `TD-14`)            |       14 |    0 |      7 |   7 |
| Security (private, not listed in this file) |       10 |    - |      - |   - |

## 2. How the order was chosen

1. **Security and data safety first.** An unfixed weakness or a way to lose data comes before comfort.
2. **Breakage the operator meets today.** A blank page, a stale error, a misleading control, a page that cannot be used with a keyboard.
3. **Foundations that later work needs.** Tokens, the `Button`, shared building blocks, the role model and the service layer. Doing them early avoids doing the same change twice.
4. **Larger structural work**, then **the rest of the UI kit**, then **translations and guardrails**.
5. **Effort breaks ties.** A small fix goes before a large one of the same weight. Sizes: S is a few commits, M is one to two weeks of focused work, L is longer. They are not estimates.

## 3. The packages

| #   | Package                                    | Findings                                                                                                        | Size | Depends on | Wave |
| :-- | :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :--- | :--------- | :--- |
| R1  | Security hardening                         | The private list (`.agents/security-notes.md`). The first item is the one the product owner named               | M    | none       | 0    |
| R2  | App shell fixes                            | `TD-WEB-001`, `002`, `003`, `007`, `011`                                                                        | S    | none       | 1    |
| R3  | Data freshness and error messages          | `TD-WEB-005`, `008`, `009`, `TD-LIB-002`                                                                        | M    | none       | 1    |
| R4  | Server registration and data location      | `TD-WEB-004`, `TD-SRV-001`, `002`, `008`, `013`, `TD-03`                                                        | M    | none       | 1    |
| R5  | Accessibility fixes in components in use   | `TD-LIB-001`, `TD-UI-047`, `049`, `052`, `053`, `055`, `059`, `071` (package 1 of the UI kit plan)              | M    | none       | 1    |
| R6  | Contracts and constants cleanup            | `TD-13`, `TD-12`, `TD-09`, `TD-10`, `TD-14`, `TD-LIB-004`, `TD-SRV-017`                                         | M    | none       | 2    |
| R7  | Roles and first-run setup                  | `TD-01`, `TD-07`, `TD-LIB-005`, and new backlog items (root, setup screen, operators page, reset command)       | L    | R1         | 2    |
| R8  | UI foundations                             | UI kit packages 2, 3 and 4: tokens, `Button`, shared building blocks                                            | L    | R5         | 2    |
| R9  | Server structure                           | `TD-SRV-003`, `004`, `005`, `006`, `007`, `009`, `010`, `011`, `012`, `014`, `016`, `TD-LIB-006`                | L    | R4, R6     | 3    |
| R10 | Modals and overlays                        | UI kit package 6, `TD-WEB-006`                                                                                  | L    | R8         | 3    |
| R11 | Web structure and notifications            | `TD-WEB-010`, `012`, `TD-08`                                                                                    | L    | R3, R8     | 3    |
| R12 | Forms, data display, editor and log viewer | UI kit packages 5, 7 and 8                                                                                      | L    | R8, R10    | 4    |
| R13 | Translations                               | UI kit package 9 and the app's own strings: Ukrainian, Polish, German, Italian, French (machine translation)    | M    | R12        | 5    |
| R14 | Guardrails                                 | UI kit package 10, `TD-11`, `TD-UI-018` lint rule, the non-null rule                                            | S    | R13        | 5    |
| R15 | Small items                                | `TD-02` fonts, `TD-05` quote rotation, `TD-06` fixture name, `TD-LIB-003` RCON acknowledgements, the `Low` rest | S    | any        | 5    |

Already done: `TD-04` (the README was rewritten), and `TD-UI-001` and `TD-UI-002` (closed).

### Why this order

- **R1 first.** It is the only package about an unfixed weakness. It is decided that the insecure start-up defaults come first inside it. The details stay private until the fixes ship.
- **R2 to R5 are independent and small.** Each fixes something that is wrong today, none needs a foundation, and they can run in any order or in parallel branches. R2 is the cheapest and removes the only `High` item in the web app.
- **R6 and R7 prepare the server work.** The shared constants and one role check must exist before the server is split into services (R9). R7 also needs new backlog items (the root role, the setup screen, the operators page and the reset command) that are not written yet.
- **R8 before R10 to R12.** Tokens and the `Button` come first because every other component uses them.
- **R10 (modals) touches the most code,** nine modals in the app, so it goes after the foundations and before the controls that live inside modals.
- **R13 and R14 come last** because strings and rules stop changing only when the components are done.

## 4. What each package contains

- **R1 Security hardening.** Start-up defaults, sign-in and session handling, response headers, the Steam login handling. The list and the reasoning are in a private note, and the package description is written when the work starts.
- **R2 App shell fixes.** A not-found page, one browser title per route, a heading on the empty states, removal of the header search box until search exists, and no raw internals on the dashboard.
- **R3 Data freshness and error messages.** Invalidate the config query when a server changes, readable network errors, a connection indicator in the header, specific messages instead of generic ones, and a timeout in the HTTP client.
- **R4 Server registration and data location.** A warning (not a refusal) when the install path is missing, one `DSM_DATA_DIR` setting for the database, the vault key and the backups, the Node version pinned with a clear error when the native module needs a rebuild, and an explicit step for syncing the config file into the database instead of a `GET` that writes.
- **R5 Accessibility fixes in components in use.** The parser depth limit, a focusable read-only editor and diff, a focusable and correctly named table region, the column menu focus, tabs that scroll, the notification panel width, and pagination that wraps and keeps focus.
- **R6 Contracts and constants cleanup.** One definition for each path rule, port default, password rule and timeout, and removal of the error codes nothing emits.
- **R7 Roles and first-run setup.** One central `requireRoot`, no seeded account, a setup screen with a one-time token, an operators page and a host command to reset the root password.
- **R8 UI foundations.** Named tokens, one focus ring, one label and hint style, the typed icon-only `Button`, `useMergedRef`, one field shell, one popup surface, one spinner and one tone map.
- **R9 Server structure.** Services for servers, mods and Steam settings, one SSE writer and one session helper, one validation style, session cleanup, `trustProxy`, a builder for the path inspector, and the smaller hygiene items.
- **R10 Modals and overlays.** One `Modal` on the native `<dialog>`, the confirm flow that stays open with a spinner, toasts and popups in the top layer, errors that stay until dismissed, and focus moved into every dialog.
- **R11 Web structure and notifications.** The five large view components split into hooks and parts, and the toast and bell model as decided: toasts for request results, the bell for background events, with a stored history.
- **R12 Forms, data display, editor and log viewer.** The rest of the UI kit plan.
- **R13 Translations.** Message provider and strings for the kit and the app, with plural-aware messages.
- **R14 Guardrails.** Lint rules and checks that stop the drift from coming back.
- **R15 Small items.** Local fonts, the quote rotation, a renamed fixture, and the rest of the `Low` items.

## 5. Decisions needed before a wave starts

| Before | Question                                                                                                                                              |
| :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1     | None. The first item is decided.                                                                                                                      |
| R2     | Remove the header search box now (recommended) or build search? Global search is an open question in the [design system](../design/design-system.md). |
| R4     | Confirm the explicit sync step for the config file (recommended), instead of syncing on every read.                                                   |
| R7     | The backlog items for the root role, the setup screen, the operators page and the reset command must be written and approved first.                   |
| R15    | `TD-02`: bundle the fonts locally (recommended). `TD-05`: rotate the footer quote every 60 seconds, or once per session.                              |
| R11    | Which events belong in the bell (the list is open in `TD-08`).                                                                                        |

## 6. How a package runs

- **Branch:** `bugfix/<name>` for R2 to R5, `cr/<name>` for the others, created from `master`.
- **Commits:** one per finding or small group, each building and passing its tests, after the product owner approves the change.
- **Flow:** the sdlc lanes from [CLAUDE.md](../../CLAUDE.md). A bugfix starts with a failing test. Packages that need new design (R7, R10) get requirements written and approved first.
- **Done:** tests passing with the coverage in [testing](testing.md), `pnpm typecheck`, `pnpm lint` and `pnpm format:check` passing, manual testing in the running app for visible changes, and the register updated (each finding gets its status).

## 7. Suggested start

Approve R1, then R2, R3 and R4 in parallel branches (they touch different files), then R5. After those, the product owner reviews the running app, and R6 to R8 follow.
