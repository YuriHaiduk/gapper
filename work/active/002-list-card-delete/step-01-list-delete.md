# Step 01 — Delete icon in the list row

Status: done (👤 iPhone check after the next deploy)
Spec: docs/SPEC.md §7.3 (delete), §7.4 (list item)

## Goal
Delete a card straight from `/cards`: trash icon under the status pill, same confirmation as the edit page.

## Scope
- In: `CardListItem` layout + button, `CardListPage` handler/error, `TrashIcon`, tests, SPEC §7.4, D62.
- Out: undo, swipe-to-delete, bulk delete.

## User actions
- [ ] 👤 After the next deploy: delete a card from the list on the iPhone (tap target, confirm dialog).

## Tasks
- [x] `TrashIcon`
- [x] `CardListItem`: right column = pill + 44 px trash button (above the row link), `aria-label` "Delete “<title>”"
- [x] `CardListPage`: `window.confirm(deleteCardPrompt(title))` → `deleteCard(id)`; failure → "Couldn't save." alert above the list
- [x] Tests: confirm → card gone (+ tombstone + outbox); cancel → kept
- [x] SPEC §7.4, decisions D62

## Files
- `src/components/ui/icons.tsx`, `src/features/cards/CardListItem.tsx`, `src/pages/CardListPage.tsx`, `src/pages/CardListPage.test.tsx`
- `docs/SPEC.md`, `docs/decisions.md`

## Verification
- [x] lint / format:check / typecheck / test (278/278) / build — green

## Notes / decisions
- The outbox gets two entries per delete (tombstone + audio folder delete, D29) — same as the edit page.
- Not checked visually locally (needs a sign-in); layout check is part of the iPhone action.
