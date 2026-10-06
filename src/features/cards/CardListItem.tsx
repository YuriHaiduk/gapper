import { Link } from 'react-router';
import { SpeakerIcon, TrashIcon } from '@/components/ui/icons';
import { FOCUS_RING } from '@/components/ui/styles';
import { partOfSpeechLabel } from '@/domain/partsOfSpeech';
import type { Card } from '@/domain/types';
import { StatusPill } from './StatusPill';

type CardListItemProps = {
  card: Card;
  categoryName: string | undefined;
  /** Canonical list query, carried to the detail page as its context (SPEC §13). */
  query: string;
  pending: boolean;
  onOpen: () => void;
  onDelete: () => void;
};

/**
 * Compact list row (SPEC §7.4): title and `part of speech · category` (D63) on the left, the
 * status pill with a delete button under it on the right (D62); notes are not shown. The link
 * covers the row, the delete button sits above it.
 */
export function CardListItem({
  card,
  categoryName,
  query,
  pending,
  onOpen,
  onDelete,
}: CardListItemProps) {
  const type = partOfSpeechLabel(card.type);
  return (
    <li className="relative flex min-h-16 gap-2 rounded-lg border border-neutral-200 px-2.5 py-2 has-[a:hover]:bg-neutral-50 dark:border-neutral-800 dark:has-[a:hover]:bg-neutral-900">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <Link
          to={`/cards/${card.id}${query ? `?${query}` : ''}`}
          onClick={onOpen}
          className="min-w-0 font-semibold break-words after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-black dark:focus-visible:after:outline-white"
        >
          {card.title}
        </Link>
        <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          {(type ?? categoryName) && (
            <span className="truncate">{[type, categoryName].filter(Boolean).join(' · ')}</span>
          )}
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
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <StatusPill status={card.status} />
        {/* 44 px target; the negative margins keep the row compact. */}
        <button
          type="button"
          aria-label={`Delete “${card.title}”`}
          onClick={onDelete}
          className={`relative z-10 -mr-2.5 -mb-2.5 flex size-11 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${FOCUS_RING}`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
