# CLAUDE.md — Gapper

Private, single-owner vocabulary-learning **PWA** (iPhone-first, works on desktop). Cards = word/phrase, rich-text notes (examples, translations), personal audio recording, category, status (`learning` / `learned`). Offline-first, hosted as static files on GitHub Pages (`/gapper/`), backend is Supabase (Postgres + Auth + Storage) called directly from the browser.

## Start every session here

1. Read this file.
2. Read the active plan: `work/active/*/plan.md` → take the first unchecked step. No active plan → the MVP is done (`work/archive/001-vocabulary-pwa-mvp/`); new work starts as `work/active/002-<slug>/` with `brief.md` + `plan.md` (see workflow.md).
3. Read the relevant sections of **`docs/SPEC.md` — the source of truth for product behavior and technical design.**
4. Follow the session protocol in `docs/conventions/workflow.md` (create `step-NN-*.md` next to `plan.md`, ask the owner when blocked on their action, verify, tick the step, commit).

Communicate with the owner in **Ukrainian**; write code, comments and docs in **English**.

## Documentation map

| File | Purpose |
|---|---|
| `docs/SPEC.md` | Product + technical spec, schema, RLS, acceptance criteria |
| `docs/decisions.md` | Decision log (append when making architectural/product decisions) |
| `docs/conventions/workflow.md` | Sessions, `work/` folders, step template, when to ask |
| `docs/conventions/architecture.md` | Layers, directory layout, dependency direction |
| `docs/conventions/data-layer.md` | Dexie, repositories, outbox/sync, Supabase access |
| `docs/conventions/supabase.md` | Migrations, RLS, storage, keys |
| `docs/conventions/security.md` | Non-negotiable security rules |
| `docs/conventions/code-style.md` | TS/React/Tailwind style, dependency policy |
| `docs/conventions/ui-ux.md` | Mobile-first UI, states, accessibility |
| `docs/conventions/testing.md` | Test strategy and pre-completion checks |
| `docs/conventions/git.md` | Branches, commits |

## Stack (fixed)

Node 24 LTS · Vite · React · TypeScript (strict) · Tailwind CSS · React Router · Dexie (IndexedDB) + dexie-react-hooks · @supabase/supabase-js · Tiptap (notes editor) · vite-plugin-pwa (Workbox) · Vitest + React Testing Library + fake-indexeddb · ESLint + Prettier · Docker Compose (local dev only) · GitHub Actions → GitHub Pages.

## Architecture in one picture

```
pages/components → hooks → services → repositories/local (Dexie)  ← UI reads only from here
                                              ↕ outbox
                                       sync/ → repositories/remote → Supabase (DB, Storage)
auth/ → Supabase Auth
```

- IndexedDB is the working database (full local mirror). Writes = local row + outbox entry in one Dexie transaction. Sync pushes the outbox, then pulls deltas by `server_updated_at`; conflicts are last-write-wins on `updated_at` (enforced by a DB trigger).
- Filters live in URL query params (`/cards?status=learning&category=law&q=…`); the detail page keeps the same query for prev/next.

## Hard rules

- **Read `docs/SPEC.md` before implementing a feature.** Do not silently change behavior it defines.
- If implementation needs a product decision SPEC doesn't cover: ask the owner or choose the simplest option, then **document it in SPEC + `docs/decisions.md` before implementing**.
- Keep `docs/SPEC.md` in sync with every intentional behavior change (same commit).
- **Never** expose the Supabase service-role/secret key. Frontend env vars: only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Never** disable RLS or add permissive policies as a shortcut. **Never** add public sign-up (no page, button, or `auth.signUp`).
- **Never** call Supabase or Dexie from pages/components. Data access goes through hooks → services → repositories; only `sync/`, `repositories/remote/` and `auth/` import the Supabase client.
- Schema changes only via new files in `supabase/migrations/` (append-only), mirrored in domain types and a new Dexie version.
- iPhone/mobile UX is primary: touch targets ≥ 44 px, 16 px inputs, safe areas, every screen has loading/empty/error/offline states.
- Avoid unnecessary dependencies; ask the owner before adding a runtime dependency not listed in SPEC §20. Prefer the simplest correct implementation; no enterprise patterns.
- No `any` without a justified eslint-disable comment. Small components, pure logic in `domain/`.
- Respect the GitHub Pages base path: never hard-code `/` for assets or routes — use `import.meta.env.BASE_URL` / router `basename`.
- Before declaring a step/feature done, run **lint, typecheck, tests, build** and report the results honestly.
- Commit only at step completion or when asked; never push/force-push without consent; never commit `.env` or `dist/`.

## Commands

Dev runs in Docker (Node 24). `.env` is optional for the dev server — without it the app shows a configuration-error screen.

```bash
docker compose run --rm web npm ci     # install deps (node_modules lives in a Docker volume)
docker compose up                       # dev server → http://localhost:5173/gapper/
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm run test    # vitest run
docker compose exec web npm run build   # tsc -b && vite build (+ sw.js, manifest, 404.html, CSP meta)
docker compose exec web npm run format  # prettier --write (format:check in CI)
# one-off checks without a running server: docker compose run --rm web npm run <script>
# add a dependency: docker compose run --rm web npm install <pkg>  (updates package-lock.json)
```

Supabase (CLI on host, pinned): `npx supabase@2.119.0 db push` / `test db --linked` (after owner `login` + `link`) — see `docs/conventions/supabase.md`.

## Tooling

- Context7 MCP is configured in `.mcp.json` (project scope): use it for current library docs (Supabase, Dexie, Vite, React Router, Workbox…). Optional `CONTEXT7_API_KEY` env var raises rate limits; never commit the key.

## Deployment

`main` → GitHub Actions (`npm ci` → lint → format:check → typecheck → test → build → dist secret check) → `dist/` → GitHub Pages at `https://yurihaiduk.github.io/gapper/` (repo `YuriHaiduk/gapper`, public). Supabase URL and publishable key come from repository Actions variables. `dist/` is never committed. Deep links work via `404.html` fallback + service-worker `navigateFallback`. A daily `supabase-keep-alive.yml` workflow keeps the Free Supabase project from pausing (re-enable it in the Actions tab if GitHub disables it after 60 idle days).

## Owner-only actions (always ask, then wait)

Creating/configuring the Supabase project, the owner user, disabling sign-ups, filling `.env`, creating the GitHub repo, setting Actions variables, enabling Pages, testing on the real iPhone.
