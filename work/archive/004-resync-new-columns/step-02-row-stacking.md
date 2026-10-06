# Step 02 — List delete buttons over the header menu

Status: done
Spec: docs/SPEC.md §7.4 (D62)

## Goal
The ⋯ menu (and the sticky header while scrolling) covers the list rows' trash buttons.

## Notes
- Cause: the trash button has `relative z-10` to sit above the row link. The sticky header is
  `z-10` too and is a stacking context, so its menu's `z-20` counts as `z-10` at page level;
  later rows win the tie and paint over the menu.
- Fix: `isolate` on the `<li>` (new stacking context per row). No visual change inside the row.

## Tasks
- [x] `src/features/cards/CardListItem.tsx`: `isolate` + comment

## User actions
- [x] Owner accepted (2026-10-06). Open ⋯ over the list (localhost / Pages after deploy): no trash icons through the menu;
      scroll: the header covers the rows.

## Verification
- [x] npm run lint / typecheck / test (287 passed) / build / format:check — green (Docker)
- [x] Owner accepted (jsdom can't check painting order)
