# Gapper — Personal Vocabulary PWA · Specification

Version: 1.0 (MVP) · Status: approved for implementation · Last updated: 2026-10-05

This document is the **source of truth for product behavior and technical design**. Code must match it. Intentional changes are made here first (or in the same commit) and logged in `docs/decisions.md`.

Original brief: `work/active/001-vocabulary-pwa-mvp/brief.md` (or `work/archive/…` after completion).

---

## Table of contents

1. Product overview · 2. Goals · 3. Non-goals · 4. User model · 5. Functional requirements · 6. Pages and navigation · 7. Vocabulary card behavior · 8. Categories · 9. Authentication · 10. Audio recording · 11. Filtering, search, sorting · 12. Pagination · 13. Previous/next navigation · 14. Offline-first behavior · 15. Synchronization strategy · 16. Data model · 17. Supabase schema · 18. RLS policies · 19. Storage architecture · 20. Frontend architecture · 21. Routing · 22. PWA requirements · 23. Docker development environment · 24. GitHub Pages deployment · 25. Error, loading, empty states · 26. Security · 27. Testing · 28. MVP scope · 29. Future improvements · 30. Acceptance criteria

---

## 1. Product overview

**Gapper** is a private, single-owner Progressive Web App for collecting and reviewing vocabulary. Each *card* holds a word or phrase, free-form rich-text notes (translations, example sentences — whatever the owner writes), an optional personal audio recording of the pronunciation, a category, and a learning status (`learning` / `learned`).

- Primary device: iPhone, installed to the Home Screen (standalone PWA).
- Secondary: any modern desktop browser.
- Hosting: static files on GitHub Pages at `https://<github-user>.github.io/gapper/`.
- Backend: Supabase Free tier (Postgres, Auth, Storage) accessed directly from the browser with `@supabase/supabase-js`. No custom server.
- Offline-first: all cards are mirrored in IndexedDB; the app reads and writes locally and synchronizes with Supabase when online.

## 2. Goals

1. Add a card in under 20 seconds on an iPhone, one-handed.
2. Fast, calm reading of cards: list → detail → next/previous within the same context.
3. Work offline for everything already synced; never lose an edit made offline.
4. Zero operating cost (Supabase Free + GitHub Pages).
5. Codebase simple enough for one developer to maintain.

## 3. Non-goals

- Multiple users, sharing, public profiles, registration, password reset UI, social login.
- Spaced-repetition scheduling, quizzes, statistics (see §29).
- Custom backend/API server, serverless functions, Redis, queues, microservices.
- Native apps, push notifications.
- Real-time collaboration / realtime subscriptions.
- Server-side rendering or SEO.

## 4. User model

- Exactly **one owner account**, created manually in the Supabase dashboard (Authentication → Users → Add user, with "Auto Confirm User").
- Public sign-ups are **disabled** in Supabase (Authentication → Sign In / Providers → "Allow new users to sign up" = off).
- The app has no sign-up UI and never calls `auth.signUp`.
- All data rows carry `user_id`; RLS restricts every row and file to `auth.uid()`. The model is multi-user-safe even though only one user exists.
- The owner may use several devices (iPhone + desktop). Each device has its own local mirror.

## 5. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | Sign in with email + password. No sign-up. Sign out from the app menu. |
| FR-2 | Protected pages are reachable only when authenticated. |
| FR-3 | List cards newest first, 20 at a time, with "Load more" appending 20 more. |
| FR-4 | Filter the list by status (All / Learning / Learned) and by category, combinable, encoded in the URL. |
| FR-5 | Search cards by title and notes text (MVP), combinable with filters. |
| FR-6 | View a card's detail page with audio playback and previous/next navigation that stays within the list context. |
| FR-7 | Create a card: title required; everything else optional; category defaults to `Other`; status defaults to `learning`. |
| FR-8 | Edit every card field, including status and audio; delete a card (with confirmation). |
| FR-9 | Toggle a card between Learning and Learned from the detail page (one tap) and the edit page. |
| FR-10 | Record, preview, discard/re-record, replace and remove a personal audio recording. |
| FR-11 | Manage categories: list with card counts, create, rename, delete (cards move to `Other`); `Other` is protected. |
| FR-12 | Default categories are seeded once for the owner account. |
| FR-13 | Read all synced cards offline; create/edit/delete offline; sync automatically when back online. |
| FR-14 | Installable PWA with icon, standalone display, offline app shell. |

## 6. Pages and navigation

| Route | Page | Auth | Purpose |
|---|---|---|---|
| `/login` | LoginPage | public (redirects to `/cards` if signed in) | Email + password sign-in |
| `/` | — | — | Redirect to `/cards` |
| `/cards` | CardListPage | protected | Main page: filter, search, list, load more |
| `/cards/new` | CardFormPage (create) | protected | Create card |
| `/cards/:id` | CardDetailPage | protected | Read/listen, prev/next, toggle status |
| `/cards/:id/edit` | CardFormPage (edit) | protected | Edit/delete card |
| `/categories` | CategoriesPage | protected | Manage categories |
| `*` | NotFoundPage | — | "Page not found" + link to `/cards` |

All routes live under the base path `/gapper/` (see §21).

### App shell

- **Header** (sticky, safe-area aware): left = context/back control, center = page title or filter button, right = overflow menu (⋯).
- **Overflow menu** (all protected pages): `Categories`, `Sync now` (shows last sync time / pending count), `Sign out`.
- **Offline banner** under the header when `navigator.onLine === false` (§25).
- **Update toast** when a new service worker is waiting: "New version available · Reload".

### Visual style — monochrome (rule)

The UI is **strictly monochrome: black & white plus grays**. No accent or hue colors anywhere (no blue/indigo links, no red errors, no amber banners).

- Allowed Tailwind colors: `black`, `white`, `neutral-*` only. Images/icons follow the same rule.
- Light theme: black text on white (`bg-white`, `text-neutral-900`). Dark theme (`prefers-color-scheme: dark`): inverted — light text on near-black (`bg-neutral-950` = `#0a0a0a`, `text-neutral-100`).
- Primary button: solid black with white text (dark: solid white with black text). Secondary: outline. Links: underlined text, not colored.
- Focus ring: `outline-black` (dark: `outline-white`).
- Errors and warnings are distinguished by weight, a `⚠` glyph and/or a border — never by color (`role="alert"` as before). Offline banner: inverted bar (black on light theme, white on dark).
- Status pills: `Learning` = outlined, `Learned` = filled (inverted). Pending-sync dot: filled neutral dot.
- Hierarchy comes from size, weight, spacing and gray levels (`neutral-500/600` muted text, `neutral-200/800` borders).

### Navigation map

```
/login ──sign in──▶ /cards ◀───────────────────────────────┐
                     │  ├─ filter sheet (status, category) │
                     │  ├─ search                          │
                     │  ├─ + (FAB) ─▶ /cards/new ──save──▶ /cards/:id
                     │  └─ title ───▶ /cards/:id ─edit─▶ /cards/:id/edit
                     │                  ├─ ← prev / next →  (same context)
                     │                  └─ back ──────────────┘
                     └─ ⋯ ─▶ /categories
```

## 7. Vocabulary card behavior

### 7.1 Fields and validation

The title is trimmed. Notes without any text are stored as `NULL`.

| Field | Required | Max length | Notes |
|---|---|---|---|
| `title` | yes | 200 | word or phrase, e.g. `burden of proof` |
| `notes` | no | 5000 chars of text (JSON ≤ 100 kB) | rich text (D42): paragraphs, **bold**, *italic*, bullet and numbered lists; stored as a Tiptap/ProseMirror JSON document |
| `category_id` | no in UI | — | empty → `Other` (enforced in service **and** DB trigger) |
| `status` | — | — | `learning` (default) or `learned` |
| audio | no | 60 s | see §10 |

Validation messages (shown under the field, `aria-describedby`):
- Title empty → "Title is required."
- Over limit → "Must be at most N characters."

Duplicate titles are **allowed** (same word may have different senses). When the trimmed, case-insensitive title already exists, the form shows a non-blocking hint: "You already have a card “abandon”." with a link to it.

### 7.2 Status and `learned_at`

- New cards: `status = 'learning'`, `learned_at = NULL`.
- `learning → learned`: `learned_at = now()`.
- `learned → learned` (no change): `learned_at` unchanged.
- `learned → learning`: `learned_at = NULL`. **Decision:** `learned_at` means "learned since"; it does not keep history. If the card is learned again, it gets a new timestamp. History tracking is a future feature (§29).
- Invariant enforced by DB CHECK: `status = 'learned'` ⇔ `learned_at IS NOT NULL`.
- Status changes update `updated_at` but **not** `created_at`, so list ordering never changes.

### 7.3 Lifecycle

- **Create**: client generates `id` (`crypto.randomUUID()`), `created_at = updated_at = now()`; saved to IndexedDB + outbox immediately.
- **Edit**: `updated_at = now()`.
- **Delete**: soft delete (`deleted_at = now()`, `updated_at = now()`), hidden everywhere immediately; audio objects removed on sync; the tombstone remains in Postgres (tiny) so other devices learn about the deletion. Delete requires confirmation: "Delete “abandon”? This cannot be undone."

### 7.4 Card list item

Compact row (≈ 64–72 px):
- **Title** (semibold, the link to `/cards/:id?<context>`; the link's hit area stretches across the whole row).
- Notes preview: the first non-empty line of the notes text (muted, single line, truncated).
- Meta line: category name · status pill (`Learning` / `Learned`) · 🔊 icon if audio exists · dot if the card has unsynced local changes.
- Created date is not shown in the list (shown on the detail page).

### 7.5 Card detail page

Order and emphasis:
1. Title — largest text (≈ 28–32 px), wraps.
2. Notes — rendered rich text (paragraphs, bold, italic, lists), normal size. Rendered as React elements from the JSON (`RichTextView`), never as HTML. Hidden if empty.
3. Audio player — large Play/Pause button (≥ 56 px) + progress. Hidden if no audio. If audio is not cached and the device is offline: "Audio unavailable offline".
4. Category chip + status pill.
5. Metadata (small, muted): Created, Updated, Learned on (if learned).

Bottom action bar (thumb zone): `← prev-title` · status toggle (`Mark as learned` / `Move to learning`) · `next-title →`. `Edit` lives in the header. Back control returns to the list with the same context.

### 7.6 Card form

`/cards/new` and `/cards/:id/edit` share `CardFormPage`. The list context (`?status&category&q`) stays in the form's URL: the FAB links to `/cards/new?<list query>`, and the header Back link returns to `/cards?<query>` (create) or `/cards/:id?<query>` (edit).

- Fields, top to bottom: Title, **Notes** (rich-text editor, D42/D43: toolbar Bold · Italic · Bullet list · Numbered list · Undo · Redo; markdown-style shortcuts like `**bold**` and `- ` also work; the editor is lazy-loaded), Category (native `<select>`, `Other` last), and Status (edit only; two radio buttons, Learning / Learned).
- **Category select** has no blank option (D37). Create defaults to the context category (`?category=` slug) or `Other`. To clear a card's category, pick `Other`. The service also maps an empty, unknown or deleted category id to `Other`.
- **New cards** are always `learning` (D38). Status changes on the edit form follow §7.2.
- Validation runs on submit (§7.1). Errors appear under the field, and the first invalid field gets focus. The duplicate-title hint shows under Title while typing.
- Sticky bottom action bar: **Save**, plus **Save & add another** on create. Buttons show a pending state while saving. An unexpected failure shows "Couldn't save."
- **After Save** (D39): `/cards/:id?<query>` with `replace`, so Back from the card returns to where the form was opened, not to the form. Saving an unchanged card is a no-op (no new `updated_at`, no outbox entry).
- **Save & add another** (D40) stays on the form. It clears the text fields, keeps the selected category, focuses Title and announces "Saved “abandon”." (`role="status"`).
- **Delete card** (edit only): native confirm (§7.3, D32), then soft delete, then `/cards?<query>` with `replace`.
- **Unsaved changes** (D41): leaving a form whose values differ from what it opened with (or from the reset form after "Save & add another") asks "Discard unsaved changes?" (native confirm). This covers the header Back, browser/iOS Back, the duplicate-hint link and any other in-app link; Cancel keeps the user on the form with the typed values. Reload/tab close triggers the browser's own `beforeunload` prompt (not reliable on iOS). Save, Save & add another and a confirmed Delete never ask.
- Edit of a missing or deleted card: "Card not found." + "Back to cards". The form is initialized once per card, so a sync landing mid-edit does not overwrite what the user typed (the user's later save wins via LWW).

## 8. Categories

### 8.1 Model

- Categories are rows in `categories`, owned by a user (`user_id`).
- Exactly one **system** category per user: `Other` (`is_system = true`, slug `other`). It cannot be renamed or deleted (DB trigger raises an error; UI hides those actions and shows a lock icon).
- All other categories — including the seeded defaults — are ordinary user categories: renamable and deletable. **Decision:** keeping only one system category avoids a second concept ("built-in but editable") and keeps rules simple.
- Name: trimmed, 1–40 chars, unique per user case-insensitively among non-deleted categories.
- Slug: derived from the name (see 8.4), unique per user among non-deleted categories, used in URLs (`?category=law`).
- Sort order in menus: `Other` last; the rest alphabetically (locale-aware, case-insensitive).

### 8.2 Default categories (seeded once)

`Everyday`, `Work`, `Law`, `Finance`, `Technology`, `Travel`, `Food`, `Health`, `Education`, `Other` (system).

### 8.3 Seeding

- A Postgres function `public.seed_default_categories(p_user_id uuid)` inserts the defaults.
- It runs **once per user**, from an `AFTER INSERT` trigger on `auth.users` (fires when the owner is created in the dashboard).
- The migration that creates it also backfills any existing users that have no categories yet (in case the owner was created before the migration).
- The function is not executable by `anon`/`authenticated`; clients cannot call it.
- Because seeding is one-time, deleting a default category is permanent (it is not re-created on next login).

### 8.4 Slug generation (client, `domain/slugify.ts`)

1. Unicode NFKD, strip combining marks **from Latin letters only** (`Café` → `cafe`), recompose (NFC), lowercase.
2. Replace every run of characters that are not letters/digits (Unicode `\p{L}\p{N}`) with `-`; trim `-` from both ends.
3. If the result is empty, use `category`.
4. If the slug is taken by another non-deleted category, append `-2`, `-3`, …
5. Renaming regenerates the slug. A bookmarked URL with an old slug then shows the "Category not found" state (§25). Acceptable for a personal app.

Non-Latin names keep their letters intact, including letters with marks (e.g. `Їжа` → `їжа`, `Йога` → `йога`); URLs are percent-encoded by the browser.

### 8.5 Lifecycle

| Action | Behavior |
|---|---|
| Create | `/categories` → "New category" → name → Save. Duplicate name → "A category with this name already exists." |
| Rename | Inline edit (Enter saves, Escape cancels); same validation; slug regenerated; an unchanged name is a no-op. `Other`: not allowed. |
| Delete | Native confirm: "Delete “Law”? Its N cards will move to Other." ("Its 1 card will…"; just "Delete “Law”?" when it has no cards) → soft delete (`deleted_at`). Locally, all its cards are reassigned to `Other` in the same Dexie transaction; on the server a trigger does the same. `Other`: not allowed. |
| Card counts | Computed locally from IndexedDB (non-deleted cards per category). |
| Filtering | Each category is a filter option in the list's filter sheet (§11). |

Server guarantees (triggers, §17): a card can never reference a deleted category (it is moved to `Other` on write), cards of a deleted category are reassigned to `Other`, `Other` cannot be changed, hard deletes are impossible (no DELETE policy; FK `ON DELETE RESTRICT`).

## 9. Authentication

- Supabase Auth, email + password: `supabase.auth.signInWithPassword({ email, password })`.
- Session persisted by supabase-js in `localStorage` with auto-refresh (defaults). On app start the session is read locally — the app opens offline with the last session.
- **Login page**: email (`type=email`, `autocomplete=username`), password (`type=password`, `autocomplete=current-password`), "Sign in" button with pending state. No sign-up, no "forgot password" link (owner resets via dashboard).
  - Client validation: email format, password non-empty.
  - Errors: invalid credentials → "Incorrect email or password."; offline → "You're offline. Signing in requires a connection."; other → "Couldn't sign in. Try again."
- **Route guard** `RequireAuth`: while auth state initializes → full-screen splash (logo + spinner); no session → redirect to `/login?redirect=<path+query>`; after login → redirect to `redirect` (only same-app relative paths are accepted) or `/cards`.
- Signed-in user opening `/login` → redirect to `/cards`.
- **Token refresh failing for network reasons** → keep working offline; sync paused.
- **Session invalid (refresh rejected / 401 after refresh)** → banner "Session expired — Sign in again"; local data and outbox are kept; after signing in as the same user, sync resumes. If a different user signs in, local data is wiped first.
- **Sign out**: if the outbox is not empty → confirm "You have N unsynced changes. Signing out will discard them." Then `auth.signOut()`, delete the Dexie database, revoke object URLs, navigate to `/login`.

## 10. Audio recording

### 10.1 UX (create/edit form)

States of the `AudioRecorder` component:

| State | UI |
|---|---|
| `idle` (no audio) | 🎙 "Record pronunciation" button |
| `requesting` | "Allow microphone access…" |
| `recording` | pulsing red dot, elapsed time `0:07 / 1:00`, ■ "Stop" button (large) |
| `recorded` | audio preview (play/pause), "Re-record", "Remove" |
| `existing` (edit, has saved audio) | play existing, "Replace", "Remove" |
| `denied` / `unsupported` / `error` | message + retry; form can still be saved without audio |

- Recording auto-stops at **60 seconds**.
- Audio is **optional** (decision: fastest card entry; audio can be added later).
- Re-record discards the previous unsaved recording. Nothing is persisted until the form is saved.
- Microphone tracks are stopped (`track.stop()`) as soon as recording stops or the component unmounts. Object URLs are revoked on cleanup.
- Recording must start from a user gesture. Permission may be re-prompted by iOS in standalone mode; this is expected.

### 10.2 Format

- `MediaRecorder` mime type chosen with `MediaRecorder.isTypeSupported`, in order: `audio/mp4` → `audio/webm;codecs=opus` → `audio/webm` → browser default.
- File extension: `audio/mp4` → `m4a`, `audio/webm*` → `webm`, `audio/ogg*` → `ogg`.
- Uploaded `contentType` is the base type without parameters (e.g. `audio/webm`).
- Preferring `audio/mp4` maximizes playback compatibility between iPhone (Safari records AAC/mp4) and desktop browsers.

### 10.3 Persistence and sync

1. On form save with a new recording: generate `recording_id = randomUUID()`, `path = <user_id>/<card_id>/<recording_id>.<ext>`.
2. In one Dexie transaction: store the Blob in `audio_blobs` (`uploaded = 0`), set `card.audio_path = path`, enqueue `audio:upload(path)` then `card:upsert(card_id)`; if the card had an older `audio_path`, enqueue `audio:delete(old_path)` **after** the card upsert.
3. Sync uploads the blob (`upload(path, blob, { contentType, upsert: false })`; "already exists" is treated as success), marks `uploaded = 1`, then upserts the card, then deletes the old file.
4. Removing audio: `audio_path = NULL`, enqueue `card:upsert`, then `audio:delete(old_path)`.
5. Deleting a card: after the tombstone is pushed, remove all objects under `<user_id>/<card_id>/` (list + remove).
6. The remote card never references a file that has not been uploaded (upload precedes upsert).

### 10.4 Playback and caching

- If a blob for `audio_path` exists in `audio_blobs` → play it via an object URL.
- Else, if online → `storage.from('audio').download(path)` (authenticated; RLS applies), store blob in `audio_blobs` (`uploaded = 1`), play it. **Decision:** download-and-cache instead of signed URLs, so audio works offline after first play.
- Else → "Audio unavailable offline".
- Cache eviction: none in MVP (recordings are ~50–150 KB each). A "Download all audio for offline use" action is a future improvement.

## 11. Filtering, search, sorting

### 11.1 URL state

All list context lives in query parameters on `/cards`:

| Param | Values | Absent means |
|---|---|---|
| `status` | `learning` \| `learned` | all statuses |
| `category` | category slug | all categories |
| `q` | free text (trimmed, max 100) | no search |

Examples: `/cards`, `/cards?status=learning`, `/cards?category=law`, `/cards?status=learning&category=law`, `/cards?q=proof`.

- Parsing/serialization in `domain/cardFilter.ts` (pure, tested). Canonical param order: `status`, `category`, `q`. Unknown params are dropped; an invalid `status` is ignored (treated as absent).
- Unknown category slug → "Category not found" empty state with "Show all cards" link.
- Changing a filter uses `navigate(..., { replace: false })` (Back returns to the previous filter); typing in search uses `replace: true`, debounced 300 ms.

### 11.2 Filter UI

- Header center: a button showing the current context, e.g. `All cards ▾`, `Learning ▾`, `Learning · Law ▾`, `Law ▾`.
- Tapping it opens a **bottom sheet** (native `<dialog>`) with two groups of large radio rows:
  - *Status*: All · Learning · Learned (with counts).
  - *Category*: All categories · each category (with counts), `Other` last.
  - Counts are **faceted**: status counts respect the selected category (and search); category counts respect the selected status (and search) — each number is what the list would show after picking that option.
- Selecting an option applies immediately and keeps the other group's value; a "Done" button / backdrop tap closes the sheet.
- On desktop the same component renders as a dropdown panel.

### 11.3 Search

- Search field (toggle via 🔍 in header; expands under the header). Clear (×) button.
- Matching: case-insensitive, diacritic-insensitive substring match over `title` and the plain text of `notes`. Multiple words → all must match (AND).
- Implementation: client-side over IndexedDB. Each local card row stores a derived `_search` string (normalized concatenation), recomputed on every local write and pull. Fine for ≤ ~10 000 cards.
- Combined with status/category filters and pagination.
- Empty result: "No cards match “proof”."

### 11.4 Sorting

- MVP: only `created_at DESC, id DESC` (newest first; `id` breaks ties deterministically).
- Reserved for the future: `sort=oldest|alpha|updated` query param. The filter/adjacency functions take an `order` argument internally so adding sorts later doesn't change call sites, but only `newest` is implemented.

## 12. Pagination

- Page size: **20** (`PAGE_SIZE` constant in `domain/constants.ts`).
- The list hook keeps `visibleCount` (initially 20). It live-queries the first `visibleCount + 1` matching cards from IndexedDB in order. `hasMore = results.length > visibleCount`; rendered items = first `visibleCount`.
- "Load more" increments `visibleCount` by 20 — items are **appended**; existing items stay in place.
- "Load more" is rendered only when `hasMore`; while loading the button shows a spinner and is disabled.
- **Decision:** because all reads hit the local mirror, a growing window over the ordered index is simpler than cursor pages, stays correct when cards are added/removed (live query), and yields exactly the "append 20" behavior.
- Filter or search change → `visibleCount` resets to 20.
- Returning to the list from a card (Back) restores `visibleCount` and scroll position: both are stored in `sessionStorage` keyed by the canonical query string (scroll saved when a card is opened, re-applied after the first local read on Back — D36); other pages use React Router's `<ScrollRestoration />`.
- Queries use the Dexie compound index `[created_at+id]` iterated in reverse with a filter predicate for status/category/search.

## 13. Previous/next navigation

- The list links each card as `/cards/:id?<same query as the list>` (e.g. `/cards/42?status=learning&category=law`). The detail page reads that query as its **context**. Direct links without a query → context "All cards".
- Ordering is the list ordering: `created_at DESC, id DESC`.
  - **Previous** = the nearest card *above* in the list (newer): smallest `(created_at, id)` greater than the current one that matches the context.
  - **Next** = the nearest card *below* (older): largest `(created_at, id)` smaller than the current one that matches the context.
- Implemented as keyset neighbour queries on `[created_at+id]` (`above(...)` / `below(...).reverse()`) with the same filter predicate as the list — pure predicate shared via `domain/cardFilter.ts`.
- Works even if the current card no longer matches the context (e.g. it was just marked learned while browsing `Learning`): neighbours are computed from its position.
- Controls: `← evidence` (previous) and `contract →` (next) — arrow + neighbour title, truncated to one line. Missing neighbour → control rendered disabled (keeps layout stable) with `aria-disabled`.
- Navigating prev/next uses `replace: true` so the browser Back button returns to the list, not through every visited card. The query (context) is preserved.
- Keyboard (desktop): `←` / `→` keys trigger prev/next when focus is not in an input.

## 14. Offline-first behavior

- **IndexedDB is the app's working database.** Every screen reads from Dexie via live queries. Supabase is reached only by the sync service (and auth).
- After the first successful sync on a device, **all** non-deleted cards and categories are mirrored locally (full mirror — decision: a personal collection is small, and a full mirror makes filtering, search, pagination and prev/next trivial and identical offline/online).
- Writes are local-first: one Dexie transaction updates the row and enqueues an outbox operation; UI updates instantly.
- App shell (HTML/JS/CSS/icons) is precached by the service worker, so the installed app launches offline.
- Offline capabilities:
  | Works offline | Needs network |
  |---|---|
  | Browse, filter, search, paginate, prev/next | Sign in |
  | Create, edit, delete cards; change status | Upload/download audio |
  | Record audio (stored locally) | Sync |
  | Category CRUD | Playing audio never played/cached on this device |
- First launch on a new device requires network (sign in + initial pull). Until the initial pull finishes, the list shows a loading state "Loading your cards…" rather than an empty state.

## 15. Synchronization strategy

### 15.1 Overview

```
 local write ─▶ Dexie row + outbox entry (same transaction)
                          │
 triggers ──▶ syncService.sync()  (single-flight)
                 1. push: process outbox FIFO
                 2. pull: delta by server_updated_at per table
```

Triggers: after sign-in / app start with session; `online` event; `visibilitychange` → visible; 2 s after the last local write (debounced); "Sync now" menu item; every 5 min while visible and online.

### 15.2 Outbox

Dexie table `outbox`: `{ id (auto-increment), entity: 'category'|'card'|'audio', op: 'upsert'|'delete'|'upload', entity_id: string /* id or storage path */, created_at, attempts, last_error? }`.

- Payload for `upsert` is read from the current local row at push time — consecutive edits of one row coalesce (enqueue skips if an identical pending `entity+op+entity_id` exists).
- Processing order is by **phase**, FIFO within a phase: categories → audio uploads → card upserts (incl. tombstones) → audio deletes. This preserves dependencies (category before the card that uses it; audio upload before card upsert; card upsert before old-audio delete) even when coalescing keeps an older entry for an edited row (D27).
- An `audio:delete` entry whose `entity_id` ends in `/` (`<user_id>/<card_id>/`) removes every object in that folder (card deletion, §10.3).
- After a successful upsert the entry is removed and the server row written back **only if** the local row's `updated_at` is unchanged; if the user edited the row while the request was in flight, the entry stays and is pushed again (D28).
- A new edit of a row whose entry has failed re-arms that entry (`attempts = 0`).
- On success the entry is removed. On network error: stop the push loop (retry next trigger). On a server rejection (constraint/RLS error): increment `attempts`, store `last_error`, continue with the next entry; after 5 attempts the entry is shown as failed in the sync status panel with "Retry" / "Discard".

### 15.3 Push

- Card/category upsert: `upsert(row, { onConflict: 'id' }).select(columns)`. The returned row (server truth, incl. `server_updated_at` and any trigger adjustments such as category → Other) is written back locally.
- If the server **skipped** the update because it is stale (LWW trigger returns no row), the client fetches the row by id and overwrites the local copy.
- Deletes are pushed as upserts of the tombstone (`deleted_at` set).

### 15.4 Pull

- Per table, cursor `last_pulled_at` in Dexie `meta`. Query: `server_updated_at > cursor - 60 s` (overlap protects against commit-order races), ordered by `server_updated_at`, pages of 500 until fewer are returned. New cursor = max `server_updated_at` seen.
- For each remote row:
  - local row has a pending outbox entry → **keep local** (it will be pushed; the server decides via LWW).
  - otherwise → **remote wins**: write it locally (recompute `_search`); if `deleted_at` is set → delete locally (cards: also delete cached audio blobs; categories: reassign local cards to `Other`).
- Pull order: categories, then cards.

### 15.5 Conflict resolution — last-write-wins

- Each row carries client-set `updated_at` (time of the user's edit).
- Server-side trigger on UPDATE: if `NEW.updated_at < OLD.updated_at`, the update is skipped (stale write from another device). Equal or newer → applied.
- Effect: whichever device edited the row last (by device clock) wins, at row granularity. Acceptable for a single user; device clocks are assumed roughly correct.
- Server-initiated adjustments (category deletion reassigning cards) do **not** change `updated_at`, so they never overwrite the user's own later edits; they only bump `server_updated_at` so other devices pull them.
- Category name collision between devices (both create "Idioms" offline) → second push violates the unique index → entry fails; the client renames the local one to `Idioms (2)` and retries automatically once.

### 15.6 Sync status UI

Header indicator / menu item: `Synced · 2 min ago`, `Syncing…`, `3 changes pending`, `Offline — 3 changes pending`, `Sync error` (opens a small panel listing failed entries).

## 16. Data model

### 16.1 Domain types (`src/domain/types.ts`)

```ts
export type CardStatus = 'learning' | 'learned';

export type Category = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  is_system: boolean;
  created_at: string;        // ISO-8601 UTC, ms precision, 'Z'
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string | null; // null until first synced
};

export type Card = {
  id: string;
  user_id: string;
  title: string;
  notes: RichText | null;       // { type: 'doc', content: RichNode[] } — Tiptap JSON (D42)
  category_id: string;
  status: CardStatus;
  audio_path: string | null;
  learned_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string | null;
};

export type CardFilter = {
  status?: CardStatus;
  categorySlug?: string;
  q?: string;
};
```

All timestamps are normalized with `new Date(x).toISOString()` when read from Supabase, so string comparison in IndexedDB indexes equals chronological order.

### 16.2 IndexedDB (Dexie) schema — version 2

Database name: `gapper`.

| Table | Primary key & indexes | Contents |
|---|---|---|
| `cards` | `id, [created_at+id], status, category_id` | `Card` + local-only `_search: string` |
| `categories` | `id, slug` | `Category` |
| `audio_blobs` | `path, card_id` | `{ path, card_id, blob: Blob, mime, uploaded: 0\|1, created_at }` |
| `outbox` | `++id, [entity+entity_id]` | §15.2 |
| `meta` | `key` | `{ key, value }` — `user_id`, `cards_cursor`, `categories_cursor`, `last_sync_at`, `initial_sync_done` |

Version 2 (no index change) merges the v1 fields `translation`, `example_sentence`, `example_sentence_translation` into `notes` on upgrade (one paragraph per line, like the SQL migration) and recomputes `_search`.

Locally, soft-deleted rows are kept only until their tombstone is pushed, then removed. All queries exclude `deleted_at != null`.

### 16.3 Relationships

```
auth.users 1 ──< categories 1 ──< vocabulary_cards
auth.users 1 ──< vocabulary_cards
vocabulary_cards 1 ── 0..1 audio object (storage: audio/<user_id>/<card_id>/<recording_id>.<ext>)
```

## 17. Supabase schema

Delivered as migrations in `supabase/migrations/` (step 2). The SQL below is normative; the migration may split it into several files.

```sql
-- 001: tables -------------------------------------------------------------

create table public.categories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  slug              text not null check (slug <> '' and slug = lower(slug) and slug !~ '\s'),
  is_system         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id)                                   -- target of the composite FK
);

create unique index categories_user_name_uq  on public.categories (user_id, lower(name)) where deleted_at is null;
create unique index categories_user_slug_uq  on public.categories (user_id, slug)        where deleted_at is null;
create unique index categories_user_system_uq on public.categories (user_id)             where is_system;
create index categories_user_sync_idx        on public.categories (user_id, server_updated_at);

create table public.vocabulary_cards (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title                         text not null check (char_length(btrim(title)) between 1 and 200),
  notes                         jsonb,  -- migration 20261005160000 (D42), replaced translation/example columns
  category_id                   uuid not null,
  status                        text not null default 'learning' check (status in ('learning', 'learned')),
  audio_path                    text,
  learned_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  deleted_at                    timestamptz,
  server_updated_at             timestamptz not null default now(),
  constraint cards_category_fk foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete restrict,
  constraint cards_learned_at_ck check ((status = 'learned') = (learned_at is not null)),
  constraint cards_notes_ck check (notes is null or (jsonb_typeof(notes) = 'object'
    and notes ->> 'type' = 'doc' and octet_length(notes::text) <= 100000)),
  constraint cards_audio_path_ck check (
    audio_path is null or audio_path like (user_id::text || '/' || id::text || '/%')
  )
);

create index cards_user_sync_idx on public.vocabulary_cards (user_id, server_updated_at);
create index cards_category_idx  on public.vocabulary_cards (category_id);
```

**Decision — `status` as `text` + CHECK, not a Postgres enum:** same integrity, trivially extended (`alter … drop/add constraint`) without enum migration pain, maps 1:1 to a TS string union.

**Decision — composite FK `(category_id, user_id)`:** guarantees a card can only reference its owner's categories, independent of RLS.

```sql
-- 002: triggers & functions ------------------------------------------------

-- server_updated_at maintained by the server only
create or replace function public.touch_server_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

-- last-write-wins: skip stale updates
create or replace function public.skip_stale_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end $$;

-- cards: missing or deleted category -> user's Other
create or replace function public.cards_resolve_category()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.category_id is null or not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id and c.deleted_at is null
  ) then
    select c.id into new.category_id
    from public.categories c
    where c.user_id = new.user_id and c.is_system;
  end if;
  return new;
end $$;

-- categories: protect Other, forbid promoting to system
create or replace function public.categories_protect_system()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.is_system and (
       new.name is distinct from old.name or new.slug is distinct from old.slug
       or new.deleted_at is not null or not new.is_system) then
    raise exception 'The "Other" category cannot be renamed or deleted' using errcode = 'check_violation';
  end if;
  if not old.is_system and new.is_system then
    raise exception 'Cannot promote a category to system' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- categories: on soft delete move cards to Other (updated_at intentionally untouched)
create or replace function public.categories_reassign_cards()
returns trigger language plpgsql set search_path = '' as $$
declare v_other uuid;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    select c.id into v_other from public.categories c where c.user_id = new.user_id and c.is_system;
    update public.vocabulary_cards
       set category_id = v_other
     where category_id = new.id and user_id = new.user_id;
  end if;
  return null;
end $$;

-- Triggers fire in alphabetical order per timing: a_ (LWW) before b_ before z_.
create trigger a_skip_stale   before update on public.categories       for each row execute function public.skip_stale_update();
create trigger b_protect      before update on public.categories       for each row execute function public.categories_protect_system();
create trigger z_touch        before insert or update on public.categories for each row execute function public.touch_server_updated_at();
create trigger reassign_cards after update on public.categories        for each row execute function public.categories_reassign_cards();

create trigger a_skip_stale   before update on public.vocabulary_cards for each row execute function public.skip_stale_update();
create trigger b_category     before insert or update on public.vocabulary_cards for each row execute function public.cards_resolve_category();
create trigger z_touch        before insert or update on public.vocabulary_cards for each row execute function public.touch_server_updated_at();

-- 003: seeding ---------------------------------------------------------------

create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories (user_id, name, slug, is_system) values
    (p_user_id, 'Other',      'other',      true),
    (p_user_id, 'Everyday',   'everyday',   false),
    (p_user_id, 'Work',       'work',       false),
    (p_user_id, 'Law',        'law',        false),
    (p_user_id, 'Finance',    'finance',    false),
    (p_user_id, 'Technology', 'technology', false),
    (p_user_id, 'Travel',     'travel',     false),
    (p_user_id, 'Food',       'food',       false),
    (p_user_id, 'Health',     'health',     false),
    (p_user_id, 'Education',  'education',  false)
  on conflict do nothing;
end $$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- backfill users created before this migration
select public.seed_default_categories(u.id)
from auth.users u
where not exists (select 1 from public.categories c where c.user_id = u.id);
```

Notes:
- The client always sends `id`, `created_at`, `updated_at`; DB defaults are a safety net.
- No `DELETE` is ever issued by the client for these tables (soft delete only). Tombstone purging is a future maintenance task.

## 18. RLS policies

```sql
alter table public.categories       enable row level security;
alter table public.vocabulary_cards enable row level security;

-- explicit least-privilege grants (do not rely on project default privileges); no DELETE
revoke all on public.categories, public.vocabulary_cards from anon, authenticated;
grant select, insert, update on public.categories, public.vocabulary_cards to authenticated;

-- categories
create policy categories_select on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()) and is_system = false);
create policy categories_update on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- no delete policy: hard deletes impossible

-- vocabulary_cards
create policy cards_select on public.vocabulary_cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy cards_insert on public.vocabulary_cards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy cards_update on public.vocabulary_cards
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- no delete policy: soft delete only
```

- `(select auth.uid())` is the initPlan-cached form recommended by Supabase for performance.
- No `SECURITY DEFINER` function in `public` is executable by `anon`/`authenticated` (incl. the dashboard's `rls_auto_enable()` event-trigger function); enforced by the pgTAP tests.
- Upsert (`insert … on conflict do update`) requires both insert and update policies — present.
- Triggers that reassign cards run as the invoking user and stay within that user's rows.

## 19. Storage architecture

- Bucket `audio`, **private**, file size limit 5 MB, allowed MIME types `audio/mp4`, `audio/webm`, `audio/ogg`, `audio/mpeg`, `audio/wav`.
- Object key: `<user_id>/<card_id>/<recording_id>.<ext>` (bucket `audio` ⇒ conceptual path `audio/<user_id>/<card_id>/<file>`). A new `recording_id` per recording avoids stale caches and makes replacement atomic.
- Old objects are deleted after the card referencing the new one is synced (§10.3). If deletion fails it is retried via the outbox; an orphan file is harmless.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 5242880,
        array['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

create policy audio_select on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_update on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audio_delete on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

## 20. Frontend architecture

### 20.1 Stack

| Concern | Choice |
|---|---|
| Runtime | Node 24 LTS (dev/build only) |
| Build | Vite, TypeScript (strict) |
| UI | React 19, Tailwind CSS v4 (`@tailwindcss/vite`) |
| Routing | React Router v8 (`react-router`), data router (`createBrowserRouter`) in library mode |
| Local DB | Dexie 4 + `dexie-react-hooks` |
| Backend SDK | `@supabase/supabase-js` v2 |
| Rich text | Tiptap 3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`), notes editor only, lazy-loaded chunk (D43) |
| PWA | `vite-plugin-pwa` (Workbox `generateSW`) |
| Tests | Vitest, React Testing Library, `@testing-library/user-event`, jsdom, `fake-indexeddb`, Playwright |
| Quality | ESLint (flat config, typescript-eslint, react-hooks, jsx-a11y), Prettier |

No state-management library, no UI kit, no form library (the notes editor is the one rich-text exception), no data-fetching library (Dexie live queries replace them). Icons: inline SVG components (no icon package) unless more than ~15 icons are needed.

### 20.2 Layers

```
pages / components   ─ UI, no data access
hooks                ─ useCardList, useCard, useAdjacentCards, useCategories, useAudioRecorder,
                       useAudioPlayback, useSyncStatus, useOnlineStatus, useAuth
services             ─ cardService, categoryService, audioService (validation, defaults, use-cases)
repositories/local   ─ Dexie access (cards, categories, audio_blobs, outbox, meta)
sync                 ─ syncService (push/pull/LWW), triggers, status store
repositories/remote  ─ Supabase table/storage wrappers used only by sync
auth                 ─ authService + AuthProvider (Supabase Auth)
lib                  ─ supabase client, env validation
domain               ─ types, constants, pure functions (filters, slugify, search normalization, validation)
```

Rules: see `docs/conventions/architecture.md`. UI never imports Supabase or Dexie.

### 20.3 Key service contracts (indicative)

```ts
// services/cardService.ts
// CardInput = { title; notes?: RichText | null; category_id?: string | null;
//               status?: CardStatus }  (status ignored on create)
createCard(input: CardInput, audio?: RecordedAudio): Promise<Card>
updateCard(id: string, patch: CardInput, audio?: AudioChange): Promise<Card>
setStatus(id: string, status: CardStatus): Promise<Card>
deleteCard(id: string): Promise<void>

// services/categoryService.ts
createCategory(name: string): Promise<Category>
renameCategory(id: string, name: string): Promise<Category>
deleteCategory(id: string): Promise<void>   // reassigns cards to Other locally

// repositories/local/cardsLocalRepo.ts
listCards(filter: CardFilter, limit: number): Promise<Card[]>          // ordered, limit+1 by caller
getAdjacent(id: string, filter: CardFilter): Promise<{ prev: Card | null; next: Card | null }>

// sync/syncService.ts
sync(): Promise<SyncResult>   // single-flight
```

`AudioChange = { kind: 'keep' } | { kind: 'replace'; audio: RecordedAudio } | { kind: 'remove' }`.

### 20.4 Directory structure

```
gapper/
  CLAUDE.md
  docs/                      SPEC.md, decisions.md, conventions/
  work/                      active/, archive/
  public/                    favicon.svg, pwa-192x192.png, pwa-512x512.png, maskable-512x512.png,
                             apple-touch-icon-180x180.png
  src/
    main.tsx
    app/                     App.tsx, router.tsx, RequireAuth.tsx, AppLayout.tsx, providers
    pages/                   LoginPage, CardListPage, CardDetailPage, CardFormPage, CategoriesPage, NotFoundPage
    components/ui/           Button, TextField, Select, RichTextView, Sheet, Spinner, EmptyState, ErrorState, Banner
    features/cards/          CardListItem, FilterSheet, SearchBar, CardForm, NotesEditor, AdjacentNav, StatusToggle
    features/audio/          AudioRecorder, AudioPlayer
    features/categories/     CategoryRow, CategoryForm
    hooks/
    services/
    repositories/local/  repositories/remote/
    sync/  db/  auth/  domain/  lib/  styles/  test/
  supabase/migrations/
  e2e/
  .github/workflows/deploy.yml
  docker-compose.yml  Dockerfile.dev (if needed)  .env.example
  vite.config.ts  tsconfig*.json  eslint.config.js  .prettierrc  index.html  package.json
```

## 21. Routing

- `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })` with `<ScrollRestoration />` in the root layout.
- Vite `base` = `process.env.BASE_PATH ?? '/gapper/'` — same in dev and prod so URLs are identical (`http://localhost:5173/gapper/cards`).
- Route table: §6. Protected routes are children of a `RequireAuth` layout route.
- **GitHub Pages SPA limitation:** Pages has no rewrite rules; a deep link like `/gapper/cards/abc` would 404.
  - **Strategy:** the build copies `dist/index.html` to `dist/404.html` (small Vite plugin or `postbuild` script). Pages serves `404.html` for unknown paths; the SPA boots and the router renders the correct page (HTTP status is 404, irrelevant for a private app without SEO).
  - In the installed PWA, the service worker's `navigateFallback: 'index.html'` serves the shell for every in-scope navigation, so deep links work offline and without hitting Pages at all.
  - **Decision:** `BrowserRouter`-style clean URLs + 404 fallback, rather than `HashRouter` (cleaner URLs, same reliability for this use).
- `redirect` query on `/login` accepts only paths starting with `/` and not `//`.

## 22. PWA requirements

`vite-plugin-pwa` config (indicative):

```ts
VitePWA({
  registerType: 'prompt',            // show "New version available · Reload" toast
  includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'Gapper — Vocabulary',
    short_name: 'Gapper',
    description: 'Personal vocabulary cards',
    lang: 'en',
    start_url: '/gapper/cards',
    scope: '/gapper/',
    id: '/gapper/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    globIgnores: ['404.html'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    // no runtimeCaching for Supabase: data goes through IndexedDB, audio through audio_blobs
  },
})
```

`start_url`/`scope`/`id` are derived from `base` in code, not hard-coded twice.

`index.html` head:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Gapper" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/gapper/apple-touch-icon-180x180.png" />  <!-- via %BASE_URL% -->
<link rel="icon" href="/gapper/favicon.svg" type="image/svg+xml" />
```

- Icons generated from one source SVG with `@vite-pwa/assets-generator` (dev dependency, run once; outputs committed to `public/`).
- iOS splash screens: not in MVP (white launch screen is acceptable).
- Requirements: Lighthouse "installable" passes; app launches from Home Screen without Safari UI; works offline after first load; portrait-first layout.
- Update flow: when a new SW is waiting, show toast; "Reload" calls `updateSW(true)`. Never auto-reload while a form has unsaved changes.

## 23. Docker development environment

Docker is for **local development only**; production is static files on GitHub Pages.

- `docker-compose.yml`, service `web`:
  - image `node:24-bookworm-slim` (Debian base for easier native deps/Playwright compatibility);
  - `working_dir: /app`; bind mount `.:/app`; **named volume** for `/app/node_modules` (avoids macOS/Linux binary mismatch);
  - `ports: ["5173:5173"]`; command `npm run dev -- --host 0.0.0.0`;
  - `env_file: .env` (optional: true);
  - `CHOKIDAR_USEPOLLING`/Vite `server.watch.usePolling` enabled only if file watching proves unreliable.
- Commands:
  ```bash
  docker compose run --rm web npm ci        # install deps into the volume
  docker compose up                          # dev server → http://localhost:5173/gapper/
  docker compose exec web npm run lint
  docker compose exec web npm run typecheck
  docker compose exec web npm run test
  docker compose exec web npm run build
  ```
- Cloud Supabase is used in development (no local Supabase stack).
- **Testing on a real iPhone:** microphone, service worker and install require HTTPS (localhost excepted). Options: (a) test on the GitHub Pages deployment (preferred), or (b) a temporary HTTPS tunnel. LAN `http://` will not allow recording.

### Environment variables

`.env.example` (committed):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# optional, defaults to /gapper/
# BASE_PATH=/gapper/
```

`.env` is git-ignored. `src/lib/env.ts` validates the two `VITE_` vars at startup and shows a clear configuration error screen if missing.

## 24. GitHub Pages deployment

- Source in `main`; `dist/` is never committed.
- Repository Settings → Pages → Source: **GitHub Actions**.
- Repository **variables** (Settings → Secrets and variables → Actions → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public values; secrets would also work).
- `.github/workflows/deploy.yml`:
  - triggers: `push` to `main`, `workflow_dispatch`;
  - permissions: `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`;
  - job `build`: `actions/checkout` → `actions/setup-node` (node 24, npm cache) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` (env from repo variables) → `actions/configure-pages` → `actions/upload-pages-artifact` (`dist`);
  - job `deploy`: `actions/deploy-pages`, environment `github-pages`.
- Result URL: `https://<github-user>.github.io/gapper/`.
- Supabase Auth → URL Configuration: set Site URL to the Pages URL (used only by email links; harmless).
- **Supabase Free tier pauses projects after ~7 days of inactivity.** Mitigation (step 12): an optional scheduled GitHub Action (e.g. every 3 days) that performs a lightweight unauthenticated request with the publishable key (e.g. a REST `select` that RLS answers with zero rows). Verify against current Supabase inactivity rules when implementing. The offline-first design keeps the app readable even if the project is paused; the owner can restore it from the dashboard.

## 25. Error, loading, empty states

| Screen | Loading | Empty | Error | Offline |
|---|---|---|---|---|
| App start | splash (logo + spinner) | — | config error screen if env missing | opens with cached session & data |
| Login | button spinner, inputs disabled | — | inline error under form (`role="alert"`) | "You're offline. Signing in requires a connection." |
| Card list (first device sync) | "Loading your cards…" skeleton | — | "Couldn't load your cards." + Retry | if no local data: "You're offline. Connect to load your cards." |
| Card list | skeleton (only before first local read) | All: "No cards yet." + "Add your first card"; Learning: "No learning cards yet."; Learned: "No learned cards yet."; Category: "No cards in this category."; Search: "No cards match “x”."; unknown slug: "Category not found." + "Show all cards" | — (local reads) | banner only |
| Load more | button spinner | button hidden when no more | — | works (local) |
| Card detail | skeleton | "Card not found." + back to list (deleted/unknown id) | — | audio: "Audio unavailable offline" |
| Card form | Save spinner, disabled | — | field errors; "Couldn't save." | saves locally; banner explains sync later |
| Audio recorder | "Allow microphone access…" | — | denied: "Microphone access is blocked. Enable it in Settings → Safari → Microphone." unsupported: "Recording isn't supported in this browser." | recording works offline |
| Categories | skeleton | only Other → "Create categories to organize your cards." | inline validation | works (local) |
| Sync | header "Syncing…" | — | "Sync error" panel with failed items, Retry/Discard | "Offline — N changes pending" |

No screen is ever blank. Async status messages use `aria-live="polite"`.

## 26. Security

- RLS enabled on every public table; policies restricted to `authenticated` and `auth.uid()` (§18). No DELETE policies.
- Storage bucket private; policies restrict to the user's folder (§19).
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the frontend. The secret/service-role key is never used by this project.
- Public sign-ups disabled in Supabase; no sign-up code path.
- `security definer` functions use `set search_path = ''` and are not executable by clients.
- `.env` git-ignored; `.env.example` holds placeholders only.
- Logout deletes the local database (§9).
- Login `redirect` param restricted to same-app paths (no open redirect).
- No `dangerouslySetInnerHTML`; user content rendered as text. Rich-text notes are rendered from their JSON as React elements (`RichTextView`, D42).
- Content Security Policy: GitHub Pages cannot set headers; a `<meta http-equiv="Content-Security-Policy">` restricting `connect-src` to `'self'` and the Supabase project URL is added in step 11 if it doesn't break the SW/Vite build.
- Dependencies kept minimal; `npm audit` reviewed when adding packages.

## 27. Testing

See `docs/conventions/testing.md` for rules. Coverage priorities:

| # | Test | Type |
|---|---|---|
| T1 | `cardFilter` parse/serialize/canonicalize, invalid values | unit |
| T2 | list query: ordering, filters, search, `visibleCount + 1` / `hasMore` | integration (fake-indexeddb) |
| T3 | adjacency: prev/next within context, edges, current card not matching | integration |
| T4 | cardService: default Other, default learning, trimming → null, validation, `learned_at` rules | unit |
| T5 | categoryService: unique names, slugify, delete reassigns to Other, Other protected | unit/integration |
| T6 | syncService: push order, coalescing, write-back, stale skip → refetch, pull cursor/overlap, remote wins unless pending, tombstones, retry/backoff | integration (fake remote) |
| T7 | useAudioRecorder: state machine, mime selection, 60 s auto-stop, track cleanup, denied | unit (mocked MediaRecorder/getUserMedia) |
| T8 | LoginPage + RequireAuth redirects | component |
| T9 | CardListPage: renders 20, Load more appends, empty states per filter | component |
| T10 | E2E: login → create card w/o category (→ Other) → list → detail → mark learned → filter Learned → next/prev | Playwright |
| T11 | SQL: migration applies cleanly; manual checklist for RLS (other user can't read), Other protection, category delete reassign | manual (step 2), documented |

## 28. MVP scope

**In MVP:** everything in §5 FR-1…FR-14, search (§11.3), sync status UI, update toast, card delete, duplicate-title hint, keyboard prev/next on desktop, Supabase keep-alive workflow (optional, step 12).

**Not in MVP:** see §29.

Implementation order: `work/active/001-vocabulary-pwa-mvp/plan.md`.

## 29. Future improvements

- Additional sorts (`oldest`, `alpha`, `updated`) via `sort` param.
- Spaced repetition / review mode (flashcards, swipe), learn history (`card_events`).
- "Download all audio for offline use"; audio cache eviction.
- Swipe gestures for prev/next on detail page.
- Inline "New category…" option in the card form.
- Import/export (CSV/JSON backup).
- Statistics (cards per week, learned count).
- iOS splash screens; dark-mode tuned icons.
- Server-side search (`pg_trgm`) if the collection becomes very large.
- Tombstone purge job.
- Text-to-speech fallback when no personal recording exists.

## 30. Acceptance criteria

Format: Given / When / Then. "Owner" = the signed-in single user. Unless stated, the device is online.

### Authentication
- **AC-1** Given no session, when the owner opens `/gapper/cards`, then they are redirected to `/gapper/login?redirect=%2Fcards`.
- **AC-2** Given the login page, when valid credentials are submitted, then the owner lands on `/cards` (or the `redirect` target) and default categories exist.
- **AC-3** Given the login page, when wrong credentials are submitted, then "Incorrect email or password." is shown and the owner stays on `/login`.
- **AC-4** Given a session, when the owner opens `/login`, then they are redirected to `/cards`.
- **AC-5** The app contains no sign-up link, page or call; `auth.signUp` does not appear in the codebase; Supabase sign-ups are disabled.
- **AC-6** Given unsynced changes, when the owner taps Sign out, then a confirmation states the number of changes; after confirming, local data is cleared and `/login` is shown.

### Card list & pagination
- **AC-7** Given 35 cards, when `/cards` opens, then the 20 newest cards are displayed in `created_at DESC` order and "Load more" is visible.
- **AC-8** Given AC-7, when "Load more" is pressed, then the remaining 15 cards are appended below the first 20 (which stay unchanged) and "Load more" disappears.
- **AC-9** Given exactly 20 matching cards, then "Load more" is not shown.
- **AC-10** Given 0 cards, then "No cards yet." with an "Add your first card" action is shown.
- **AC-11** Each list item shows title, category and status; tapping the title opens `/cards/<id>` with the list's query preserved.
- **AC-12** Given the owner loaded 40 cards and opened card #30, when they go Back, then the list shows at least those 40 cards and the scroll position is restored.

### Filtering & search
- **AC-13** When the owner selects Learning in the filter sheet, then the URL becomes `/cards?status=learning` and only learning cards are listed.
- **AC-14** When the owner then selects category Law, then the URL becomes `/cards?status=learning&category=law` and only learning cards in Law are listed; the header shows "Learning · Law".
- **AC-15** Given 25 cards in Learning + Law among 60 cards, when that filter is active, then 20 are shown and Load more appends exactly the remaining 5 Learning + Law cards.
- **AC-16** Opening a bookmarked `/cards?status=learned&category=law` directly shows the same filtered list.
- **AC-17** Given `/cards?category=unknown-slug`, then "Category not found." with "Show all cards" is shown.
- **AC-18** Given Learned filter with no learned cards, then "No learned cards yet." is shown.
- **AC-19** When the owner types "proof" in search, then within ~300 ms the URL contains `q=proof` and only cards whose title or notes contain "proof" (case/diacritics-insensitive) are listed, combined with active filters.

### Create card
- **AC-20** When the owner saves a card with only title "abandon", then it is saved with category `Other`, status `learning`, `learned_at` null, and appears first in `/cards`.
- **AC-21** When the owner submits with an empty title, then "Title is required." is shown and nothing is saved.
- **AC-22** Given the owner is on `/cards?category=law`, when they tap +, then the form opens with category Law preselected.
- **AC-23** Given a card "abandon" exists, when the owner types "Abandon" as a new title, then a non-blocking hint links to the existing card; saving is still allowed.
- **AC-24** "Save & add another" saves the card and resets the form, keeping the selected category.

### Status
- **AC-25** Given a learning card, when the owner taps "Mark as learned" on its detail page, then status becomes `learned`, `learned_at` is set, the pill updates immediately, and the card appears under the Learned filter.
- **AC-26** Given a learned card, when moved to learning, then `learned_at` becomes null and the card appears under the Learning filter.
- **AC-27** Changing status never changes the card's position in the newest-first ordering.

### Detail & prev/next
- **AC-28** The detail page shows title, formatted notes, category, status, audio player (if audio) and created date, in that visual priority.
- **AC-29** Given the owner is viewing `/cards?status=learning&category=law` and opens a card, when they press Next, then the next (older) card that is Learning **and** Law opens, and the URL keeps `?status=learning&category=law`.
- **AC-30** Given the first card of a context, then the Previous control is disabled; given the last card, Next is disabled.
- **AC-31** The controls show the neighbour titles, e.g. `← evidence` and `contract →`.
- **AC-32** After pressing Next three times, browser Back returns to the list (not to previous cards).
- **AC-33** Given a card opened without query (direct link), prev/next navigate through all cards.
- **AC-34** Given the owner marks the current card learned while in the Learning context, then Next still opens the next Learning card after it.

### Edit & delete
- **AC-35** When the owner edits the notes and saves, then the detail page shows the new value and `updated_at` changes; `created_at` does not.
- **AC-36** When the owner clears the category select and saves, then the card belongs to `Other`.
- **AC-37** When the owner deletes a card and confirms, then it disappears from all lists and adjacency immediately; after sync its row has `deleted_at` set on the server and its audio objects are removed from Storage.

### Audio
- **AC-38** When the owner taps Record, allows the microphone, speaks, taps Stop, then a preview player plays the recording; "Re-record" discards it and starts again.
- **AC-39** When a card with a recording is saved online, then within one sync the file exists at `audio/<user_id>/<card_id>/<recording_id>.<ext>` and the card's `audio_path` points to it.
- **AC-40** When the owner replaces a recording and the card syncs, then the old object is deleted from Storage.
- **AC-41** Recording stops automatically at 60 s.
- **AC-42** Given microphone permission is denied, then an explanatory message is shown and the card can still be saved without audio.
- **AC-43** Given a recording was played once on a device, when the device is offline, then it still plays.

### Categories
- **AC-44** After the owner account is created, then exactly these categories exist: Everyday, Work, Law, Finance, Technology, Travel, Food, Health, Education, Other.
- **AC-45** When the owner creates "Idioms", then it appears in `/categories`, in the filter sheet and in the card form, with slug `idioms`.
- **AC-46** When the owner creates or renames a category to an existing name (any case), then "A category with this name already exists." is shown.
- **AC-47** Given "Law" has 7 cards, when the owner deletes Law and confirms, then Law disappears and all 7 cards belong to Other (locally immediately; on the server after sync).
- **AC-48** `Other` has no rename/delete actions in the UI; a direct API attempt to rename/delete it fails.
- **AC-49** `/categories` shows the number of cards per category.

### Offline & sync
- **AC-50** Given cards were synced, when the device goes offline and the installed app is relaunched, then the app shell loads and the list, filters, search and detail pages work with local data; the offline banner is shown.
- **AC-51** Given offline, when the owner creates a card with audio and edits another, then both appear immediately with a pending indicator; when connectivity returns, they sync without user action and the pending indicator clears.
- **AC-52** Given a card edited on device A at 10:00 and on device B (offline) at 10:05, when both sync, then the 10:05 version is the final state on both devices.
- **AC-53** Given device B has a stale pending edit (10:00) and the server has 10:05, when B pushes, then the server keeps 10:05 and B's local copy is replaced by it.
- **AC-54** Given a category deleted on device A, when device B syncs, then B no longer shows the category and its cards show Other.

### Security
- **AC-55** With the publishable key and no session, REST requests to `vocabulary_cards`/`categories` return no rows, and Storage downloads from `audio` are denied.
- **AC-56** The built `dist/` contains no secret/service-role key (`grep` check in CI or manual).
- **AC-57** A second (test) user cannot read or write the owner's rows or audio files (manual RLS check in step 2, then delete the test user).

### PWA & deployment
- **AC-58** On iPhone Safari, "Add to Home Screen" installs "Gapper" with its icon; launching it opens standalone (no Safari UI) at `/gapper/cards`.
- **AC-59** A push to `main` triggers the workflow; lint, typecheck, tests and build pass; the site is published at `https://<user>.github.io/gapper/`.
- **AC-60** Opening `https://<user>.github.io/gapper/cards/<id>?status=learning` directly (cold, not installed) renders the card detail page.
- **AC-61** After a new deployment, the installed app shows "New version available · Reload"; reloading activates the new version.
