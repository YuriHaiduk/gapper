# Data layer (Dexie + Supabase + sync)

Behavior is specified in `docs/SPEC.md` §14–§19. These are the implementation rules.

## Principles

- **IndexedDB (Dexie) is the app's working database.** Every screen reads from Dexie. Supabase is the durable cloud copy, reached only by `sync/` and `auth/`.
- **Offline-first writes.** A write = one Dexie transaction that updates the local row *and* appends an outbox operation. The UI never waits for the network.
- **IDs are generated on the client** with `crypto.randomUUID()`.
- **Timestamps** are ISO-8601 UTC strings in TypeScript (`string`), `timestamptz` in Postgres. `updated_at` is set by the client on every user edit (used for last-write-wins). `server_updated_at` is set only by a Postgres trigger (used as the pull cursor) and never written by the client.

## Dexie rules

- One database class in `src/db/database.ts`; name `gapper`. Each schema change = new `db.version(n)` with an upgrade function if data must be migrated. **Never edit an existing version block** once released.
- Index only what queries need. Compound index for list ordering: `[created_at+id]`; filter indexes on `status`, `category_id`.
- Use `useLiveQuery` (from `dexie-react-hooks`) inside hooks, never in pages directly.
- Wrap multi-table writes in `db.transaction('rw', …)`.
- Store booleans as `0/1` if they must be indexed (IndexedDB cannot index booleans).
- Audio blobs live in their own table (`audio_blobs`) — never inside card rows.
- Local logout clears all Dexie tables (private data must not survive sign-out) — after warning the user if the outbox is not empty.

## Supabase rules

- Single client in `src/lib/supabase.ts`, created from `env.ts` values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Only `repositories/remote/*`, `sync/*` and `auth/*` may import it.
- Always select explicit columns; never `select('*')` in remote repositories.
- Always check `{ error }` and convert it into a typed `AppError`; never swallow errors.
- Do not pass `user_id` from UI state; remote repos take it from the current session (`auth.getUser()`/session cache). RLS is the real guard anyway.
- Storage: private bucket `audio`, key `<user_id>/<card_id>/<recording_uuid>.<ext>`. Playback via `createSignedUrl` (short TTL) or `download()` → cached blob.

## Outbox / sync rules

- Outbox entry: `{ id (auto), entity: 'card'|'category'|'audio', op: 'upsert'|'delete', entity_id, created_at, attempts, last_error }`. Payload is read from the current local row at push time (not snapshotted) so multiple edits coalesce.
- Push order: categories → audio uploads → cards → deletions. Process FIFO, one entry at a time; on success delete the entry; on failure increment `attempts`, keep it, back off.
- Pull: `select … where server_updated_at > cursor order by server_updated_at limit 500`, loop until empty, store cursor per table in a `meta` table.
- Conflict: compare `updated_at`; newer wins. Local rows with a pending outbox entry are not overwritten by an older remote row.
- Triggers for sync: app start (after auth), `online` event, `visibilitychange` → visible, after each local write (debounced ~2 s), manual "Sync now".
- Sync must be idempotent and safe to run concurrently-triggered (use a single-flight lock).

## Testing

- Use `fake-indexeddb` for repository/sync tests.
- Remote repos are tested through a fake implementing the same interface; do not hit real Supabase in unit tests.
