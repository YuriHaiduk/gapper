# Testing

Pragmatic, risk-based. No coverage targets; test what would hurt if broken.

## Tools

- **Vitest** (jsdom environment) — unit + integration tests.
- **React Testing Library** + `@testing-library/user-event` — component behavior (query by role/label, not by class).
- **fake-indexeddb** — Dexie repositories and sync.
- **Playwright** — a handful of critical E2E flows against `vite preview` with a mocked/fake remote layer or a dedicated test account (decided in step 13).

## What must be tested

| Area | Level |
|---|---|
| Filter ↔ URL parsing/serialization | unit |
| Keyset pagination & adjacency (prev/next) | unit (pure) + repo integration |
| Card service: defaults (Other, learning), validation, `learned_at` rules | unit |
| Category service: create/rename/unique, delete → Other, Other protected | unit/integration |
| Sync: outbox push, pull cursor, LWW conflicts, retry | integration (fake remote) |
| Audio recorder hook (MediaRecorder/getUserMedia mocked) | unit |
| Login form, protected route redirect | component |
| Card list: render, load more appends, empty/error states | component |
| E2E: login → list → create → detail → next → mark learned | Playwright |

## Rules

- Tests live next to the code (`foo.test.ts`); shared helpers in `src/test/`.
- Never call real Supabase in unit/component tests. Remote repos are injected/faked.
- A bug fix comes with a regression test when practical.
- Tests must be deterministic: fixed dates (`vi.setSystemTime`), seeded UUIDs where order matters.

## Before marking any step done

```
npm run lint
npm run typecheck
npm run test
npm run build
```

All must pass (inside Docker or on host with Node 24). Record the result in the step file.
