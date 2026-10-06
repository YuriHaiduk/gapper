# Step 01 — Optional `type` (part of speech) on cards

Status: blocked (waiting for owner)
Spec: docs/SPEC.md §7.1, §7.4, §7.5, §7.6, §16, §17 · D63

## Goal
Cards get an optional part of speech from a fixed list, chosen on the form and shown on the
detail page (under the title) and in the list row (`Noun · Law`).

## Scope
- In: DB column + CHECK, Dexie v3, sync column, service, form select, detail/list display, tests, docs.
- Out: filtering, search, managing the list.

## User actions
- [x] Allow running `npx supabase@2.119.0 db push` + `test db --linked` (migration
      `20261006120000_card_type.sql`) — **before** the frontend is deployed, otherwise card
      pushes fail on the unknown column.
- [ ] After deploy: check on the iPhone (select in the form, label on the card and in the list).

## Tasks
- [x] Migration `supabase/migrations/20261006120000_card_type.sql` + pgTAP `card_type.test.sql`
- [x] `domain/partsOfSpeech.ts` (keys, labels, guard) + test; `Card.type`
- [x] Dexie v3 upgrade (`type = null`) + test
- [x] `cardsRemoteRepo` column; `cardService` normalize / no-op check + tests
- [x] `CardForm` select after Pronunciation; add-another resets it; `CardFormPage` initial values
- [x] Detail page label under the title; list row `type · category`
- [x] Page tests (form, detail, list)
- [x] SPEC §7.1, §7.4–§7.6, §16.1, §16.2, §17; D63
- [x] Owner: `db push`
- [ ] Owner: push to `main` (deploy), iPhone check

## Files
- `supabase/migrations/20261006120000_card_type.sql`, `supabase/tests/database/card_type.test.sql`
- `src/domain/partsOfSpeech.ts`, `src/domain/types.ts`, `src/db/database.ts`
- `src/repositories/remote/cardsRemoteRepo.ts`, `src/services/cardService.ts`
- `src/features/cards/CardForm.tsx`, `src/features/cards/CardListItem.tsx`
- `src/pages/CardFormPage.tsx`, `src/pages/CardDetailPage.tsx`
- tests, `src/test/factories.ts`, `docs/SPEC.md`, `docs/decisions.md`

## Verification
- [x] npm run lint / typecheck / test (286 passed) / build — all green (Docker)
- [x] `npx supabase@2.119.0 db push` (applied 2026-10-06) + `test db --linked` — 3 files, 61 tests, PASS
- [ ] Manual check on iPhone

## Notes / decisions
- D63: key stored (`phrasal_verb`), label shown (`Phrasal verb`); CHECK in DB; unknown → null in the service.
- Old cached app versions omit `type` in upserts, so PostgREST keeps the stored value.
- Owner trimmed the list during the step: no Interjection, Conjunction, Pronoun, Preposition.
