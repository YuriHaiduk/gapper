# Architecture

Full rationale: `docs/SPEC.md` §14–§15 and §20. This file is the short rulebook.

## Layers and dependency direction

```
pages/ + components/        UI only: render, handle events, call hooks
        ↓
hooks/                      React glue: subscribe to data, expose actions/state
        ↓
services/                   application logic: validation, defaults, use-cases
        ↓
repositories/local/         Dexie (IndexedDB) — the ONLY data source the app reads from
        ↑↓
sync/                       outbox push + delta pull, the ONLY code that talks to Supabase DB/Storage
        ↓
repositories/remote/        thin Supabase wrappers used by sync (and auth/ for Supabase Auth)
```

Rules:
- Imports only point **downward**. `services` never import React. `repositories` never import `services`.
- UI never imports `@supabase/supabase-js`, `lib/supabase.ts`, `db/` or `repositories/` directly.
- Reads: UI → hook → service/local repository (Dexie, live queries).
- Writes: UI → hook → service → local repository **+ outbox entry in the same Dexie transaction** → sync service pushes later.
- Supabase Auth is wrapped in `auth/` (session, login, logout). Hooks use it via `useAuth()`.
- No global state library. Context only for cross-cutting singletons: auth session, sync/online status.

## Directory layout

```
src/
  app/            App.tsx, router.tsx, providers, layouts, route guards
  pages/          one folder per route: LoginPage, CardListPage, CardDetailPage, CardFormPage, CategoriesPage
  components/     reusable presentational components (ui/ for primitives: Button, Input, Select, Spinner…)
  features/       optional grouping for feature-specific components (cards/, categories/, audio/)
  hooks/          useCards, useCard, useCategories, useAdjacentCards, useAudioRecorder, useOnlineStatus…
  services/       cardService, categoryService, audioService
  repositories/
    local/        cardsLocalRepo, categoriesLocalRepo, audioLocalRepo, outboxRepo
    remote/       cardsRemoteRepo, categoriesRemoteRepo, audioRemoteRepo
  sync/           syncService, outbox processing, conflict resolution, triggers
  db/             Dexie database class + schema versions
  auth/           authService, AuthProvider, useAuth
  domain/         types, constants (statuses, page size), pure functions (filters, slugify, cursor logic)
  lib/            supabase.ts (client singleton), env.ts (validated env), small utils
  styles/         index.css (Tailwind entry)
  test/           test setup, fakes (fake-indexeddb, MediaRecorder mock), factories
supabase/
  migrations/     timestamped SQL migrations
public/           icons, apple-touch-icon, robots.txt
```

Keep it flat. Create a folder only when it has a second file.

## Size guidelines

- Component file > ~200 lines or > 1 responsibility → split.
- Hooks hold no JSX; services hold no React; domain holds no I/O.
- Pure logic (filters, cursors, slugify, adjacency, LWW merge) lives in `domain/` or `sync/` as pure functions and is unit-tested.
