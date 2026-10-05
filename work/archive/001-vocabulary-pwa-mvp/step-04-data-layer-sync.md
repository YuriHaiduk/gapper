# Step 04 — Data layer & sync engine

Status: done
Spec: docs/SPEC.md §8.4, §11, §14–§16, §17, §19; tests T1, T6

## Goal
Offline-first foundation: domain types + pure functions, Dexie schema v1, local/remote repositories, outbox, and a sync engine (push/pull/LWW) with triggers and a sync-status context.

## Scope
- In: `domain/` (types, constants, search, cardFilter, slugify, validation, timestamps), `db/database.ts` (v1), `repositories/local/*` (cards, categories, outbox, meta, audio minimal), `repositories/remote/*` (generic table wrapper, cards, categories, audio storage, error mapping), `sync/` (pushOrder, syncService, SyncProvider, useSyncStatus), "Sync now" menu item.
- Out: list/adjacency queries (06/08), services (05/07/09), audio recorder/player (09), sync status indicator + failed-entries panel, periodic sync, session-expired banner, different-user wipe, logout wipe (10).

## User actions
- [x] 👤 Manual check in the dev server (see Verification).

## Tasks
- [x] Install `dexie`, `dexie-react-hooks`, `fake-indexeddb` (dev) — all listed in SPEC §20
- [x] Domain types/constants/pure functions + unit tests (T1 cardFilter, search, slugify, validation)
- [x] Dexie `GapperDb` v1 (`cards`, `categories`, `audio_blobs`, `outbox`, `meta`)
- [x] Local repositories (row + outbox in one transaction, coalescing, re-arm failed entry)
- [x] Remote repositories (explicit columns, `user_id` omitted, timestamp normalization, typed `RemoteError`: network/auth/rejected)
- [x] syncService: phase push order, write-back, stale skip → refetch, edit-during-push guard, tombstones, audio upload/delete (incl. folder prefix), rejection counting (5 → parked), category name collision → `Name (2)` + retry once, pull with 60 s overlap + paging + cursors, remote-wins-unless-pending, category tombstone → cards to Other, single-flight with one follow-up run
- [x] SyncProvider (start/sign-in, `online`, visible, 2 s after outbox grows) + `useSyncStatus` + "Sync now"
- [x] Tests: T6 with an in-memory `FakeServer` mimicking the DB triggers; outbox atomicity; provider triggers; menu item
- [x] Docs: SPEC §8.4, §15.2; data-layer.md; decisions D27–D31; plan backlog

## Files
- `src/domain/{types,constants,search,cardFilter,slugify,validation,timestamps}.ts` (+ tests)
- `src/db/database.ts`
- `src/repositories/local/{outboxRepo,cardsLocalRepo,categoriesLocalRepo,audioLocalRepo,metaRepo}.ts`
- `src/repositories/remote/{types,errors,tableRemote,cardsRemoteRepo,categoriesRemoteRepo,audioRemoteRepo,index}.ts`
- `src/sync/{pushOrder,syncService,syncContext,SyncProvider,useSyncStatus,index}.ts(x)` (+ tests)
- `src/test/{setup,auth,factories,fakeRemote}.ts(x)`, `src/app/{App,OverflowMenu}.tsx`, `eslint.config.js` (`ignoreRestSiblings`)

## Verification
- [x] lint / typecheck / test / build / format:check — all pass (88 tests, 14 files); build OK, chunk-size warning (650 kB, Backlog)
- [x] Supabase imported only by `auth/`, `repositories/remote/`, `lib/`; no Dexie/repositories in `pages/`/`components/`; no `signUp`
- [x] 👤 (owner, 2026-10-05, Chrome — OK) Dev server, signed in → DevTools → Application → IndexedDB → `gapper`: `categories` has 10 rows, `meta` has `categories_cursor`, `initial_sync_done = true`, `user_id`; ⋯ → "Sync now" runs without console errors; DevTools offline → "Sync now" → no errors, nothing lost

## Notes / decisions
- D27 phase push order (SPEC §15.2 said pure FIFO — breaks with coalescing).
- D28 edit-during-push guard; D29 remote payload without `user_id`, audio folder-prefix delete; D30 slug keeps non-Latin letters (SPEC example `Їжа → їжа` contradicted its algorithm); D31 SyncProvider at App level with injected service.
- Owner check found that manual "Sync now" while offline still hit the network (Chrome logs `ERR_INTERNET_DISCONNECTED`, supabase-js retries GETs ×3). Fix: `sync()` returns `offline` without any request when `navigator.onLine === false` (+ test).
- `vi.useFakeTimers` stalls fake-indexeddb/live queries → the debounce test uses real timers (~2 s).
