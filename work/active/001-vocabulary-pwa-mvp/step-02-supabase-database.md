# Step 02 — Supabase project & database

Status: done
Spec: docs/SPEC.md §8, §17–§19, §26; AC-44, AC-48, AC-55, AC-57

## Goal
Cloud Supabase project with the schema, triggers, seeding, RLS and private `audio` bucket from SPEC, applied via the Supabase CLI and verified. Plus: Context7 MCP configured at project level.

## Scope
- In: `supabase/` (config, 5 migrations, pgTAP tests), owner setup, HTTP checks with the publishable key, `.mcp.json`, docs.
- Out: Supabase client / auth in the app (step 03), domain types and Dexie (step 04).

## User actions
- [x] 1. https://supabase.com/dashboard → **New project**: name `gapper`, Free plan, region close to you (e.g. *Central EU (Frankfurt)*). Save the **database password** in your password manager.
- [x] 2. **Authentication → Sign In / Providers**: *Allow new users to sign up* = **off**; Email provider stays enabled.
- [x] 3. **Authentication → Users → Add user → Create new user**: your email + strong password, **Auto Confirm User** = on.
- [x] 4. `cp .env.example .env` and fill `VITE_SUPABASE_URL` (Project Settings → Data API / Connect) and `VITE_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys → *Publishable key* `sb_publishable_…`). **Never** the secret / service-role key.
- [x] 5. In the Claude Code prompt run `! npx supabase@2.119.0 login` (browser OAuth).
- [x] 6. In the Claude Code prompt run `! npx supabase@2.119.0 link --project-ref <ref>` (ref = the subdomain of the project URL) and enter the DB password when asked.

## Tasks
- [x] `.mcp.json` (Context7, key from `CONTEXT7_API_KEY` env, optional) + `.claude/settings.json` (`enabledMcpjsonServers`)
- [x] `supabase init` → `supabase/config.toml` (local-only config; sign-ups off)
- [x] Migrations: tables, triggers, seeding, RLS + grants, storage bucket + policies, revoke on `rls_auto_enable()`
- [x] pgTAP tests `supabase/tests/database/schema_rls.test.sql`
- [x] Validate migrations + tests against a local Supabase stack (Docker)
- [x] `db push --dry-run`, `db push`, `migration list`
- [x] `test db --linked` against the cloud project
- [x] AC-55 HTTP checks with the publishable key
- [x] `db advisors --linked`; fix: revoke EXECUTE on dashboard-created `rls_auto_enable()` (migration 6)
- [x] Docs: SPEC §18/§19, decisions D23–D24, CLAUDE.md, conventions/supabase.md

## Files
- `.mcp.json`, `.claude/settings.json`, `.gitignore`
- `supabase/config.toml`, `supabase/.gitignore`, `supabase/migrations/*.sql` (6), `supabase/tests/database/schema_rls.test.sql`

## Verification
- [x] Local stack: migrations apply, pgTAP green (44/44); AC-55 HTTP locally: REST 401 `42501`, storage not found, signup `signup_disabled`
- [x] Cloud: 6 migrations applied (`migration list` local = remote), pgTAP 45/45 (incl. AC-44 for the real owner: 10 categories, one system `Other`); no leftovers (0 test users, pgTAP extension removed)
- [x] AC-55 over HTTP (no session): `categories`/`vocabulary_cards` → 401 `42501`; storage object → not found, `list/audio` → `[]`; `/auth/v1/signup` → 422 `signup_disabled`; `rpc/seed_default_categories` → 401 `42501`
- [x] npm run lint / typecheck / test (2 files, 5 tests) / build / format:check — all green (Docker)
- [x] No secrets in the repo (`git grep` for `sb_secret`, `service_role`, publishable key, Context7 key, JWTs → only a comment in generated `config.toml`); `.env`, `dist/`, `supabase/.temp` not tracked

## Notes / decisions
- Migrations applied with the Supabase CLI (owner's choice), pinned `supabase@2.119.0` via `npx` on the host — no npm dependency added.
- AC-57 is covered by pgTAP impersonation of two throwaway `auth.users` rows inside a rolled-back transaction, instead of creating and deleting a real test user in the dashboard.
- Explicit table grants to `authenticated` (select/insert/update, no delete) instead of relying on project default privileges (D24).
- `audio_update` storage policy also has a `with check` so an object cannot be moved into another user's folder.
- Local run found two bugs in the tests themselves (stale `updated_at` was correctly skipped by LWW; data-modifying CTE must be top-level) — migrations unchanged.
- Context7 from `.mcp.json` loads only in a new session — verify with `/mcp` next session.
- Project: `uxtstofljksemkmoqlrx` (region Frankfurt), created with *Enable automatic RLS* on — it adds the event-trigger function `public.rls_auto_enable()` (SECURITY DEFINER, executable by `anon`); migration 6 revokes EXECUTE (verified the event trigger still enables RLS on new tables).
- On the linked project `test db` connects as `cli_login_postgres`, which cannot use the `extensions` schema → tests start with `set local role postgres` (and switch back to it instead of `reset role`).
- Remaining advisor warning: *Leaked password protection* (HaveIBeenPwned) — a paid-plan Auth feature; not available on Free. Accepted: single owner account with a strong password, sign-ups disabled.
