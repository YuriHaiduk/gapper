# Step 12 — Deployment

Status: blocked (waiting for owner)
Spec: docs/SPEC.md §24, §26; AC-56, AC-59, AC-60
Plan: approved 2026-10-05 (owner: daily Supabase keep-alive; public repo; owner creates the repo and GitHub settings himself)

## Goal
Publish the app to `https://yurihaiduk.github.io/gapper/` from `main` via GitHub Actions, and keep the Supabase Free project from pausing with a daily scheduled request.

## Scope
- In: `deploy.yml` (lint, format:check, typecheck, test, build, secret check, Pages deploy), `supabase-keep-alive.yml`, GitHub repo + variables + Pages, docs.
- Out: Playwright E2E and the iPhone acceptance pass (step 13).

## User actions
- [ ] 👤 github.com/new → name `gapper`, **Public**, no README / .gitignore / license (empty repo).
- [ ] 👤 Repo → Settings → Secrets and variables → Actions → **Variables** → New repository variable: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (values from `.env`).
- [ ] 👤 Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- [ ] 👤 Push: `git remote add origin git@github.com:YuriHaiduk/gapper.git && git push -u origin main` (or ask Claude to push).
- [ ] 👤 Supabase Dashboard → Authentication → URL Configuration → **Site URL** = `https://yurihaiduk.github.io/gapper/`.
- [ ] 👤 Open the live site on the Mac: sign in, list, a card; then open a deep link cold in a new private window, e.g. `https://yurihaiduk.github.io/gapper/cards/<id>?status=learning` (AC-60).

## Tasks
- [x] `.github/workflows/deploy.yml`
- [x] `.github/workflows/supabase-keep-alive.yml`
- [x] Docs: SPEC §24, decisions D58/D59, CLAUDE.md deployment
- [x] Local lint / format:check / typecheck / test / build + secret regex on `dist/`
- [x] Commit `ci: …` (863779a)
- [ ] Owner: repo, variables, Pages, push → Claude watches the run
- [ ] Run keep-alive once manually
- [ ] Verify live site (200, deep link via 404.html, CSP origin)

## Files
- `.github/workflows/deploy.yml`, `.github/workflows/supabase-keep-alive.yml` — new
- `docs/SPEC.md` §24, `docs/decisions.md`, `CLAUDE.md`, `plan.md` — docs

## Verification
- [x] lint / format:check / typecheck / test (270/270) / build; actionlint clean
- [~] AC-56 secret check — local: clean; CI: pending
- [ ] AC-59 workflow green, site published
- [ ] AC-60 deep link cold (owner)

## Notes / decisions
- A plain `sb_secret_` grep matches supabase-js itself (it checks the key prefix), so the check looks for a real key (`sb_secret_` + ≥16 chars) or any JWT.
- `anon` has no table grants (§18), so the keep-alive gets `401` / `42501` from Postgres; verified locally (also confirms AC-55). Counted as success rather than granting `anon` anything (D59).
- Git history checked before going public: only `.env.example`, no keys.
