# UI / UX conventions

Primary target: iPhone, installed PWA (standalone), portrait, one-handed use. Desktop must work but is secondary.

## Layout

- Design at 375–430 px width first. Max content width ~640 px centered on larger screens.
- Respect safe areas: `viewport-fit=cover` + `env(safe-area-inset-*)` padding on header, bottom bar and fixed elements.
- Primary actions within thumb reach (bottom area). Use a sticky bottom action bar on detail/form pages.
- No horizontal scrolling. Long words/phrases wrap (`break-words`).
- Use `100dvh` rather than `100vh`.

## Touch & input

- Touch targets ≥ 44×44 px. Spacing between adjacent targets ≥ 8 px.
- Inputs use `text-base` (16 px) minimum to prevent iOS zoom on focus.
- Proper `type`, `autocomplete`, `inputmode`, `enterkeyhint` on inputs (`email`, `current-password`…).
- Disable double submission: buttons show a pending state while an action runs.

## Visual style

- Minimal, calm, readable. System font stack. **Monochrome only — black, white, `neutral-*` grays; no accent/hue colors** (SPEC §6 *Visual style*); sole exception: the green Learned pill (D45). Support `prefers-color-scheme: dark` (inverted). Errors are marked by `⚠`/weight/border, never by red.
- Check: `grep -rE "(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|stone)-[0-9]" src` must be empty.
- Card detail hierarchy: title (largest) → notes (rich text) → audio.
- Status shown as a small pill (Learning / Learned); category as muted text or chip.

## States (every data-driven screen)

| State | Pattern |
|---|---|
| Initial loading | skeleton rows or centered spinner, never blank |
| Load more | button shows spinner, list stays visible |
| Empty | short friendly message + primary action ("No learning cards yet." + "Add card") |
| Error | message + "Retry" button |
| Offline | small persistent banner "Offline — changes will sync later"; network-only actions disabled with explanation |
| Pending sync | subtle indicator (e.g. dot) on unsynced cards / in header |

## Accessibility

- Semantic HTML: `<main>`, `<nav>`, `<header>`, `<ul>/<li>` for lists, `<button>` for actions, `<a>`/`<Link>` for navigation.
- Every input has a `<label>`. Errors linked via `aria-describedby`; `aria-live="polite"` for async status.
- Visible focus styles. Color contrast WCAG AA. Icons that act as buttons have `aria-label`.
- Respect `prefers-reduced-motion`.
