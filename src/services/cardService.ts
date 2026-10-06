import { audioPath } from '@/domain/audio';
import { learnedAtFor } from '@/domain/cardStatus';
import { isPartOfSpeech, type PartOfSpeech } from '@/domain/partsOfSpeech';
import { normalizeRichText, sameRichText } from '@/domain/richText';
import { nowIso } from '@/domain/timestamps';
import type { AudioChange, Card, CardStatus, RecordedAudio } from '@/domain/types';
import { validateCardInput, type CardTextInput } from '@/domain/validation';
import {
  deleteCardLocally,
  getCard,
  saveCard,
  type CardAudioWrite,
} from '@/repositories/local/cardsLocalRepo';
import { getCategory, getOtherCategory } from '@/repositories/local/categoriesLocalRepo';
import { getMeta } from '@/repositories/local/metaRepo';
import { CardValidationError, NotFoundError } from './errors';

/**
 * Form values (SPEC §7.1). Notes without text → null; empty/unknown category → Other;
 * empty/unknown part of speech → null.
 */
export type CardInput = CardTextInput & {
  type?: PartOfSpeech | null;
  category_id?: string | null;
  status?: CardStatus;
};

type CardFields = Pick<Card, 'title' | 'notes' | 'type' | 'category_id'>;

/** A non-deleted category id, falling back to `Other` (mirrors the DB trigger, SPEC §7.1). */
async function resolveCategoryId(categoryId: string | null | undefined): Promise<string> {
  if (categoryId) {
    const category = await getCategory(categoryId);
    if (category && category.deleted_at === null) return category.id;
  }
  const other = await getOtherCategory();
  if (!other) throw new Error('Category Other is missing');
  return other.id;
}

async function normalize(input: CardInput): Promise<CardFields> {
  const errors = validateCardInput(input);
  if (Object.keys(errors).length > 0) throw new CardValidationError(errors);
  return {
    title: input.title.trim(),
    notes: normalizeRichText(input.notes),
    type: isPartOfSpeech(input.type) ? input.type : null,
    category_id: await resolveCategoryId(input.category_id),
  };
}

async function getExisting(id: string): Promise<Card> {
  const card = await getCard(id);
  if (!card || card.deleted_at !== null) throw new NotFoundError(`Card ${id} not found`);
  return card;
}

const KEEP_AUDIO: AudioChange = { kind: 'keep' };

/** A new Storage object per recording (SPEC §10.3, §19). */
function newRecording(card: Pick<Card, 'id' | 'user_id'>, audio: RecordedAudio, now: string) {
  const path = audioPath(card.user_id, card.id, crypto.randomUUID(), audio.mime);
  return {
    path,
    row: {
      path,
      card_id: card.id,
      blob: audio.blob,
      mime: audio.mime,
      uploaded: 0,
      created_at: now,
    },
  } as const;
}

/** New cards are always `learning` (FR-7, D38). An optional recording is saved with them. */
export async function createCard(input: CardInput, audio?: RecordedAudio): Promise<Card> {
  const fields = await normalize(input);
  // Local copy only: remote upserts omit user_id, the DB fills it from auth.uid() (D29).
  const userId = await getMeta('user_id');
  if (!userId) throw new Error('No signed-in user for local data');
  const now = nowIso();
  const card: Card = {
    id: crypto.randomUUID(),
    user_id: userId,
    ...fields,
    status: 'learning',
    audio_path: null,
    learned_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: null,
  };
  if (!audio) {
    await saveCard(card);
    return card;
  }
  const recording = newRecording(card, audio, now);
  const withAudio = { ...card, audio_path: recording.path };
  await saveCard(withAudio, { add: recording.row });
  return withAudio;
}

/**
 * Edits fields, status and the recording; `created_at` never changes. An unchanged card
 * is a no-op (removing audio from a card without audio changes nothing).
 */
export async function updateCard(
  id: string,
  input: CardInput,
  audio: AudioChange = KEEP_AUDIO,
): Promise<Card> {
  const card = await getExisting(id);
  const fields = await normalize(input);
  const status = input.status ?? card.status;
  const audioChanged =
    audio.kind === 'replace' || (audio.kind === 'remove' && card.audio_path !== null);
  const unchanged =
    fields.title === card.title &&
    fields.type === card.type &&
    fields.category_id === card.category_id &&
    sameRichText(fields.notes, card.notes) &&
    status === card.status &&
    !audioChanged;
  if (unchanged) return card;
  const now = nowIso();
  const updated: Card = {
    ...card,
    ...fields,
    status,
    learned_at: learnedAtFor(card, status, now),
    updated_at: now,
  };
  const write: CardAudioWrite = {};
  if (audioChanged) {
    if (card.audio_path) write.removePath = card.audio_path;
    updated.audio_path = null;
    if (audio.kind === 'replace') {
      const recording = newRecording(card, audio.audio, now);
      updated.audio_path = recording.path;
      write.add = recording.row;
    }
  }
  await saveCard(updated, write);
  return updated;
}

/** One-tap status toggle (FR-9, SPEC §7.2). */
export async function setStatus(id: string, status: CardStatus): Promise<Card> {
  const card = await getExisting(id);
  if (status === card.status) return card;
  const now = nowIso();
  const updated: Card = {
    ...card,
    status,
    learned_at: learnedAtFor(card, status, now),
    updated_at: now,
  };
  await saveCard(updated);
  return updated;
}

/** Soft delete (SPEC §7.3): hidden everywhere at once; audio removed from Storage on sync. */
export async function deleteCard(id: string): Promise<void> {
  await deleteCardLocally(await getExisting(id));
}
