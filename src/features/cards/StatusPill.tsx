import { statusLabel } from '@/domain/cardFilter';
import type { CardStatus } from '@/domain/types';

const STYLES: Record<CardStatus, string> = {
  learning: 'border border-neutral-400 dark:border-neutral-500',
  learned:
    'border border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950',
};

/** Learning = outlined, Learned = filled (SPEC §6 Visual style). */
export function StatusPill({ status }: { status: CardStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {statusLabel(status)}
    </span>
  );
}
