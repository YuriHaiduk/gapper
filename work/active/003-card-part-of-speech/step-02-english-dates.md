# Step 02 — English dates

Status: done
Spec: docs/SPEC.md §7.5 · D64

## Goal
Created / Updated / Learned on show English dates (`6 Oct 2026`) on a Ukrainian-locale device
(owner saw `6 жовт. 2026 р.`).

## Tasks
- [x] `src/domain/dates.ts`: fixed `en-GB` medium date; device time zone kept
- [x] `dates.test.ts`: exact `5 Oct 2026`
- [x] SPEC §7.5, D64
- [x] Owner follow-up: the Updated date is no longer shown on the detail page (SPEC §7.5)

## Verification
- [x] npm run lint / typecheck / test / build / format:check
