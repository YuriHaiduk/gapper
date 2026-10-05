# Step 13 — Acceptance pass

Status: blocked (waiting for owner — update toast after deploy)
Spec: docs/SPEC.md §27, §30 (all AC)
Plan: approved 2026-10-05; owner then dropped Playwright E2E — the critical flow (T10) was checked by hand

## Goal
Confirm every acceptance criterion, run the iPhone pass from the Backlog, fix what it finds, archive the MVP folder.

## Scope
- In: iPhone pass, fixes, AC evidence table, docs (no-E2E decision), archive.
- Out: Playwright E2E (owner: manual testing is enough), new features (SPEC §29).

## User actions
- [ ] 👤 iPhone pass — checklist below (live site https://yurihaiduk.github.io/gapper/).

### iPhone checklist
1. Install (AC-58): Safari → Share → Add to Home Screen → icon "Gapper"; opens standalone at `/cards`; status bar OK in light and dark mode.
2. List & filter: filter bottom sheet opens/closes, status + category, URL-driven list; search.
3. Card form / notes: toolbar taps keep the keyboard; bold/italic/lists; `- ` starts a list; paste from Notes/Safari.
4. Audio (AC-38, 41, 42, 43): record → stop → preview → Re-record; save; play on detail; 60 s auto-stop; Stop reachable; in the installed app (mic permission asked again — expected); airplane mode → plays a recording played before.
5. Detail: bottom bar (safe area, long neighbour titles, status toggle on a narrow screen), prev/next.
6. Offline (AC-50, 51): airplane mode → relaunch installed app → list, filters, search, detail work, offline banner; create/edit → pending dot; back online → syncs by itself.
7. Sync UX: ⋯ indicator, status line, sync panel bottom sheet.
8. Update toast (AC-61): after the next deploy the installed app shows "New version available · Reload"; Reload → new version.

### iPhone results (2026-10-05)
- 1 ✅ installed from Safari, standalone, list after sign-in. A second sign-in in the installed app is expected (iOS keeps standalone storage separate from Safari).
- 2 ✅ filter bottom sheet, status + category, search.
- 3 ✅ notes editor: bold/italic keep the keyboard, lists, paste, formatting on detail.
- 4 ✅ recording and playback in the installed app.
- 5 ✅ detail bottom bar (safe area, long titles), status toggle, prev/next, Back to the list.
- 6 ✅ airplane mode: relaunch, banner, list/filters/search/detail, cached audio plays, create/edit pending, auto-sync on reconnect.
- 7 ✅ ⋯ indicator, status line, sync panel.
- 8 ⏳ update toast — after the deploy of this step's commit.

## AC evidence
Tests are Vitest files under `src/`; "step N" = manual check recorded in that step file; "iPhone" = pass above.

| AC | Evidence |
|---|---|
| 1, 4 | `app/router.test.tsx` |
| 2, 3, 5 | `pages/LoginPage.test.tsx`; AC-5 also `grep signUp` = 0, sign-ups disabled (step 2) |
| 6 | `app/syncUx.test.tsx`; step 10 manual |
| 7–11, 13–19 | `pages/CardListPage.test.tsx`; iPhone 2 |
| 12 | `pages/CardDetailPage.test.tsx`; iPhone 5 |
| 20–24 | `pages/CardFormPage.test.tsx`, `services/cardService.test.ts` |
| 25, 26, 28–33 | `pages/CardDetailPage.test.tsx`; iPhone 5 |
| 27 | `cardService.test.ts` (setStatus keeps `created_at`) + list ordered by `created_at` (T2) |
| 34 | `repositories/local/cardsLocalRepo.test.ts` |
| 35–37 | `cardService.test.ts`, `CardFormPage.test.tsx`; 37 server side via `syncService.test.ts` |
| 38–43 | `CardFormPage.audio.test.tsx`, `useAudioRecorder.test.ts`, `syncService.test.ts`, `CardDetailPage.audio.test.tsx`; iPhone 4, 6 |
| 44, 48, 55, 57 | step 2 (pgTAP 45/45, HTTP checks); 48 UI in `CategoriesPage.test.tsx` |
| 45–49 | `pages/CategoriesPage.test.tsx` |
| 50, 51 | step 10 manual (Mac); iPhone 6 |
| 52–54 | `sync/syncService.test.ts` |
| 56, 59, 60 | step 12 (CI secret check, green workflow, cold deep link) |
| 58 | iPhone 1 |
| 61 | `app/UpdatePrompt.test.tsx`; iPhone 8 ⏳ |

## Tasks
- [ ] 👤 iPhone pass, fix findings
- [x] AC evidence table
- [x] Docs: SPEC §27, testing.md, CLAUDE.md, decisions.md D60 (no E2E)
- [x] lint / format:check / typecheck / test (270/270) / build — green
- [x] Review of `src/sync` (4 findings, all confirmed) + manual security review (no findings) → fixes D61
- [x] After the fixes: lint / format:check / typecheck / test (276/276) / build — green; the 6 new regression tests fail on the old code
- [ ] Archive `work/active/001-vocabulary-pwa-mvp`, commit

## Notes / decisions
- Playwright E2E dropped by the owner (manual testing covers T10).
- Security review (manual; `/security-review` only sees the diff vs origin): RLS + grants, Other protection, cross-user category refs, storage folder policies, trigger `search_path`, no `innerHTML`, own notes renderer, `safeRedirect`, CSP, no keys in git — no findings.
- `/code-review src/sync` findings, fixed (D61): audio delete vs. a card the server kept; check/write-back race in push and pull (transaction); 2 s trigger missed coalesced edits (`onEnqueue`); sync could start between `whenIdle` and the user-switch wipe (`readyFor` gate). A pull-race regression test was tried but could not reproduce the race deterministically without deadlocking, so only the push race has a test.
