# Code style

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` (relax only with a note in `decisions.md`).
- No `any`. Use `unknown` + narrowing. An unavoidable `any` needs `// eslint-disable-next-line … -- reason`.
- Prefer `type` aliases for data shapes; string-literal unions instead of TS `enum` (`type CardStatus = 'learning' | 'learned'`).
- Domain types live in `src/domain/`. DB row types (snake_case) match Postgres column names 1:1 — no mapping layer to camelCase.
- Errors: throw/return a typed `AppError` (`{ kind: 'network' | 'auth' | 'validation' | 'not_found' | 'unknown', message, cause? }`).
- Use `import type` for type-only imports. Path alias `@/` → `src/`.

## React

- Function components + hooks only. Named exports (except where a library requires default).
- Components: `PascalCase.tsx`. Hooks: `useThing.ts`. Other modules: `camelCase.ts`. Tests: `*.test.ts(x)` next to the file.
- Props typed inline or as `type XProps`. No prop drilling beyond ~2 levels — use a hook.
- Side effects in hooks, not in render. Clean up subscriptions, object URLs (`URL.revokeObjectURL`), media streams (`track.stop()`).
- Forms: controlled inputs + small validation functions in `domain/`; no form library unless a step proves the need.

## Styling

- Tailwind utility classes only; no CSS-in-JS, no component library.
- Extract repeated class sets into a component, not into `@apply` soup.
- Mobile-first: base classes for iPhone, `sm:`/`md:` for larger screens.

## Tooling

- ESLint (flat config, `typescript-eslint` strict + `react-hooks` + `jsx-a11y`) and Prettier (single quotes, semicolons, print width 100, trailing commas `all`).
- No unused vars/imports, no `console.log` in committed code (`console.warn/error` allowed in error paths).

## Dependencies

Allowed baseline (see `SPEC.md` §20): react, react-dom, react-router, @supabase/supabase-js, dexie, dexie-react-hooks, tailwindcss, vite-plugin-pwa (+ workbox), dev: typescript, vite, vitest, @testing-library/*, jsdom, fake-indexeddb, eslint, prettier, @playwright/test.

Any other dependency requires: a real need, a check that ~20 lines of own code can't do it, small bundle impact, active maintenance, and a line in `decisions.md`. Ask the owner for runtime dependencies.

## Comments & docs

- Comment *why*, not *what*. Public functions in services/sync get a one-line JSDoc when not obvious.
- If code changes behavior described in `docs/SPEC.md`, update SPEC in the same commit.
