# Supabase conventions

Schema, policies and SQL live in `docs/SPEC.md` §17–§19.

## Environment

- Cloud Supabase (Free tier) is used for development and production. No local Supabase stack unless a later step explicitly adds it.
- Frontend env vars (public, browser-safe only):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`; legacy `anon` key works the same)
- The secret / service-role key is **never** placed in `.env`, the repo, GitHub Actions for the frontend build, or any `VITE_*` variable.

## Migrations

- All schema changes are SQL files in `supabase/migrations/`, named `YYYYMMDDHHMMSS_<snake_case_description>.sql`.
- Migrations are append-only: never edit a migration that has been applied to the cloud project; write a new one.
- Every migration is idempotent where cheap (`create … if not exists`, `create or replace function`, `drop policy if exists` before `create policy`).
- Apply with the Supabase CLI, run on the host via `npx supabase@2.119.0` (pinned, not an npm dependency): `login` + `link --project-ref <ref>` once (owner), then `db push --dry-run` → `db push` → `migration list`. Bump the pinned version deliberately.
- Before pushing, validate locally: `npx supabase@2.119.0 start -x studio,imgproxy,logflare,vector,supavisor,edge-runtime,realtime,mailpit,postgres-meta` applies all migrations to a throwaway Docker stack; `supabase stop` when done.

## Database tests

- pgTAP tests live in `supabase/tests/database/*.test.sql`, each wrapped in `begin; … rollback;` so they are safe against the cloud project.
- Run: `npx supabase@2.119.0 test db --local` (local stack; needs at least one user in `auth.users`) and `npx supabase@2.119.0 test db --linked` (cloud).
- Every migration that changes schema, triggers, grants or policies extends these tests.
- On the linked project the CLI connects as `cli_login_postgres`; tests therefore begin with `set local role postgres` and switch back with `set local role postgres` (not `reset role`).
- After applying migrations run `npx supabase@2.119.0 db advisors --linked` and fix or record every warning.
- Any table/column change must be mirrored in: `src/domain/types.ts`, Dexie schema (new version), remote repository column lists, `docs/SPEC.md` §16–§17.

## Rules

- Every table in `public` has RLS **enabled** and policies scoped to `auth.uid()`. Never disable RLS, never add `using (true)` policies, never grant to `anon`.
- Policies use `(select auth.uid())` (initPlan-cached form) and target `to authenticated`.
- Business invariants that must hold regardless of client (Other is undeletable, category delete reassigns cards, `server_updated_at`) are enforced by triggers/functions in SQL, not only in the app.
- `security definer` functions must `set search_path = ''` and fully qualify names, and must check `auth.uid()` themselves — or have EXECUTE revoked from `public, anon, authenticated`.
- The project has *automatic RLS* on (event trigger `rls_auto_enable`); migrations still enable RLS explicitly.
- Public sign-ups stay **disabled** in Auth settings. The owner account is created manually in the dashboard.
