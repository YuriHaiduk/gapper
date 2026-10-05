# Step 09 — Audio

Status: done
Spec: docs/SPEC.md §10, §19, §20.3, §25; AC-38…AC-43; T7

## Goal
Record a pronunciation on the card form (≤ 60 s), persist it locally with the card, upload it via the outbox, and play it on the detail page with download-and-cache for offline playback.

## Scope
- In: `domain/audio.ts`, `useAudioRecorder`, `AudioRecorder`, `AudioPlayer`, `useCardAudio`, `useObjectUrl`, cardService create/update with audio, local repo transaction, `AudioRemote.download` + `SyncService.downloadAudio`, stale cached blob cleanup on pull, tests (T7 + service/sync/page), docs.
- Out: "Download all audio" (§29), cache eviction, iPhone check (👤 after step 12).

## User actions
- [x] None now. 👤 Later (backlog): test recording/playback on the iPhone (after step 12).

## Tasks
- [x] Domain helpers + tests
- [x] Local repo + cardService audio changes + tests
- [x] Remote download + `SyncService.downloadAudio` + sync tests
- [x] `useAudioRecorder` + T7 tests (mocked MediaRecorder/getUserMedia)
- [x] `AudioPlayer`, `AudioRecorder`, form + detail page integration + page tests
- [x] Docs: SPEC, decisions D46–D48, plan.md

## Files
- `src/domain/audio.ts`, `src/domain/types.ts`
- `src/repositories/local/{cardsLocalRepo,audioLocalRepo}.ts`, `src/repositories/remote/{types,audioRemoteRepo}.ts`
- `src/services/cardService.ts`, `src/sync/{syncService,SyncProvider,syncContext}.ts(x)`
- `src/hooks/{useAudioRecorder,useObjectUrl,useCardAudio}.ts`
- `src/features/audio/{AudioRecorder,AudioPlayer}.tsx`, `src/features/cards/CardForm.tsx`, `src/pages/{CardFormPage,CardDetailPage}.tsx`
- `src/test/{setup,mediaRecorder,fakeRemote,auth}.ts(x)`

## Verification
- [x] npm run lint / typecheck / test / build / format:check — all pass (231 tests, 32 files; full suite run 3× without flakes); build: app chunk 699 kB / 206 kB gzip (+3 kB gzip), `NotesEditor` chunk unchanged
- [x] Manual check — owner, 2026-10-05, on the Mac (passed). Owner, desktop browser at `http://localhost:5173/gapper/` (mic works on localhost): record → Stop → preview → Save → detail plays; after sync the object exists in Storage `audio/<uid>/<card>/…` (AC-39); Replace → old object gone (AC-40); DevTools offline → the played recording still plays (AC-43); block the mic → message, Save works (AC-42)

## Notes / decisions
- D46: recorder right under Title; Save disabled while requesting/recording; red pulsing dot (second hue exception).
- D47: `SyncService.downloadAudio` (exposed via `SyncContext`) is the only playback download path; `AudioRemote.download` added.
- D48: uncached recordings download as soon as shown (detail + edit form); `applyRemoteCard` drops the card's other uploaded cached blobs.
- `saveCard(card, { add, removePath })` writes blob + `audio:upload`, card + `card:upsert`, then `audio:delete(old)` in one transaction; the old local blob is deleted at once. A recording replaced before it was sent is never uploaded (its upload entry finds no blob).
- `AudioChange` lives in the form values; dirty = not `keep` (a new recording compared by identity). "Save & add another" resets it and remounts the recorder.
- Player plays via an object URL created/revoked in an effect on the `<audio>` element (no state), paused on unmount. webm durations can be `Infinity` → only elapsed time shown then.
- `jsx-a11y/media-has-caption` disabled for the pronunciation `<audio>` (a spoken word has no caption track; the title is its text).
- Test fakes: `src/test/mediaRecorder.ts` (MediaRecorder + getUserMedia with trackable `track.stop`); `setup.ts` stubs object URLs and media play/pause; `renderApp(path, { sync })` accepts a sync service.
