/** Audio recording rules (SPEC §10). */

/** Recording auto-stops after this many milliseconds (AC-41). */
export const AUDIO_MAX_MS = 60_000;

/** Preferred recording formats, best cross-device playback first (SPEC §10.2, D16). */
const MIME_PREFERENCE = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'] as const;

/** First supported preferred type, or `''` to let the browser choose. */
export function pickMimeType(isSupported: (mime: string) => boolean): string {
  return MIME_PREFERENCE.find((mime) => isSupported(mime)) ?? '';
}

/** Media type without parameters, e.g. `audio/webm;codecs=opus` → `audio/webm`. */
export function baseMime(mime: string): string {
  return (mime.split(';')[0] ?? '').trim().toLowerCase();
}

/** File extension for a recorded type (SPEC §10.2). */
export function extensionFor(mime: string): string {
  const base = baseMime(mime);
  if (base === 'audio/mp4' || base === 'audio/aac' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav') return 'wav';
  return 'webm';
}

/** Storage object key `<user_id>/<card_id>/<recording_id>.<ext>` (SPEC §19). */
export function audioPath(userId: string, cardId: string, recordingId: string, mime: string) {
  return `${userId}/${cardId}/${recordingId}.${extensionFor(mime)}`;
}

/** `m:ss`, e.g. 7 s → `0:07`, 60 s → `1:00`. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  return `${Math.floor(total / 60)}:${seconds.toString().padStart(2, '0')}`;
}
