# Aegis Design System

|              |                                                                                                                                                                  |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Draft for product owner review                                                                                                                                   |
| **Verified** | Tokens, fonts, themes and layout against `libs/ui/src/styles`, `apps/web/src/components/layout`, `features/theme` and `features/flavor-text` at commit `e047499` |
| **Audience** | Maintainers and AI agents                                                                                                                                        |
| **Note**     | Where the code and an earlier design decision disagree, the code wins and the difference is listed in [Open questions](#open-questions).                         |

The UI kit lives in `libs/ui` (`@aegis/ui`). Storybook is the component catalogue (`pnpm storybook`). This document covers the decisions behind it.

## 1. Intent

Aegis should feel like a calm, dependable control room, not a generic admin template and not a game HUD. It serves the [Modern UI/UX pillar](../product/vision-and-scope.md#2-pillars): fast, accessible, themeable, smoothly animated, and thoughtful in small details.

- **Operational clarity first.** Status, activity and events are scannable at a glance.
- **Atmosphere stays secondary.** The DayZ world informs the identity, but scenery never competes with data.
- **One product.** Every page uses the same shell, components, spacing and status language.
- **Real data only.** Production screens never show decorative placeholder values. Unavailable data is shown as unavailable.

Avoid: aggressive military-HUD styling, heavy blur or transparency behind dense text, neon accents, hard shadows, oversaturated charts, mixed corner radii or icon styles, and dashboards that expose every action.

## 2. Brand

- **Name:** Aegis. **Descriptor:** DayZ Server Manager.
- **Logo:** the `Logo` component (`apps/web/src/components/layout/Logo.tsx`) is a first-party SVG with a tent mark (`aegis-logo__tent`), a loading state and a hover animation. It stays a bespoke asset and does not come from an icon library.
- **Icons:** Lucide line icons only. Icon-only controls carry an accessible label.

## 3. Themes and tokens

Colors come only from semantic CSS variables (`var(--color-primary)` and so on). Components never hardcode HEX values. Variables are defined per theme in `libs/ui/src/styles/themes.css` and exposed to Tailwind in `theme.css` (`@theme inline`).

### Themes

Twelve themes, six light and six dark, applied through `data-theme` on `<html>`. The operator picks a preferred light theme and a preferred dark theme, and the mode switches between them (`features/theme`).

| Light (default `vanilla`) | Dark             |
| :------------------------ | :--------------- |
| `vanilla`                 | `obsidian`       |
| `frostline-light`         | `frostline-dark` |
| `chernarus-light`         | `chernarus-dark` |
| `livonia-light`           | `livonia-dark`   |
| `badlands-light`          | `badlands-dark`  |
| `krasno-light`            | `krasno-dark`    |

Older theme ids (for example `tokyo`, `darcula`) are mapped to current ones when settings load.

### Token groups

| Group     | Tokens                                                                                |
| :-------- | :------------------------------------------------------------------------------------ |
| Surfaces  | `canvas`, `surface`, `surface-subtle`, `surface-hover`, `surface-elevated`, `sidebar` |
| Borders   | `border`, `border-subtle`, `border-hover`                                             |
| Text      | `text-main`, `text-secondary`, `text-muted`, `text-inverse`                           |
| Brand     | `primary`, `primary-hover`, `primary-light`, `primary-border`, `primary-fg`           |
| Status    | `success`, `warning`, `danger`, `info`, each with `-light`, `-border` and `-fg`       |
| Charts    | `chart-blue`, `chart-teal`, `chart-sky`, `chart-other`, `chart-grid`                  |
| Shape     | `radius-card` 12 px, `radius-banner` 16 px                                            |
| Elevation | `shadow-card`, `shadow-card-hover`, `shadow-dropdown`                                 |

The default theme uses Aegis Royal Blue (`--color-primary: #3366d6`). The status colors keep their meaning in every theme: green is healthy, amber needs attention, red is critical or destructive, blue is the primary action or neutral information.

### Rules

- **No hardcoded values.** Every color, font size, spacing exception, radius, shadow and fixed dimension comes from a token. A literal such as `text-[11px]` or `#fff` in a component is a defect. Existing violations are tracked in the [tech debt register](../tech-debt.md).
- Name tokens by role (`danger`), never by appearance (`red-500`).
- Never rely on color alone. Pair every state color with text or an icon.
- Add a new token to every theme or to none.
- Keep chart series distinguishable by more than hue.

## 4. Typography

- **Sans:** Inter (300 to 700). **Mono:** IBM Plex Mono (400 to 600), for logs, code and configuration.
- Use monospace only for raw content such as logs and `serverDZ.cfg`, never for navigation or explanations.
- Build hierarchy from size, weight, color and spacing together. Use tabular numerals for values that update.
- Both fonts are currently loaded from Google Fonts at runtime. See [Open questions](#open-questions).

## 5. Shape, spacing and controls

- Spacing follows a 4 px base scale (Tailwind utilities).
- Cards use `radius-card` (12 px). Banners use `radius-banner` (16 px). Pill shapes are only for genuinely pill-shaped controls such as status tags.
- **Controls are 36 px high** (`h-9`). The kit has no `size` prop. A control that wraps an input exposes `containerClassName`.
- Prefer a fine border plus a soft shadow over a heavy shadow alone. Elevation signals hierarchy or interaction, so not every card gets a different shadow.

## 6. Layout

The application is desktop-first and also works on a phone.

| Part    | Behavior                                                                                                                                                                                                               |
| :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar | Fixed 228 px rail from the `lg` breakpoint, sticky and full height. Below `lg` it becomes an off-canvas drawer (260 px) with a scrim. It holds the logo, the server selector, grouped navigation and the user profile. |
| Header  | Mobile menu button, breadcrumbs, notification menu, theme toggle and a help button that opens the documentation modal.                                                                                                 |
| Content | `PageContainer` with consistent padding. Long pages scroll vertically. There is no right sidebar.                                                                                                                      |
| Footer  | In the content flow. A quote with a subtitle on the left, the app version on the right.                                                                                                                                |

Navigation is grouped by scope: server pages, appliance settings (`/settings/steam`, `/settings/app`) and user pages. It is defined in `apps/web/src/core/navigation/navigation.config.ts`.

### Planned: dashboard (`DSM-00112`)

Design intent for the dashboard, not yet built:

- A 12-column grid. A server hero on top with state, name, address, uptime, players and the lifecycle actions, because the server context is explicit there.
- One row of equal KPI cards, normally four.
- Two related charts side by side (7/5 or 6/6). Events, performance and the log panel use full width.
- No quick-action grid. Each action lives in its own context: lifecycle in the hero, mods in Mods, backups in Backups.
- Full mod management and configuration never move onto the dashboard. A compact summary links to them.

## 7. Motion

- Motion explains a change, keeps orientation or gives feedback. It is short, subtle and never delays work.
- Prefer opacity and small transforms. No bouncing and no constant pulsing in monitoring views.
- Live metric updates are calm and never shift the layout.
- `prefers-reduced-motion` is honored (`libs/ui/src/styles/keyframes.css`, the footer quote, the logo).
- Never encode important status in animation alone.

## 8. Accessibility

The baseline target is WCAG 2.2 AA.

- Keyboard access for navigation, menus, dialogs and forms, with a visible focus ring and a predictable focus order.
- Semantic headings and landmarks. Navigation regions carry `aria-label`.
- Confirmation dialogs open with a safe default and explain the consequence.
- Text zooms without clipping critical controls.

## 9. States and feedback

Every meaningful component defines: loaded, loading, empty, error, disabled, and stale or disconnected where data is live. Loading skeletons keep the final geometry. An error says what failed and what to do next.

Every user-initiated mutation gives explicit feedback. The contract lives in [conventions](../engineering/conventions.md) (_to be written_) and is summarized in `CLAUDE.md`.

## 10. Content and tone

- Labels are short and direct: "Online", "Restart server", "Update available", "Last backup".
- Errors and critical workflows use precise language with no jokes.
- The product voice is calm, capable and grounded. It is never melodramatic or military.
- Atmospheric copy belongs in the footer quote, not in anything an operator must act on.

### Footer quote

`FlavorText` shows one quote and subtitle from `apps/web/src/features/flavor-text/flavor-text.data.ts`, which is the source of truth for the wording. The text crossfades with a small vertical offset, and the transition is static under reduced motion.

## 11. Review checklist

Before approving a page or component:

- Colors come from tokens and the page works in a light and a dark theme.
- Controls are 36 px, radii and spacing use the shared values.
- Status is not conveyed by color alone, and focus is visible.
- Loading, empty, error and disabled states exist.
- Destructive actions are confirmed.
- Reduced motion is respected and live updates do not shift the layout.

## Open questions

1. **Quote rotation.** The old design said the footer quote must not rotate, and should change per session. The code rotates every 60 seconds (`useFlavorText`, `interval = 60_000`). Which behavior do you want?
2. **Fonts.** `fonts.css` imports Inter and IBM Plex Mono from `fonts.googleapis.com`. A self-hosted appliance on a LAN or offline host falls back to system fonts, and every page load contacts Google. Bundle the fonts locally? I recommend yes, for the security and consistency pillars.
3. **Sidebar collapse and global search.** The old design had a collapsible icon-only sidebar and a global search or command palette. Neither exists in the code. Are they planned?
4. **Section voice.** The old materials included a long phrase bank for hero banners on each page (`HeroBanner` exists in the kit but no page uses it, and none of the phrases are in the code). Keep it as a future concept, or archive it?
5. **Contrast across 12 themes.** The target is WCAG 2.2 AA. Is there a measured audit of every theme, or should that be a tech-debt item?
