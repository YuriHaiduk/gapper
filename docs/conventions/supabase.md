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
- Apply with the Supabase CLI (`npx supabase link --project-ref <ref>` once, then `npx supabase db push`) or, if the owner prefers, by pasting into the dashboard SQL editor. The step file records which method was used.
- Any table/column change must be mirrored in: `src/domain/types.ts`, Dexie schema (new version), remote repository column lists, `docs/SPEC.md` §16–§17.

## Rules

- Every table in `public` has RLS **enabled** and policies scoped to `auth.uid()`. Never disable RLS, never add `using (true)` policies, never grant to `anon`.
- Policies use `(select auth.uid())` (initPlan-cached form) and target `to authenticated`.
- Business invariants that must hold regardless of client (Other is undeletable, category delete reassigns cards, `server_updated_at`) are enforced by triggers/functions in SQL, not only in the app.
- `security definer` functions must `set search_path = ''` and fully qualify names, and must check `auth.uid()` themselves.
- Public sign-ups stay **disabled** in Auth settings. The owner account is created manually in the dashboard.
