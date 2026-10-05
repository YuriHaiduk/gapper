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

/** Compact list row (SPEC §7.4); the title link's hit area covers the whole row. */
export function CardListItem({ card, categoryName, query, pending, onOpen }: CardListItemProps) {
  return (
    <li className="relative flex min-h-16 flex-col justify-center gap-0.5 py-2 has-[a:hover]:bg-neutral-50 dark:has-[a:hover]:bg-neutral-900">
      <Link
        to={`/cards/${card.id}${query ? `?${query}` : ''}`}
        onClick={onOpen}
        className="font-semibold break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-black dark:focus-visible:after:outline-white"
      >
        {card.title}
      </Link>
      {card.translation && (
        <p className="truncate text-neutral-600 dark:text-neutral-400">{card.translation}</p>
      )}
      <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        {categoryName && <span className="truncate">{categoryName}</span>}
        <StatusPill status={card.status} />
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
