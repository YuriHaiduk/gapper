# Step 12 — Deployment

Status: done
Spec: docs/SPEC.md §24, §26; AC-56, AC-59, AC-60
Plan: approved 2026-10-05 (owner: daily Supabase keep-alive; public repo; owner creates the repo and GitHub settings himself)

## Goal
Publish the app to `https://yurihaiduk.github.io/gapper/` from `main` via GitHub Actions, and keep the Supabase Free project from pausing with a daily scheduled request.

## Scope
- In: `deploy.yml` (lint, format:check, typecheck, test, build, secret check, Pages deploy), `supabase-keep-alive.yml`, GitHub repo + variables + Pages, docs.
- Out: Playwright E2E and the iPhone acceptance pass (step 13).

## User actions
- [x] 👤 github.com/new → name `gapper`, **Public**, no README / .gitignore / license (empty repo).
- [x] 👤 Repo → Settings → Secrets and variables → Actions → **Variables** → New repository variable: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (values from `.env`).
- [x] 👤 Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- [x] 👤 Push: `git remote add origin git@github.com:YuriHaiduk/gapper.git && git push -u origin main` (or ask Claude to push).
- [x] 👤 Supabase Dashboard → Authentication → URL Configuration → **Site URL** = `https://yurihaiduk.github.io/gapper/`.
- [x] 👤 Open the live site on the Mac: sign in, list, a card; then open a deep link cold in a new private window, e.g. `https://yurihaiduk.github.io/gapper/cards/<id>?status=learning` (AC-60).

## Tasks
- [x] `.github/workflows/deploy.yml`
- [x] `.github/workflows/supabase-keep-alive.yml`
- [x] Docs: SPEC §24, decisions D58/D59, CLAUDE.md deployment
- [x] Local lint / format:check / typecheck / test / build + secret regex on `dist/`
- [x] Commit `ci: …` (863779a)
- [x] Owner: repo (public), variables, Pages = Actions, push; first deploy run 37364270746 green
- [x] Run keep-alive once manually (dispatched; GitHub kept it queued for minutes — runner queue, not our code; the same request verified from the Mac: 401/42501)
- [x] Verify live site (200, deep link via 404.html, CSP origin)

## Files
- `.github/workflows/deploy.yml`, `.github/workflows/supabase-keep-alive.yml` — new
- `docs/SPEC.md` §24, `docs/decisions.md`, `CLAUDE.md`, `plan.md` — docs

## Verification
- [x] lint / format:check / typecheck / test (270/270) / build; actionlint clean
- [x] AC-56 secret check — local and CI clean
- [x] AC-59 workflow green (lint, format, typecheck, test, build, secret check, deploy), site published at https://yurihaiduk.github.io/gapper/
- [x] AC-60 deep link cold in a private window → login → the same card (owner, Mac)
- [x] Live HTML: `/`, `sw.js`, manifest → 200; unknown paths → GitHub 404 status with the SPA (`404.html`); CSP `connect-src` has the project origin

## Notes / decisions
- A plain `sb_secret_` grep matches supabase-js itself (it checks the key prefix), so the check looks for a real key (`sb_secret_` + ≥16 chars) or any JWT.
- `anon` has no table grants (§18), so the keep-alive gets `401` / `42501` from Postgres; verified locally (also confirms AC-55). Counted as success rather than granting `anon` anything (D59).
- Git history checked before going public: only `.env.example`, no keys.
- GitHub annotation: `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19 — no impact expected.
