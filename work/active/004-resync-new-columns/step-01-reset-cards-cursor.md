# Step 01 — Dexie v4 resets the cards cursor

Status: in progress
Spec: docs/SPEC.md §16.2, §15.4 · D65

## Goal
Every device pulls all cards once after updating, so values of a column added while an older
app version was running (here `type`, D63) reach its local copy.

## Scope
- In: Dexie v4 upgrade, test, rule in `docs/conventions/data-layer.md`, SPEC, D65.
- Out: server changes (Supabase data is correct: 3 cards with a type, checked 2026-10-06).

## User actions
- [ ] Push to `main` (deploy), open the Pages site, accept the update → all three cards show their part of speech.

## Tasks
- [x] `src/db/database.ts`: `version(4)` upgrade deletes `meta.cards_cursor`
- [x] `src/db/database.test.ts`: v3 → v4 keeps cards and other meta, drops only the cursor
- [x] `docs/conventions/data-layer.md` rule; SPEC §16.2; D65

## Verification
- [x] npm run lint / typecheck / test (287 passed) / build / format:check — green (Docker)
- [ ] Owner: Pages shows the types after the update

## Notes / decisions
- Cause: deploy at 10:10 UTC; the cards were edited on localhost at 10:04–10:09 UTC, the old
  Pages app pulled them without `type`; one card came again through the 60 s pull overlap.
- Pending local edits are never overwritten by a pull (outbox check), so the re-pull is safe.
