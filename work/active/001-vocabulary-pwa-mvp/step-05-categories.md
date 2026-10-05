# Step 05 — Categories

Status: done
Spec: docs/SPEC.md §8, §20.3, §25; AC-44…AC-49; test T5

## Goal
Category management on `/categories`: list with card counts, create, inline rename, delete (cards move to `Other`), `Other` locked. Shared `useCategories` hook + sort order for steps 06/07.

## Scope
- In: `domain/categories.ts` (sort), local repo additions (delete + reassign transaction, card counts), `services/categoryService.ts`, hooks (`useCategories`, `useCategoryCounts`, `useCategoryActions`), `features/categories/{CategoryForm,CategoryRow}`, `CategoriesPage`, tests T5.
- Out: filter sheet (06), category select in the card form (07), sync status UI (10).

## User actions
- [ ] 👤 Optional manual check in the dev server (see Verification) — not done yet; can be folded into the step-06 check.

## Tasks
- [x] `sortCategories` + tests
- [x] `deleteCategoryLocally`, `countCardsByCategory`
- [x] `categoryService` (create/rename/delete) + tests
- [x] Hooks
- [x] `CategoryForm`, `CategoryRow`, `CategoriesPage` + component tests
- [x] Docs (SPEC/decisions if needed), plan.md

## Files
- `src/domain/categories.ts` (+ test)
- `src/repositories/local/{categoriesLocalRepo,cardsLocalRepo}.ts`
- `src/services/{errors,categoryService}.ts` (+ test)
- `src/hooks/{useCategories,useCategoryCounts,useCategoryActions}.ts`
- `src/features/categories/{CategoryForm,CategoryRow}.tsx`
- `src/pages/CategoriesPage.tsx` (+ test)

## Verification
- [x] lint / typecheck / test / build / format:check — all pass (112 tests, 17 files); build OK, same chunk-size warning (656 kB, Backlog)
- [x] No Dexie/repositories/services/Supabase imports in `pages/`, `features/`, `components/` (grep)
- [ ] 👤 (optional) Dev server: create "Idioms" → appears; rename; delete with confirm → its count moves to Other; "Sync now" → row present / tombstoned in Supabase Table editor

## Notes / decisions
- D32: destructive confirmations via native `window.confirm()`; SPEC §8.5 prompt wording for 0/1 cards, rename Enter/Escape + unchanged-name no-op.
- `categoryService` takes the local `user_id` from `meta.user_id` (written by `SyncProvider` on sign-in); remote upserts still omit it (D29).
- Delete = tombstone + outbox entry + local reassignment to Other in one transaction; reassigned cards keep `updated_at` and get no outbox entry (server trigger does the same). The sync engine removes the row once the tombstone is written back.
- Services throw `ValidationError` (message shown as-is); anything else is shown as "Couldn't save.".
- `TextField` now accepts `ref` (`ComponentProps<'input'>`) to focus the field on open / after a failed save.
- `useCategories()` returns the sorted list (Other last) — ready for the filter sheet (06) and card form (07).
