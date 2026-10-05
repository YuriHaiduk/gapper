import { learnedAtFor } from '@/domain/cardStatus';
import { normalizeRichText, sameRichText } from '@/domain/richText';
import { nowIso } from '@/domain/timestamps';
import type { Card, CardStatus } from '@/domain/types';
import { validateCardInput, type CardTextInput } from '@/domain/validation';
import { deleteCardLocally, getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
import { getCategory, getOtherCategory } from '@/repositories/local/categoriesLocalRepo';
import { getMeta } from '@/repositories/local/metaRepo';
import { CardValidationError, NotFoundError } from './errors';

/** Form values (SPEC §7.1). Notes without text → null; empty/unknown category → Other. */
export type CardInput = CardTextInput & {
  category_id?: string | null;
  status?: CardStatus;
};

type CardFields = Pick<Card, 'title' | 'notes' | 'category_id'>;

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
    category_id: await resolveCategoryId(input.category_id),
  };
}

async function getExisting(id: string): Promise<Card> {
  const card = await getCard(id);
  if (!card || card.deleted_at !== null) throw new NotFoundError(`Card ${id} not found`);
  return card;
}

/** New cards are always `learning` (FR-7, D38). */
export async function createCard(input: CardInput): Promise<Card> {
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
  await saveCard(card);
  return card;
}

/** Edits fields and status; `created_at` never changes. An unchanged card is a no-op. */
export async function updateCard(id: string, input: CardInput): Promise<Card> {
  const card = await getExisting(id);
  const fields = await normalize(input);
  const status = input.status ?? card.status;
  const unchanged =
    fields.title === card.title &&
    fields.category_id === card.category_id &&
    sameRichText(fields.notes, card.notes) &&
    status === card.status;
  if (unchanged) return card;
  const now = nowIso();
  const updated: Card = {
    ...card,
    ...fields,
    status,
    learned_at: learnedAtFor(card, status, now),
    updated_at: now,
  };
  await saveCard(updated);
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
