# Step 07 — Create / edit / delete card (no audio)

Status: done
Spec: docs/SPEC.md §7.1–§7.3, §7.6, §20.3, §25 (Card form); AC-20…AC-24, AC-35…AC-37; test T4

## Goal
Add, edit and delete cards: `cardService` (validation, defaults, `learned_at` rules, soft delete) and `CardFormPage` for `/cards/new` and `/cards/:id/edit`, keeping the list context in the URL.

## Scope
- In: `cardService`, `learnedAtFor`, local repo `findCardsByTitle` / `deleteCardLocally`, hooks `useCard` / `useCardActions` / `useDuplicateTitle`, ui `TextArea` / `Select`, `CardForm`, `CardFormPage`, routes, dynamic header back link, FAB context.
- Out: audio (09), detail page + prev/next (08).

## User actions
- [ ] 👤 Optional manual check in the dev server (see Verification).

## Tasks
- [x] Domain: `learnedAtFor`, `deleteCardPrompt`, `duplicateTitleKey` + tests
- [x] Local repo: `findCardsByTitle`, `deleteCardLocally` + tests
- [x] `cardService` + errors + T4 tests
- [x] Hooks `useCard`, `useCardActions`, `useDuplicateTitle`
- [x] ui `TextArea`, `Select`; `CardForm`; `CardFormPage`; routes; `RouteHandle.back` function; FAB query
- [x] Page tests (AC-20…24, AC-35, AC-37)
- [x] Docs: SPEC §7.6, §20.3; D37–D40; plan.md
- [x] Owner follow-up: unsaved-changes warning (`useLeaveGuard`, D41) + tests

## Files
- `src/domain/{cardStatus,cardForm}.ts` (+ tests)
- `src/repositories/local/cardsLocalRepo.ts` (+ test)
- `src/services/{cardService,errors}.ts` (+ test)
- `src/hooks/{useCard,useCardActions,useDuplicateTitle,useLeaveGuard}.ts`
- `src/components/ui/{TextArea,Select}.tsx`, `src/features/cards/CardForm.tsx`, `src/pages/CardFormPage.tsx` (+ test)
- `src/app/{AppLayout,router}.tsx`, `src/pages/CardListPage.tsx`

## Verification
- [x] lint / typecheck / test / build / format:check — all pass (171 tests, 23 files); build OK with the known chunk-size warning (679 kB / 200 kB gzip, Backlog)
- [x] Monochrome grep empty; no data-layer imports in pages/features/components
- [ ] 👤 (optional) Dev server: create a card with only a title → `/cards/<id>` (NotFound until step 08); Back → first in the list with a pending dot that clears after sync; `/cards/<id>/edit` → edit translation, toggle status, delete.

## Notes / decisions
- D37 select without blank option; D38 status on edit form only; D39 navigation after save/delete with `replace`; D40 Save & add another. SPEC §7.6 added.
- `RouteHandle.back` may be a function of `{ params, search }` so back links keep the list context (reused by step 08).
- Card delete always enqueues the folder `audio:delete` (`<user>/<card>/`, D29), even without `audio_path`: older replaced recordings may still exist, and an empty folder is a cheap no-op.
- Unchanged edit is a no-op (same as category rename). `setStatus` is implemented now for step 08.
- Shared field look moved to `FIELD` in `components/ui/styles.ts` (TextField, TextArea, Select). TextArea grows via `field-sizing: content`.
- D41 (owner request): leaving a changed form asks "Discard unsaved changes?" — `useBlocker` covers in-app links and browser Back (POP), `beforeunload` covers reload/close (ignored by iOS when the app is killed). Save / add another / confirmed delete bypass via `leave()`.
