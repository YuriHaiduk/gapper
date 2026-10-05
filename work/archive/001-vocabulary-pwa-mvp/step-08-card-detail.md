# Step 08 — Card detail & prev/next

Status: done
Spec: docs/SPEC.md §7.5, §12, §13, §25; AC-25…AC-34; T3

## Goal
`/cards/:id` detail page: title, notes, category, status, dates; one-tap status toggle; previous/next within the list context (keyset neighbours), keyboard ←/→; Back returns to the list with its scroll.

## Scope
- In: `getAdjacentCards` (local repo), `useAdjacentCards`, `CardDetailPage`, `CardDetailHeader` (Back · Edit · ⋯), `AdjacentNav`, `StatusToggle`, `formatDate`, route, list scroll restore on header Back, tests, docs.
- Out: audio player (step 09), pending/sync indicators on the detail page (step 10), swipe gestures (§29).

## User actions
- [x] None (iPhone check later, after step 12).

## Tasks
- [x] `getAdjacentCards` + T3 tests
- [x] `formatDate` + test
- [x] `useAdjacentCards`; scroll restore on `restoreList` state
- [x] `CardDetailPage`, `CardDetailHeader`, `AdjacentNav`, `StatusToggle`, route
- [x] Page tests (AC-25…AC-34, keyboard, not found)
- [x] Docs: SPEC, decisions, plan.md

## Files
- `src/repositories/local/cardsLocalRepo.ts` — keyset neighbours
- `src/domain/dates.ts` — date formatting
- `src/hooks/useAdjacentCards.ts`, `src/hooks/useListScrollRestore.ts`
- `src/pages/CardDetailPage.tsx`, `src/features/cards/{CardDetailHeader,AdjacentNav,StatusToggle}.tsx`
- `src/app/router.tsx`, `src/components/ui/HeaderRow.tsx`

## Verification
- [x] npm run lint / typecheck / test / build / format:check — all pass (199 tests, 28 files; full suite run 3× without flakes); build: app chunk 688 kB / 203 kB gzip (+6.5 kB), `NotesEditor` chunk unchanged
- [ ] Manual check in the dev server — not done by Claude (signing in needs the owner's credentials); covered by page tests, owner to click through: list → card → Next ×3 → Back, Mark as learned in Learning, ←/→, header Back keeps scroll

## Notes / decisions
- D44: detail header via `handle.Header` — Back · Edit · ⋯; Back links to `/cards?<ctx>` with state `{ restoreList: true }`, which `useListScrollRestore` treats like POP (scroll + count restored). `HeaderRow` side slots are now `min-w-11`.
- `getAdjacentCards(position, filter, categoryId)` — Dexie `above`/`below` on `[created_at+id]` (exclusive bounds) + the shared `matchesCardFilter`; unknown slug → no neighbours (documented in SPEC §13).
- `useAdjacentCards` tags the result with the card id: `useLiveQuery` keeps the last value while the next query runs, so a fast ←/→ never uses another card's neighbours.
- The page waits for the categories too (skeleton), so the category chip doesn't pop in.
- Disabled neighbour = `<span role="link" aria-disabled="true">` with the muted word Previous/Next (layout stable, AC-30).
- Test env: polyfilled `Range.getClientRects/getBoundingClientRect` (jsdom has no layout) — ProseMirror's deferred `scrollIntoView` threw once Save in the form test started rendering the real detail page instead of NotFound.
- Audio player: step 09.
