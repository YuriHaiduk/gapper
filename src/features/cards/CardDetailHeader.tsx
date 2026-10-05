import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { HeaderRow } from '@/components/ui/HeaderRow';
import { FOCUS_RING, ICON_BUTTON } from '@/components/ui/styles';
import { useCard } from '@/hooks/useCard';
import { useCardFilter } from '@/hooks/useCardFilter';
import { RESTORE_LIST_STATE } from '@/hooks/useListScrollRestore';

/** `/cards/:id` header (SPEC §7.5, D44): Back to the list context · Edit · menu. */
export function CardDetailHeader({ menu }: { menu: ReactNode }) {
  const { id } = useParams();
  const card = useCard(id);
  const { query } = useCardFilter();
  const search = query ? `?${query}` : '';

  return (
    <HeaderRow
      left={
        <Link
          to={`/cards${search}`}
          state={RESTORE_LIST_STATE}
          aria-label="Back"
          className={ICON_BUTTON}
        >
          <span aria-hidden="true">‹</span>
        </Link>
      }
      center={null}
      right={
        <div className="flex items-center gap-1">
          {card && (
            <Link
              to={`/cards/${card.id}/edit${search}`}
              className={`flex min-h-11 items-center rounded-lg px-3 text-base font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 ${FOCUS_RING}`}
            >
              Edit
            </Link>
          )}
          {menu}
        </div>
      }
    />
  );
}
