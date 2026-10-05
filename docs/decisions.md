# Decision log

Lightweight ADRs. Newest at the bottom. Each entry: date · decision · why · alternatives considered. Reference the SPEC section it affects.

| # | Date | Decision | Why | Alternatives | SPEC |
|---|---|---|---|---|---|
| D1 | 2026-10-05 | Docs in English; chat with owner in Ukrainian | Code/docs standard; best for tooling | Ukrainian docs | — |
| D2 | 2026-10-05 | Repo name `gapper`, Pages base `/gapper/`, configurable via `BASE_PATH` | Matches project folder | `/vocabulary/` | §21, §24 |
| D3 | 2026-10-05 | Full local mirror in IndexedDB; UI reads only from Dexie; only `sync/` talks to Supabase DB | Identical behavior online/offline; trivial filtering/search/pagination/prev-next; small dataset | Server-paginated queries + cache | §14 |
| D4 | 2026-10-05 | Client-generated UUIDs | Offline create without id remapping | Server ids + temp ids | §7.3 |
| D5 | 2026-10-05 | Outbox + delta pull by server-maintained `server_updated_at` (60 s overlap); LWW on client `updated_at` enforced by a DB trigger that skips stale updates | Simple, robust, server-enforced for multi-device single user | CRDTs, version vectors | §15 |
| D6 | 2026-10-05 | Soft deletes (tombstones) for cards and categories; no DELETE RLS policies | Deletions must propagate to other devices; hard deletes impossible by accident | Hard delete + deletion log | §7.3, §17 |
| D7 | 2026-10-05 | `status` as `text` + CHECK, not PG enum | Same integrity, easier evolution | enum | §17 |
| D8 | 2026-10-05 | `learned_at` set on → learned, cleared on → learning | "Learned since" semantics; history is a future feature | Keep first learned date | §7.2 |
| D9 | 2026-10-05 | Only `Other` is a system category; seeded defaults are normal editable categories; seeding once via `auth.users` trigger + migration backfill | One concept; deletions are permanent (no re-seed) | `is_builtin` flag; seeding RPC on each login | §8 |
| D10 | 2026-10-05 | Category delete = soft delete + DB trigger reassigns cards to Other; cards trigger maps missing/deleted category to Other | Invariant holds regardless of client/offline order | App-only transaction | §8.5, §17 |
| D11 | 2026-10-05 | Composite FK `(category_id, user_id)` | Cards can only reference own categories, independent of RLS | Rely on RLS | §17 |
| D12 | 2026-10-05 | Filters as query params with category **slug**; detail page carries the same query as context | Bookmarkable, readable, robust prev/next without global state | Route params; ids in URL | §11, §13 |
| D13 | 2026-10-05 | List pagination = growing window (`visibleCount + 1`) over live Dexie query; prev/next = keyset neighbour queries | Simplest correct approach on local data; live updates | Cursor pages | §12, §13 |
| D14 | 2026-10-05 | Search in MVP, client-side, normalized `_search` field | Cheap given full mirror | Postgres FTS/pg_trgm | §11.3 |
| D15 | 2026-10-05 | Audio optional; new object per recording; upload before card upsert; delete old after; playback by authenticated download + local blob cache | Atomic replacement, offline playback, no dangling references | Signed URLs; overwrite same key | §10, §19 |
| D16 | 2026-10-05 | Prefer `audio/mp4` for recording | Cross-playback iPhone ↔ desktop | webm first | §10.2 |
| D17 | 2026-10-05 | Clean URLs (data router) + `404.html` copy of `index.html` + SW navigateFallback | Clean URLs, reliable deep links on Pages | HashRouter; spa-github-pages redirect hack | §21 |
| D18 | 2026-10-05 | No state/data-fetching/UI/form libraries; React context only for auth + sync status | Dexie live queries cover data needs; keep deps minimal | Redux, Zustand, TanStack Query | §20 |
| D19 | 2026-10-05 | PWA `registerType: 'prompt'` | Never reload under an unsaved form | `autoUpdate` | §22 |
| D20 | 2026-10-05 | Logout wipes local DB | Private data must not persist after sign-out | Keep cache | §9 |
