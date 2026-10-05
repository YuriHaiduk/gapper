# Step 10 — Offline hardening & sync UX

Status: done
Spec: docs/SPEC.md §6 (App shell), §9, §15.1, §15.2, §15.6, §25; AC-6, AC-50…AC-54

## Goal
Make sync state visible and recoverable (status line, pending indicator, failed-entries panel with Retry/Discard), run periodic sync, handle an expired session without losing local data, and make Sign out confirm + wipe local data (also wipe when a different user signs in).

## Scope
- In: sync status label (domain), menu status + ⋯ indicator, SyncPanel, offline banner with pending count, session-expired state + banner, sign-out confirmation + local wipe, user-switch wipe, periodic sync, docs.
- Out: PWA/service worker (step 11), iPhone checks (👤 after step 12).

## User actions
- [x] None now. 👤 Optional manual check after the step (needs credentials) — see Verification.

## Tasks
- [x] `domain/syncStatus.ts` + tests
- [x] Auth `expired` state (`AuthProvider`, `RequireAuth`, `PublicOnly`) + tests
- [x] Outbox `listFailed` / `rearm`, `wipeLocalData`
- [x] `SyncService.whenIdle` / `discard` + tests
- [x] `SyncProvider`: user-switch wipe, periodic sync, retry/discard/reset, `sessionExpired` + tests
- [x] UI: OverflowMenu status + indicator, SyncPanel, OfflineBanner count, SessionBanner, sign-out confirm + page tests
- [x] Docs: SPEC, decisions D49–D53, plan.md

## Files
- `src/domain/syncStatus.ts`, `src/domain/constants.ts`
- `src/auth/{authContext,authService,AuthProvider}.ts(x)`, `src/app/{RequireAuth,PublicOnly}.tsx`
- `src/repositories/local/outboxRepo.ts`, `src/db/database.ts`
- `src/sync/{syncService,SyncProvider,syncContext}.ts(x)`
- `src/hooks/{useFailedEntries,useSignOut}.ts`
- `src/app/{OverflowMenu,SyncPanel,OfflineBanner,SessionBanner,AppLayout}.tsx`
- Tests: `src/domain/syncStatus.test.ts`, `src/auth/authState.test.ts`, `src/sync/{syncService,SyncProvider}.test.ts(x)`, `src/app/syncUx.test.tsx`; `src/test/auth.tsx` (`expired` start, `expireSession`, `TEST_USER.id = USER_ID`)

## Verification
- [x] npm run lint / typecheck / test / build / format:check — all pass (262 tests, 35 files; full suite 3× without flakes); build: app chunk 706 kB / 208 kB gzip (+2 kB gzip)
- [ ] Manual check (owner, not done by Claude — needs credentials): DevTools offline → banner with N; edits → dot; online → syncs by itself, dots clear (AC-51); Sign out with pending → confirm → `/login`, IndexedDB `gapper` empty (AC-6)

## Notes / decisions
- D49: wipe = clear all tables (after `SyncService.whenIdle()`), DB stays open; `clearDb` renamed `wipeLocalData`.
- D50: auth `expired` state from a `SIGNED_OUT` not started by the owner (pure `nextAuthState`); supabase-js docs (Context7): a non-retryable refresh failure removes the session and emits `SIGNED_OUT`, a network failure keeps it → offline cold start keeps the stored session (backlog item closed).
- D51: user-switch wipe in `SyncProvider` before the first sync.
- D52: sync indicator on the ⋯ button, status line in the menu; `Sync now` disabled offline; "Synced · N min ago" computed when the menu opens (pure render).
- D53: Discard restores the server row; Retry re-arms + syncs; panel has Retry all when > 1.
- Periodic sync: `setInterval(PERIODIC_SYNC_MS)` while signed in, fires only when visible (and online via `autoSync`); `SyncProvider` takes `periodMs` for tests.
