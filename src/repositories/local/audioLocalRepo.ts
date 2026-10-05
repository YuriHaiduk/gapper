import { db } from '@/db/database';
import type { AudioBlobRow } from '@/domain/types';

export function getAudioBlob(path: string): Promise<AudioBlobRow | undefined> {
  return db.audio_blobs.get(path);
}

export async function markAudioUploaded(path: string): Promise<void> {
  await db.audio_blobs.update(path, { uploaded: 1 });
}

export async function deleteAudioByCard(cardId: string): Promise<void> {
  await db.audio_blobs.where('card_id').equals(cardId).delete();
}

/** Stores a recording downloaded from Storage (already uploaded) for offline playback. */
export async function putCachedAudio(row: Omit<AudioBlobRow, 'uploaded'>): Promise<void> {
  await db.audio_blobs.put({ ...row, uploaded: 1 });
}
