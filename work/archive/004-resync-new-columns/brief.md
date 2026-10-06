# 004 — Re-pull cards after a new column · Brief

Owner, 2026-10-06 (translated): on localhost all three cards show their saved part of speech,
on https://yurihaiduk.github.io/gapper/cards only one, although the database is the same.
After the explanation (the old deployed app pulled them without `type` and moved the cursor;
"Sync now" can't help), the owner asked for the Dexie fix: a one-time reset of the cards
cursor and a rule for future columns.
