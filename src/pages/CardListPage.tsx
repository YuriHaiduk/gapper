import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorText } from '@/components/ui/ErrorText';
import { PlusIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { FOCUS_RING } from '@/components/ui/styles';
import { emptyListMessage } from '@/domain/cardFilter';
import { deleteCardPrompt } from '@/domain/cardForm';
import type { Card } from '@/domain/types';
import { CardListItem } from '@/features/cards/CardListItem';
import { cardErrorMessage, useCardActions } from '@/hooks/useCardActions';
import { useCardFilter } from '@/hooks/useCardFilter';
import { useCardList } from '@/hooks/useCardList';
import { useListScrollRestore } from '@/hooks/useListScrollRestore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingCardIds } from '@/hooks/usePendingCardIds';
import { useSyncStatus } from '@/sync/useSyncStatus';

/** Main page (SPEC §11–§12, §25): filtered, searchable, newest-first list with Load more. */
export function CardListPage() {
  const { filter, query } = useCardFilter();
  const list = useCardList(filter, query);
  const pendingIds = usePendingCardIds();
  const saveScroll = useListScrollRestore(query, list.cards !== undefined);
  const { deleteCard } = useCardActions();
  const [deleteError, setDeleteError] = useState<string>();

  // Same confirmation as the edit page (SPEC §7.3, D62); the live list drops the row itself.
  async function handleDelete(card: Card) {
    setDeleteError(undefined);
    if (!window.confirm(deleteCardPrompt(card.title))) return;
    try {
      await deleteCard(card.id);
    } catch (error) {
      setDeleteError(cardErrorMessage(error));
    }
  }

  return (
    <>
      <CardListContent
        filter={filter}
        query={query}
        list={list}
        pendingIds={pendingIds}
        onOpen={saveScroll}
        onDelete={(card) => void handleDelete(card)}
        deleteError={deleteError}
      />
      <Link
        to={`/cards/new${query ? `?${query}` : ''}`}
        aria-label="Add card"
        className={`fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-black focus-visible:outline-offset-2 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 ${FOCUS_RING}`}
      >
        <PlusIcon />
      </Link>
    </>
  );
}

type ContentProps = {
  filter: ReturnType<typeof useCardFilter>['filter'];
  query: string;
  list: ReturnType<typeof useCardList>;
  pendingIds: Set<string>;
  onOpen: () => void;
  onDelete: (card: Card) => void;
  deleteError: string | undefined;
};

function CardListContent({
  filter,
  query,
  list,
  pendingIds,
  onOpen,
  onDelete,
  deleteError,
}: ContentProps) {
  const { initialSyncDone, lastResult, syncing, syncNow } = useSyncStatus();
  const online = useOnlineStatus();

  if (list.categoryNotFound) {
    return (
      <EmptyState
        message="Category not found."
        action={{ to: '/cards', label: 'Show all cards' }}
      />
    );
  }
  if (list.cards === undefined) return <ListSkeleton />;

  if (list.cards.length === 0 && !initialSyncDone) {
    if (!online) return <EmptyState message="You're offline. Connect to load your cards." />;
    if (!syncing && lastResult && lastResult.status !== 'ok') {
      return (
        <div className="flex flex-col items-center gap-4 py-12">
          <ErrorText role="alert">Couldn't load your cards.</ErrorText>
          <Button variant="secondary" onClick={() => void syncNow()}>
            Retry
          </Button>
        </div>
      );
    }
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-12 text-neutral-600 dark:text-neutral-400"
      >
        <Spinner />
        <p>Loading your cards…</p>
      </div>
    );
  }

  if (list.cards.length === 0) {
    const isAll = !filter.status && !filter.categorySlug && !filter.q;
    return (
      <div aria-live="polite">
        <EmptyState
          message={emptyListMessage(filter)}
          {...(isAll && { action: { to: '/cards/new', label: 'Add your first card' } })}
        />
      </div>
    );
  }

  const categoryNames = new Map(list.categories?.map((category) => [category.id, category.name]));

  return (
    <div className="flex flex-col gap-4 pt-5 pb-20">
      {deleteError && <ErrorText role="alert">{deleteError}</ErrorText>}
      <ul aria-label="Cards" className="flex flex-col gap-5">
        {list.cards.map((card) => (
          <CardListItem
            key={card.id}
            card={card}
            categoryName={categoryNames.get(card.category_id)}
            query={query}
            pending={pendingIds.has(card.id)}
            onOpen={onOpen}
            onDelete={() => {
              onDelete(card);
            }}
          />
        ))}
      </ul>
      {list.hasMore && (
        <Button variant="secondary" pending={list.loadingMore} onClick={list.loadMore}>
          Load more
        </Button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading cards" className="flex flex-col gap-5 pt-5">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex min-h-16 flex-col justify-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-2 motion-safe:animate-pulse dark:border-neutral-800"
        >
          <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-900" />
        </div>
      ))}
    </div>
  );
}
