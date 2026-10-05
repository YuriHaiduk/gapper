# Step 00 — Docs & workflow skeleton

Status: done
Spec: docs/SPEC.md (all)

## Goal
Produce implementation-ready documentation and the session workflow before any application code.

## Scope
- In: `CLAUDE.md`, `docs/SPEC.md`, `docs/decisions.md`, `docs/conventions/*`, `work/` structure, `.gitignore`, git init + initial commit.
- Out: React scaffold, Docker files, migrations, Supabase integration, any app code.

## User actions
- [x] Answered planning questions: docs language (English), repo name (`gapper`), git init + commit (yes).

## Tasks
- [x] Conventions: workflow, architecture, data-layer, supabase, security, code-style, ui-ux, testing, git
- [x] `docs/SPEC.md` — 30 sections, schema/RLS/storage SQL, 61 acceptance criteria
- [x] `docs/decisions.md` — D1…D20
- [x] `CLAUDE.md`
- [x] `work/active/001-vocabulary-pwa-mvp/{brief.md, plan.md}`, `work/archive/`
- [x] `.gitignore`, `git init -b main`, initial commit

## Verification
- [x] No app code / Docker / migrations created
- [x] Library facts checked with Context7: Supabase publishable key naming, Storage policies with `storage.foldername`, vite-plugin-pwa scope/start_url defaults from `base`

## Notes / decisions
- See `docs/decisions.md` D1–D20.
