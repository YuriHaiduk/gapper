# Step 03 — Auth & routing shell

Status: done
Spec: docs/SPEC.md §6, §9, §21, §25 (App start, Login), AC-1…AC-5

## Goal
Real sign-in via Supabase Auth, a guarded data router under the `/gapper/` base path, and the app shell (header, overflow menu, offline banner, splash, NotFound) that later steps plug pages into.

## Scope
- In: Supabase client singleton, `auth/` (authService, AuthProvider, useAuth), LoginPage, RequireAuth + PublicOnly guard, `createBrowserRouter` with `basename`, AppLayout (sticky safe-area header, title from route `handle`, overflow menu: Categories + Sign out), OfflineBanner (`useOnlineStatus`), NotFoundPage, SplashScreen, stub pages for `/cards` and `/categories`, UI primitives (Button, TextField, Spinner).
- Out: "Sync now" menu item (04/10), sign-out confirmation + Dexie wipe (10), session-expired banner and different-user wipe (10), card routes `/cards/new`, `/cards/:id`, `/cards/:id/edit` (07/08), update toast (11).

## User actions
- [x] Manual check with real credentials in the dev server (owner signs in; Claude never handles the password).

## Tasks
- [x] Install `react-router`, `@supabase/supabase-js`
- [x] `lib/supabase.ts`, `auth/authService.ts`, `auth/AuthProvider.tsx`, `auth/useAuth.ts`
- [x] `domain/redirect.ts`, `domain/loginValidation.ts`
- [x] `app/router.tsx`, `RequireAuth`, `PublicOnly`, `AppLayout`, `OverflowMenu`, `OfflineBanner`, `SplashScreen`
- [x] `hooks/useOnlineStatus.ts`
- [x] Pages: Login, NotFound, CardList (stub), Categories (stub)
- [x] UI primitives: Button, TextField, Spinner
- [x] Tests: redirect, login validation, authService error mapping, LoginPage, router guards
- [x] Docs: SPEC §20 React Router version, decisions

## Verification
- [x] npm run lint / typecheck / test / build — all pass (37 tests, 7 files); build OK with >500 kB chunk warning (Backlog)
- [x] AC-5: `grep -rn signUp src` → nothing
- [x] Manual (owner, 2026-10-05, Chrome): AC-1…AC-4, reload keeps session, offline banner, categories via menu, sign out — all OK

## Notes / decisions
- `npm install react-router` resolved to v8.4 (current stable); SPEC said v7. Library-mode data router API is unchanged (`createBrowserRouter`, `RouterProvider` from `react-router/dom`) → SPEC §20 updated, D26.
- Post-login redirect is performed by `PublicOnly` (honours `?redirect=` via `safeRedirect`), so the form never races the `SIGNED_IN` event (D26).
- Sign out uses `scope: 'local'` so it works offline; confirmation + Dexie wipe come in step 10.
- `/cards` and `/categories` are placeholder pages; card sub-routes fall through to NotFound until steps 07/08.
