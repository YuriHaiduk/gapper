# Step 01 — Project scaffold

Status: done
Spec: docs/SPEC.md §20, §21, §23

## Goal
Production-shaped empty frontend: Vite + React 19 + TS strict + Tailwind v4, ESLint/Prettier, Vitest + RTL, Docker Compose dev env, validated env, hello-world under `/gapper/`.

## Scope
- In: tooling configs, npm scripts, Docker Compose, `.env.example`, `src/lib/env.ts`, hello-world + config error screen, smoke tests.
- Out: router, Dexie, Supabase client, PWA plugin, 404.html copy (step 11), Playwright (step 13).

## User actions
- None.

## Tasks
- [x] `package.json` + lockfile (deps installed in Docker)
- [x] `tsconfig*.json` (strict + extra flags, `@/` alias)
- [x] `vite.config.ts` (base from `BASE_PATH`, react, tailwind, vitest config)
- [x] `eslint.config.js`, `.prettierrc`, `.prettierignore`
- [x] `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/ConfigErrorScreen.tsx`, `src/styles/index.css`
- [x] `src/lib/env.ts` + tests, `src/app/App.test.tsx`, `src/test/setup.ts`
- [x] `docker-compose.yml`, `.env.example`, `public/favicon.svg`, `.vscode/extensions.json`
- [x] Docs: decisions D21, CLAUDE.md commands

## Files
- see Tasks

## Verification
- [x] npm run lint / typecheck / test / build
- [x] `npm ci` from lockfile works
- [x] Dev server serves http://localhost:5173/gapper/
- [x] Built assets use `/gapper/` base; no secrets in repo

## Notes / decisions
- Results (in Docker, Node 24.21): lint ✅, typecheck ✅, test ✅ (2 files, 5 tests), build ✅ (JS 221 kB / 69 kB gzip), format:check ✅, `npm ci` ✅ (0 vulnerabilities).
- Dev server: `/gapper/` → 200; built `index.html` references `/gapper/assets/…`.
- Resolved versions: Vite 8.3, React 19.3, TS 6.0, Tailwind 4.3, Vitest 5.0, ESLint 9.39, typescript-eslint 8.71.
- ESLint pinned to 9 because jsx-a11y does not support 10 yet (D22). `eslint.config.js` is linted without type info (no types for jsx-a11y).
- TS 6 deprecates `baseUrl`; `@/*` uses `paths` relative to tsconfig.
- `App` takes `envResult` as a prop (testable); `main.tsx` passes the value parsed from `import.meta.env`. Without `.env` the app shows the configuration-error screen (expected until step 02).
- Prettier ignores `docs/`, `work/`, `CLAUDE.md` (hand-formatted markdown).
