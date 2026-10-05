# Step 11 — PWA

Status: done
Spec: docs/SPEC.md §21, §22; AC-58, AC-61
Plan: approved 2026-10-05 (owner: CSP yes, build only; bundle warning → raise chunkSizeWarningLimit)

## Goal
Installable, offline-capable PWA: manifest + icons, precaching service worker (incl. the NotesEditor chunk), "New version available · Reload" toast, 404.html deep-link fallback, build-only CSP.

## User actions
- [x] 👤 `vite preview` check on the Mac — owner: "everything works". iPhone install/AC-58/AC-61 after step 12 (plan backlog).

## Tasks
- [x] Dev deps `vite-plugin-pwa@2`, `@vite-pwa/assets-generator@2` (workbox-window 7.4.1 via peer; 0 vulnerabilities)
- [x] `public/favicon.svg` G as a path (no fonts in Docker); `pwa-assets.config.ts`; script `generate-pwa-assets`; icons generated in `public/`
- [x] `vite.config.ts`: VitePWA (prompt, injectRegister false, manifest from `base`, workbox), CSP plugin, 404 plugin, `chunkSizeWarningLimit: 800`, test alias for `virtual:pwa-register/react`
- [x] `index.html` iOS meta + icon links; `tsconfig.app.json` types `vite-plugin-pwa/react`
- [x] `src/hooks/unsavedChanges.ts` + `useLeaveGuard` registers while dirty
- [x] `src/app/UpdatePrompt.tsx` (foreground update check, hidden while dirty) mounted in `RootLayout`; `src/test/pwaRegisterMock.ts` + reset in setup
- [x] Tests: `UpdatePrompt.test.tsx` (shows, Reload → `updateCalls [true]`, Later hides, hidden while a dirty form), `unsavedChanges.test.ts`
- [x] lint / typecheck / test / build / format:check; inspect dist (sw.js, manifest, 404.html not precached, NotesEditor precached, CSP meta)
- [x] `vite preview` check (`docker compose run --rm -p 4173:4173 web npm run preview`): Tiptap + audio under CSP, offline reload, update toast
- [x] Docs: SPEC §20.4/§22 (icon names, toast hidden while dirty, foreground update check, CSP, 404 plugin), decisions D55 (toast/update check), D56 (CSP), D57 (chunk limit); plan.md tick + close the step-11 backlog items; CLAUDE.md build comment
- [x] Commit `feat(pwa): …`

## Verification
- lint, typecheck, format:check: pass. Tests: 270/270, 5 consecutive full runs green.
- Two pre-existing flaky tests fixed (sync-only `getBy*` on Dexie-backed async data under full-suite load): `syncUx.test.tsx` (failed-entry row), `CardListPage.test.tsx` (facet counts) → `findBy*`.
- Build: no chunk warning; precache 13 entries (1124 KiB), no duplicates (`includeManifestIcons: false`, manifest added by the plugin); `NotesEditor-*.js` precached; `404.html` not precached and identical to `index.html`; `navigateFallback` → `index.html`; CSP meta present with the project's Supabase origin; manifest scope/start_url under `/gapper/`.
- Owner's `vite preview` check on the Mac (Chrome): passed.
