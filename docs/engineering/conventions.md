# Conventions

|              |                                                        |
| :----------- | :----------------------------------------------------- |
| **Status**   | Implemented. Enforced by ESLint, TypeScript and review |
| **Verified** | Against commit `49b09cc`                               |
| **Audience** | Maintainers and AI agents                              |

These rules follow the four pillars (security, consistency, comfort, modern UI/UX). A deviation is a defect, not a style choice.

## 1. Architecture boundaries

- `apps/web`, `libs/ui` and `libs/api-client` never import `better-sqlite3`, `fastify`, `node:child_process` or `node:fs`.
- `libs/api-contracts` stays pure TypeScript and Zod.
- Nx tags and `@nx/enforce-module-boundaries` enforce the dependency graph. See the [overview](../architecture/overview.md#dependency-rules).
- Production builds never include test mocks or development fixtures. Guard dev-only code with `import.meta.env.DEV` so it is tree-shaken.
- Package scope is `@aegis/*`. Do not introduce other scopes.

## 2. Contract-first API

1. Define or change the Zod schema in `libs/api-contracts`.
2. Reflect it in `libs/api-client`.
3. Implement or change the Fastify route in `apps/server/src/routes`.

Reject bad input at the route with the shared schema. Reply with `sendApiError`, which produces one error envelope: `errorCode`, message, and optional `fieldErrors`. A rejection caused by one input field must include `fieldErrors.<field>` with a code from the `validation` group in `apps/web/src/core/i18n/locales/en-US.ts`, so the client can highlight the field.

## 3. Security and safety

- **Processes:** spawn with argument arrays (`spawn(cmd, [args])`), never shell strings.
- **Server shutdown:** try BattlEye RCON `#shutdown` first, so DayZ flushes persistence. Fall back to a force-kill only after the stop timeout.
- **Game files:** write atomically (temp file, then rename) and keep a `.bak_{timestamp}` backup first.
- **Secrets:** encrypt at rest. Never put credentials in URLs, logs, error messages or query strings. Redact them in request logs.
- **Paths:** validate and normalize every user-supplied path, and deny sensitive system roots.
- **Authentication:** header tokens only. SSE connects with a one-time ticket.

## 4. TypeScript

- No `any`. Use `unknown` and narrow with type guards or Zod.
- No non-null assertions (`!`). Use optional chaining, `??` or a runtime guard.
- Model asynchronous lifecycles as discriminated unions (`status: 'idle' | 'pending' | 'success' | 'failed'`) with a `never` exhaustiveness check.
- Use `as const` for query-key factories and static configuration.
- Use `import type` for types.

## 5. React and the UI kit

- React 19: `ref` is a normal prop. Never use `forwardRef`.
- A `*.tsx` file exports components only. Put helpers in `*.utils.ts` and types in `*.types.ts`.
- Multi-part components use compound subcomponents (for example `KpiCard.Sparkline`).
- Derive values during render. Never copy props or state into state through `useEffect`.
- **Controls are 36 px high** (`h-9`). The `size` prop is retired. A component that wraps an input exposes `containerClassName`.
- Colors, font sizes, radii, shadows and fixed dimensions come from tokens (`var(--color-primary)`), never hardcoded values. See the [design system](../design/design-system.md).
- Mutations and queries go through the `libs/api-client` facade and TanStack Query. Query keys come from factories.

## 6. User feedback contract

Every user-initiated mutation (create, update, delete, validate, or any button that calls the API) gives the operator explicit feedback. A missing toast or a swallowed error is a blocking defect.

| Outcome                        | Required feedback                                                                         | How                                                                                                  |
| :----------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| Success                        | Green toast                                                                               | `notifySuccess('<NOTIFICATION_CODE>', params)` with a code from `locales/en-US.ts` → `notifications` |
| API failure                    | Red toast, always, also when the response carries `fieldErrors`                           | `notifyApiError(err, '<Fallback title>')`                                                            |
| API failure with `fieldErrors` | Red toast and each rendered field highlighted with a specific message, focus on the first | `reportServerErrors(err)` from `useEditableForm`, plus `error={errors.<field>}` on the input         |
| Client-side validation failure | Fields highlighted inline with the message, focus on the first. No request, no toast      | `useEditableForm` `validate` and `handleSubmit`                                                      |

Rules:

- Never call `showToast.*` directly in feature code. Use `notifySuccess`, `notifyApiError` and `notifyInfo`: they translate API error codes into messages.
- Toasts report the result of a request. The notification centre (the bell) is for background events, such as the result of a delayed task that no request is waiting for. Warning and info toasts are not in use yet. Today the three helpers also write every toast into the bell, which is a known deviation (TD-08 in the [register](../tech-debt.md)).
- Never return early from `onError` after setting field errors. The toast is still required, because the field may not be on screen.
- Every `mutate(...)` with an `onSuccess` also has an `onError`, on the mutation or at the call site.
- Background reads never toast.

## 7. Forms

Every create and update form uses `useEditableForm` (`apps/web/src/core/forms`). Sign-in is not one of them: it creates and edits nothing, and it has no unsaved changes to protect. Reference implementations: `ServerSettingsView` (header `SaveButton` outside the form), `SteamSettingsView` (secret fields), `CreateServerModal` (create form).

1. **Save disabled without changes (update forms).** The submit control is a `SaveButton`. It is `aria-disabled` with the tooltip "No changes to save" while the form matches its saved values, enabled after a real change, and inert again after reverting. Whitespace-only edits are not changes. After a successful save it returns to the unchanged state. Create forms are always enabled. Enter in a field never submits an unchanged form.
2. **Validation on save.** No client errors while typing before the first save attempt. On save, every invalid field shows its message and the first one receives focus. After a failed attempt, errors update live.
3. **Server field errors.** Shown inline, plus the red toast. Focused, and hidden once the rejected value is edited.
4. **Unsaved changes.** With unsaved edits, navigating away, switching server, signing out, or closing a form modal (Cancel, X, Escape, backdrop) shows "Discard unsaved changes?". Reload or tab close shows the browser prompt. Reverting the edits or a successful save removes the warning. `useEditableForm` registers the form automatically. Modals close through `confirmDiscard(onClose)`. A programmatic navigation after a confirmed action passes `ignoreBlocker: true`, or calls `releaseUnsavedChanges()` first.

## 8. Documentation upkeep

- Update the affected document in the same change as the code. Documents describe what exists and mark everything else as planned or undecided.
- Write in plain technical English: short sentences, present tense, concrete facts.
