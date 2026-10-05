import { Link } from 'react-router';
import { SpeakerIcon } from '@/components/ui/icons';
import type { Card } from '@/domain/types';
import { StatusPill } from './StatusPill';

type CardListItemProps = {
  card: Card;
  categoryName: string | undefined;
  /** Canonical list query, carried to the detail page as its context (SPEC §13). */
  query: string;
  pending: boolean;
  onOpen: () => void;
};

/**
 * Compact list row (SPEC §7.4): title with the status pill on the right, category below;
 * notes are not shown. The link covers the row.
 */
export function CardListItem({ card, categoryName, query, pending, onOpen }: CardListItemProps) {
  return (
    <li className="relative flex min-h-16 flex-col justify-center gap-0.5 rounded-lg border border-neutral-200 px-2.5 py-2 has-[a:hover]:bg-neutral-50 dark:border-neutral-800 dark:has-[a:hover]:bg-neutral-900">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/cards/${card.id}${query ? `?${query}` : ''}`}
          onClick={onOpen}
          className="min-w-0 font-semibold break-words after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-black dark:focus-visible:after:outline-white"
        >
          {card.title}
        </Link>
        <StatusPill status={card.status} />
      </div>
      <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        {categoryName && <span className="truncate">{categoryName}</span>}
        {card.audio_path && (
          <span role="img" aria-label="Has audio">
            <SpeakerIcon />
          </span>
        )}
        {pending && (
          <span
            role="img"
            aria-label="Not synced yet"
            className="size-2 rounded-full bg-neutral-900 dark:bg-neutral-100"
          />
        )}
      </p>
    </li>
  );
}
