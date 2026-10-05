# Step 12 — Deployment

Status: in progress
Spec: docs/SPEC.md §24, §26; AC-56, AC-59, AC-60
Plan: approved 2026-10-05 (owner: daily Supabase keep-alive; defaults taken — public repo, Claude sets up GitHub via `gh`)

## Goal
Publish the app to `https://yurihaiduk.github.io/gapper/` from `main` via GitHub Actions, and keep the Supabase Free project from pausing with a daily scheduled request.

## Scope
- In: `deploy.yml` (lint, format:check, typecheck, test, build, secret check, Pages deploy), `supabase-keep-alive.yml`, GitHub repo + variables + Pages, docs.
- Out: Playwright E2E and the iPhone acceptance pass (step 13).

## User actions
- [ ] 👤 Supabase Dashboard → Authentication → URL Configuration → **Site URL** = `https://yurihaiduk.github.io/gapper/`.
- [ ] 👤 Open the live site on the Mac: sign in, list, a card; then open a deep link cold in a new private window, e.g. `https://yurihaiduk.github.io/gapper/cards/<id>?status=learning` (AC-60).

## Tasks
- [ ] `.github/workflows/deploy.yml`
- [ ] `.github/workflows/supabase-keep-alive.yml`
- [ ] Docs: SPEC §24, decisions D58/D59, CLAUDE.md deployment
- [ ] Local lint / format:check / typecheck / test / build + secret regex on `dist/`
- [ ] Commit `ci: …`
- [ ] `gh repo create` (public), `gh variable set` ×2, Pages source = Actions, push, watch the run
- [ ] Run keep-alive once manually
- [ ] Verify live site (200, deep link via 404.html, CSP origin)

## Files
- `.github/workflows/deploy.yml`, `.github/workflows/supabase-keep-alive.yml` — new
- `docs/SPEC.md` §24, `docs/decisions.md`, `CLAUDE.md`, `plan.md` — docs

## Verification
- [ ] lint / format:check / typecheck / test / build
- [ ] AC-56 secret check (CI step + local)
- [ ] AC-59 workflow green, site published
- [ ] AC-60 deep link cold (owner)

## Notes / decisions
- A plain `sb_secret_` grep matches supabase-js itself (it checks the key prefix), so the check looks for a real key (`sb_secret_` + ≥16 chars) or any JWT.
