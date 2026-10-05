# Step 07a — Notes field (rich text)

Status: done
Spec: docs/SPEC.md §7.1, §7.4–§7.6, §11.3, §16, §17, §20.1, §20.4; AC-28

## Goal
Owner change request: replace `translation`, `example_sentence`, `example_sentence_translation` with one large free-text **Notes** field (examples, translations…) edited with a rich-text editor (bold, italic, bullet and numbered lists).

## Owner decisions (2026-10-05)
- Editor: **Tiptap** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`).
- Existing data: **merge** the three old values into `notes` (one paragraph per line, in field order) and **drop** the old columns.
- Toolbar: bold, italic, bullet list, numbered list, undo/redo only.

## Scope
- In: migration, pgTAP, domain `RichText` + pure helpers, Dexie v2 upgrade, remote columns, search text, validation (`notes` ≤ 5000 plain-text chars), service, lazy-loaded `NotesEditor`, safe `RichTextView` renderer (no `innerHTML`), list preview line, form, tests, docs.
- Out: detail page (08) — will use `RichTextView`.

## User actions
- [x] None required (migration is pushed to the linked project by Claude after local validation; owner approved merge + drop).

## Tasks
- [x] Install Tiptap; check bundle split
- [x] Domain: `RichText` type, `richTextToPlain`, `plainToRichText`, `normalizeRichText`; validation; search
- [x] Migration `…_card_notes.sql` + pgTAP; validate locally; push to cloud
- [x] Dexie v2 upgrade (merge local rows); remote repo columns; factories
- [x] Service, form (`NotesEditor` lazy), `RichTextView`, list preview
- [x] Tests updated + new; docs (SPEC, D42–D43, conventions)

## Verification
- [x] lint / typecheck / test / build / format:check — all pass (181 tests, 26 files; full suite run 3× without flakes); build: app chunk 681.6 kB / 201 kB gzip (unchanged), `NotesEditor` chunk 396 kB / 125 kB gzip
- [x] Local stack: merge verified on old-schema rows (multi-line, blank and empty fields; `updated_at` kept, `server_updated_at` bumped); pgTAP 54/54 local and linked; `migration list` local = remote (7); advisors: only the known leaked-password warning

## Notes / decisions
- D42 notes = Tiptap JSON in `jsonb` + `cards_notes_ck` (doc type, ≤ 100 kB); D43 Tiptap StarterKit trimmed to the toolbar; editor lazy-loaded.
- Pure helpers in `domain/richText.ts`; `_search` and the list preview use the plain text. `RichTextView` renders JSON as React elements (no `innerHTML`) — ready for the detail page (step 08).
- `NotesEditor` takes `value` as initial content only; the form remounts it (key) on "Save & add another". An empty list counts as no notes (`null`).
- Removed the unused `TextArea` (added in step 07).
- Toolbar buttons `preventDefault` on mousedown so the selection and the iOS keyboard stay.
