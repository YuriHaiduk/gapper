import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorText } from '@/components/ui/ErrorText';
import { Spinner } from '@/components/ui/Spinner';
import { deleteCardPrompt } from '@/domain/cardForm';
import type { Card, Category } from '@/domain/types';
import { CardForm, KEEP_AUDIO, type CardFormValues } from '@/features/cards/CardForm';
import { useCard } from '@/hooks/useCard';
import { cardErrorMessage, useCardActions } from '@/hooks/useCardActions';
import { useCardFilter } from '@/hooks/useCardFilter';
import { useCategories } from '@/hooks/useCategories';

const EMPTY_TEXT = { title: '', notes: null, type: null, audio: KEEP_AUDIO };

function otherId(categories: Category[]): string {
  return categories.find((category) => category.is_system)?.id ?? '';
}

function Loading() {
  return (
    <div role="status" className="flex justify-center py-12 text-neutral-500">
      <Spinner />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * `/cards/new` and `/cards/:id/edit` (SPEC §7.6). The list context (`?status&category&q`)
 * is kept in the URL: it preselects the category and is carried to the card / back to the list.
 */
export function CardFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { filter, query } = useCardFilter();
  const categories = useCategories();
  const { id } = useParams();
  const card = useCard(mode === 'edit' ? id : undefined);
  const navigate = useNavigate();
  const { createCard, updateCard, deleteCard } = useCardActions();
  const [deleteError, setDeleteError] = useState<string>();
  const search = query ? `?${query}` : '';

  function openCard(saved: Card) {
    void navigate(`/cards/${saved.id}${search}`, { replace: true });
  }

  if (categories === undefined || (mode === 'edit' && card === undefined)) return <Loading />;

  if (mode === 'create') {
    const contextCategory = categories.find((category) => category.slug === filter.categorySlug);
    return (
      <CardForm
        mode="create"
        initial={{
          ...EMPTY_TEXT,
          category_id: contextCategory?.id ?? otherId(categories),
          status: 'learning',
        }}
        categories={categories}
        onSave={(values) =>
          createCard(values, values.audio.kind === 'replace' ? values.audio.audio : undefined)
        }
        onSaved={openCard}
      />
    );
  }

  if (!card) {
    return (
      <EmptyState
        message="Card not found."
        action={{ to: `/cards${search}`, label: 'Back to cards' }}
      />
    );
  }
  const editedId = card.id;
  const title = card.title;

  async function handleDelete(): Promise<boolean> {
    setDeleteError(undefined);
    if (!window.confirm(deleteCardPrompt(title))) return false;
    try {
      await deleteCard(editedId);
    } catch (error) {
      setDeleteError(cardErrorMessage(error));
      return false;
    }
    void navigate(`/cards${search}`, { replace: true });
    return true;
  }

  const initial: CardFormValues = {
    title: card.title,
    notes: card.notes,
    type: card.type,
    category_id: categories.some((category) => category.id === card.category_id)
      ? card.category_id
      : otherId(categories),
    status: card.status,
    audio: KEEP_AUDIO,
  };

  return (
    <>
      {deleteError && (
        <ErrorText role="alert" className="pt-4">
          {deleteError}
        </ErrorText>
      )}
      {/* Keyed by id and mounted once: later live updates (sync) don't reset what was typed. */}
      <CardForm
        key={card.id}
        mode="edit"
        initial={initial}
        categories={categories}
        selfId={card.id}
        audioPath={card.audio_path}
        onSave={(values) => updateCard(editedId, values, values.audio)}
        onSaved={openCard}
        onDelete={handleDelete}
      />
    </>
  );
}
