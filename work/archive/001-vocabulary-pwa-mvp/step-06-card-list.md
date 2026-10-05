# Step 06 — Card list

Status: done
Spec: docs/SPEC.md §6 (App shell, Visual style), §7.4, §11, §12, §14, §25; AC-7…AC-19; tests T2, T9

## Goal
The main `/cards` screen: newest-first list from IndexedDB, filter sheet (status + category with counts), debounced search in the URL, "Load more" window, all states, count + scroll restore on Back. Plus the owner's new rule: **monochrome black & white UI**, applied to all existing screens.

## Scope
- In: monochrome rule (SPEC/ui-ux/D33) + recolor of existing components; `cardFilter` helpers; `listCards`, `countCardFacets`, `listPendingIds`; hooks `useCardFilter`, `useCardList`, `useCardFacets`, `usePendingCardIds`, `useListScrollRestore`; `CardListHeader`, `SearchBar`, `FilterSheet`, `CardListItem`, `StatusPill`; `CardListPage`; ui `EmptyState`, `ErrorText`, `HeaderRow`, icons, shared class strings.
- Out: card form (07), detail + prev/next (08), sync status UI (10).

## User actions
- [ ] 👤 Optional manual check in the dev server (see Verification).

## Tasks
- [x] Monochrome rule in SPEC §6, ui-ux.md, D33; recolor Button, TextField, AppLayout, OverflowMenu, OfflineBanner, SplashScreen, ConfigErrorScreen, CategoryRow, LoginPage, CategoriesPage, NotFoundPage; dark `theme-color` → `#0a0a0a`
- [x] Domain: `filterLabel`, `emptyListMessage`, `countFacets` (faceted, D34), `statusLabel` + tests
- [x] Local repo: `listCards`, `countCardFacets`, `listPendingIds` + T2 tests
- [x] Hooks (visibleCount window keyed by canonical query in sessionStorage; scroll restore)
- [x] Header via `handle.Header` (D35), search row, filter `<dialog>` sheet
- [x] CardListPage with all states + FAB + T9 tests
- [x] Docs (SPEC §11.2, §12; D33–D36), plan.md

## Files
- `docs/SPEC.md`, `docs/decisions.md`, `docs/conventions/ui-ux.md`, `index.html`
- `src/components/ui/{styles.ts,ErrorText,EmptyState,HeaderRow,icons}.tsx`, `Button.tsx`, `TextField.tsx`
- `src/domain/cardFilter.ts` (+ test)
- `src/repositories/local/{cardsLocalRepo (+ test),outboxRepo}.ts`
- `src/hooks/{useCardFilter,useCardList,useCardFacets,usePendingCardIds,useListScrollRestore,listSession}.ts`
- `src/features/cards/{CardListHeader,SearchBar,FilterSheet,CardListItem,StatusPill}.tsx`
- `src/pages/CardListPage.tsx` (+ test), `src/app/{AppLayout,router}.tsx`, `src/test/setup.ts` (dialog polyfill)

## Verification
- [x] lint / typecheck / test / build / format:check — all pass (138 tests, 19 files); build OK with the known chunk-size warning (669 kB / 198 kB gzip, Backlog)
- [x] No chromatic Tailwind classes in `src/` (grep from ui-ux.md → empty)
- [x] No `db`/`repositories`/`services`/`lib/supabase` imports in `pages/`, `features/`, `components/`
- [ ] 👤 (optional) Dev server on iPhone/desktop: filter sheet opens from the bottom, choices apply, Done/backdrop close; search filters after typing; Load more; open a card (404 until step 08) → Back restores the count and scroll; dark mode looks inverted.

## Notes / decisions
- D33 monochrome theme; D34 faceted counts; D35 `handle.Header`; D36 manual list scroll restore.
- Closing the search row (🔍) clears `q`; the row is open whenever `q` is in the URL.
- `⚠` uses U+FE0E so iOS renders it as a text glyph, not a color emoji. Audio/search icons are inline SVG with `currentColor`.
- FAB `+` and "Add your first card" link to `/cards/new`, and rows link to `/cards/:id` — both routes arrive in steps 07/08 (show NotFound until then).
- jsdom lacks `HTMLDialogElement.showModal/close` → minimal polyfill in `src/test/setup.ts`.
