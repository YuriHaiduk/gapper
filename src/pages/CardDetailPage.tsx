import { useParams } from 'react-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { RichTextView } from '@/components/ui/RichTextView';
import { formatDate } from '@/domain/dates';
import type { Card } from '@/domain/types';
import { AdjacentNav } from '@/features/cards/AdjacentNav';
import { StatusPill } from '@/features/cards/StatusPill';
import { StatusToggle } from '@/features/cards/StatusToggle';
import { useAdjacentCards } from '@/hooks/useAdjacentCards';
import { useCard } from '@/hooks/useCard';
import { useCardFilter } from '@/hooks/useCardFilter';
import { useCategories } from '@/hooks/useCategories';

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading card" className="flex flex-col gap-4 pt-6">
      <div className="h-8 w-2/3 rounded bg-neutral-200 motion-safe:animate-pulse dark:bg-neutral-800" />
      <div className="h-4 w-full rounded bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-900" />
      <div className="h-4 w-1/2 rounded bg-neutral-100 motion-safe:animate-pulse dark:bg-neutral-900" />
    </div>
  );
}

function DateRow({ label, iso }: { label: string; iso: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        <time dateTime={iso}>{formatDate(iso)}</time>
      </dd>
    </>
  );
}

function CardDetails({ card, categoryName }: { card: Card; categoryName: string | undefined }) {
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-3xl leading-tight font-bold break-words">{card.title}</h1>
      {card.notes && <RichTextView doc={card.notes} />}
      <p className="flex flex-wrap items-center gap-2">
        {categoryName && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
            {categoryName}
          </span>
        )}
        <StatusPill status={card.status} />
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
        <DateRow label="Created" iso={card.created_at} />
        <DateRow label="Updated" iso={card.updated_at} />
        {card.learned_at && <DateRow label="Learned on" iso={card.learned_at} />}
      </dl>
    </article>
  );
}

/**
 * `/cards/:id` (SPEC §7.5, §13): the card, a status toggle and prev/next within the list
 * context carried in the query (`?status&category&q`; none = all cards).
 */
export function CardDetailPage() {
  const { id } = useParams();
  const card = useCard(id);
  const { filter, query } = useCardFilter();
  const categories = useCategories();
  const adjacent = useAdjacentCards(card, filter);
  const search = query ? `?${query}` : '';

  if (card === undefined || categories === undefined) return <DetailSkeleton />;
  if (card === null) {
    return (
      <EmptyState
        message="Card not found."
        action={{ to: `/cards${search}`, label: 'Back to cards' }}
      />
    );
  }

  const categoryName = categories.find((category) => category.id === card.category_id)?.name;
  return (
    <div className="pt-6 pb-28">
      <CardDetails card={card} categoryName={categoryName} />
      <AdjacentNav adjacent={adjacent} search={search}>
        <StatusToggle key={card.id} card={card} />
      </AdjacentNav>
    </div>
  );
}
