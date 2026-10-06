# 004 — Re-pull cards after a new column · Plan

Brief: [brief.md](brief.md) · Spec: [docs/SPEC.md](../../../docs/SPEC.md) §16.2, §15.4 · Protocol: [workflow.md](../../../docs/conventions/workflow.md)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · 👤 needs the owner's action

## Steps

- [~] **01. Dexie v4 resets the cards cursor** — upgrade deletes `cards_cursor` (one full re-pull); rule in data-layer.md; SPEC §16.2 + D65; test. 👤 deploy, then check the types on the Pages site. → [step file](step-01-reset-cards-cursor.md)
- [~] **02. List delete buttons over the header menu** — `isolate` on the list row keeps the trash button's `z-10` inside the row; 👤 check the ⋯ menu over the list. → [step file](step-02-row-stacking.md)

## Backlog
_(none yet)_

## Open questions
_(none yet)_
