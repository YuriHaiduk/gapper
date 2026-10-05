import { statusLabel } from '@/domain/cardFilter';
import type { CardStatus } from '@/domain/types';

const STYLES: Record<CardStatus, string> = {
  // The ring keeps the black pill visible on the near-black dark theme.
  learning: 'bg-black text-white dark:ring-1 dark:ring-neutral-600',
  // green-700: white text stays readable (≈ 5:1 contrast).
  learned: 'bg-green-700 text-white',
};

/** Learning = black, Learned = green, white text (D45: the only hue in the UI). */
export function StatusPill({ status }: { status: CardStatus }) {
  return (
    <span
      className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
