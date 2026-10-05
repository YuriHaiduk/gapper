# 001 — Vocabulary PWA MVP · Plan

Brief: [brief.md](brief.md) · Spec: [docs/SPEC.md](../../../docs/SPEC.md) · Protocol: [workflow.md](../../../docs/conventions/workflow.md)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · 👤 needs the owner's action

## Steps

- [x] **00. Docs & workflow skeleton** — CLAUDE.md, docs/SPEC.md, conventions, decisions, work/ structure, git init. → [step file](step-00-docs-and-workflow.md)
- [x] **01. Project scaffold** — Vite + React + TS (strict) + Tailwind v4, ESLint/Prettier, Vitest + RTL setup, `@/` alias, `base: /gapper/`, Docker Compose (Node 24, port 5173, node_modules volume), `.env.example`, `src/lib/env.ts`, npm scripts (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `format`). Hello-world page under `/gapper/`. SPEC §20, §23. → [step file](step-01-project-scaffold.md)
- [x] **02. 👤 Supabase project & database** — Owner: create Supabase project, create owner user (auto-confirm), disable sign-ups, put URL + publishable key in `.env`. Claude: migrations for tables, triggers, seeding, RLS, storage bucket + policies; apply; verify (AC-44, AC-48, AC-55, AC-57 manual checks). SPEC §8, §17–§19. → [step file](step-02-supabase-database.md)
- [x] **03. Auth & routing shell** — Supabase client, `auth/` (AuthProvider, useAuth), LoginPage, RequireAuth, data router with basename, AppLayout (header, overflow menu, offline banner placeholder), NotFound, splash. AC-1…AC-5. SPEC §6, §9, §21. → [step file](step-03-auth-routing-shell.md)
- [x] **04. Data layer & sync engine** — domain types/constants/pure functions (cardFilter, slugify, search normalization, validation), Dexie schema v1, local repositories, remote repositories, outbox, syncService (push/pull/LWW/write-back/stale refetch/tombstones/single-flight), sync triggers, sync status context; tests T1, T6. SPEC §14–§16. → [step file](step-04-data-layer-sync.md)
- [x] **05. Categories** — categoryService, useCategories, `/categories` page (list with counts, create, rename, delete→Other, Other locked). AC-44…AC-49. SPEC §8. → [step file](step-05-categories.md)
- [x] **06. Card list** — useCardList (visibleCount window), CardListItem, FilterSheet (status + category), SearchBar, Load more, all states, sessionStorage restore + ScrollRestoration; monochrome UI rule applied app-wide. AC-7…AC-19. SPEC §6, §11, §12, §25. → [step file](step-06-card-list.md)
- [x] **07. Create / edit / delete card (no audio)** — cardService, CardFormPage (create/edit), validation, default Other, prefilled category from context, duplicate-title hint, Save & add another, delete with confirm. AC-20…AC-24, AC-35…AC-37. SPEC §7. → [step file](step-07-card-form.md)
- [x] **07a. Notes field (rich text)** — owner change: Translation / Example sentence / Example translation → one rich-text `notes` field (Tiptap: bold, italic, bullet/numbered lists); migration merges + drops old columns, Dexie v2, search, list preview, safe renderer. → [step file](step-07a-notes-field.md)
- [x] **08. Card detail & prev/next** — CardDetailPage, status toggle, useAdjacentCards (keyset neighbours), AdjacentNav, keyboard ←/→, replace navigation. AC-25…AC-34. SPEC §7.5, §13. → [step file](step-08-card-detail.md)
- [ ] **09. Audio** — useAudioRecorder (mime selection, 60 s cap, cleanup), AudioRecorder UI, audio_blobs, audioService, upload/delete via outbox, AudioPlayer with download+cache. 👤 test recording on iPhone (after step 12, or via tunnel). AC-38…AC-43. SPEC §10, §19.
- [ ] **10. Offline hardening & sync UX** — online/offline banner, pending indicators, sync status panel (failed entries Retry/Discard), session-expired banner, logout confirmation + DB wipe, periodic sync. AC-6, AC-50…AC-54. SPEC §9, §15.6, §25.
- [ ] **11. PWA** — vite-plugin-pwa config, icons via assets generator, iOS meta tags, update toast (`prompt`), 404.html copy, optional CSP meta. AC-58, AC-61. SPEC §22.
- [ ] **12. 👤 Deployment** — Owner: create GitHub repo `gapper`, push, set Actions variables, Pages source = GitHub Actions, Supabase Site URL. Claude: `deploy.yml`, optional keep-alive workflow, dist secret grep. AC-56, AC-59, AC-60.
- [ ] **13. E2E & acceptance pass** — Playwright critical flow (T10), walk through all AC in SPEC §30 (👤 owner checks on iPhone), fix gaps, update docs, archive this folder.

## Backlog
_(items discovered during work that are not yet scheduled)_

- Bundle is ~669 kB min / 198 kB gzip after step 06 (was ~544 kB at step 03) in one chunk (mostly supabase-js) → Vite warns >500 kB. Decide in step 11: lazy-load routes / split vendor chunk, or raise `chunkSizeWarningLimit`.
- Offline cold start with an *expired* access token: confirm supabase-js still emits the stored session (SPEC §9 "opens offline with last session"); if it emits `null`, handle in step 10.

- Different user signs in on a device with local data → wipe Dexie first (SPEC §9). `meta.user_id` is written by `SyncProvider` since step 04; the comparison + wipe belongs to step 10.
- Step 11: make sure the lazy `NotesEditor` chunk is precached by the service worker (form must open offline).
- 👤 iPhone check of the filter `<dialog>` bottom sheet (iOS Safari) and of the card detail bottom bar (safe area, long neighbour titles, toggle width on a 375 px screen).
- 👤 iPhone check of the notes editor: toolbar taps keep the keyboard, lists via toolbar and `- `, paste from Notes/Safari.
- Sync status UI: `useSyncStatus()` already exposes `syncing`, `lastResult`, `lastSyncAt`, `pendingCount`, `failedCount`, `initialSyncDone` — header indicator/panel in step 10; list "Loading your cards…" uses `initialSyncDone` in step 06.

## Open questions
_(none yet)_
