# 003 — Card part of speech · Plan

Brief: [brief.md](brief.md) · Spec: [docs/SPEC.md](../../../docs/SPEC.md) §7.1, §7.4–§7.6, §16, §17 · Protocol: [workflow.md](../../../docs/conventions/workflow.md)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · 👤 needs the owner's action

## Steps

- [~] **01. Optional `type` (part of speech) on cards** — migration + CHECK, Dexie v3, remote column, service normalization, form select, detail/list display; SPEC + D63; tests. 👤 `db push` before deploy, iPhone check after. → [step file](step-01-card-type.md)
- [x] **02. English dates** — detail page dates always `en-GB` medium (`6 Oct 2026`), not the device locale; SPEC §7.5 + D64. → [step file](step-02-english-dates.md)

## Backlog
_(none yet)_

## Open questions
_(none yet)_
