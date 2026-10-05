import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { FOCUS_RING } from '@/components/ui/styles';
import type { Card } from '@/domain/types';
import type { AdjacentCards } from '@/repositories/local/cardsLocalRepo';

type AdjacentNavProps = {
  adjacent: AdjacentCards | undefined;
  /** Canonical list query (`?` included when not empty), kept on every move (SPEC §13). */
  search: string;
  /** Middle control (the status toggle). */
  children: ReactNode;
};

const CONTROL = `flex min-h-11 min-w-0 items-center gap-1 rounded-lg px-2 text-sm font-medium ${FOCUS_RING}`;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function Neighbour({
  card,
  direction,
  search,
}: {
  card: Card | null | undefined;
  direction: 'prev' | 'next';
  search: string;
}) {
  const isPrev = direction === 'prev';
  const label = isPrev ? 'Previous' : 'Next';
  const arrow = (
    <span aria-hidden="true" className="shrink-0">
      {isPrev ? '←' : '→'}
    </span>
  );
  const align = isPrev ? 'justify-self-start' : 'justify-self-end';

  if (!card) {
    // Rendered disabled so the bar keeps its layout (AC-30).
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`No ${label.toLowerCase()} card`}
        className={`${CONTROL} ${align} text-neutral-400 dark:text-neutral-600`}
      >
        {isPrev && arrow}
        <span className="truncate">{label}</span>
        {!isPrev && arrow}
      </span>
    );
  }
  return (
    <Link
      to={`/cards/${card.id}${search}`}
      replace
      aria-label={`${label}: ${card.title}`}
      className={`${CONTROL} ${align} max-w-full hover:bg-neutral-100 dark:hover:bg-neutral-800`}
    >
      {isPrev && arrow}
      <span className="truncate">{card.title}</span>
      {!isPrev && arrow}
    </Link>
  );
}

/**
 * Bottom action bar (SPEC §7.5, §13): `← prev-title` · status toggle · `next-title →`.
 * Moves replace the history entry, so Back returns to the list (AC-32). ←/→ keys on desktop.
 */
export function AdjacentNav({ adjacent, search, children }: AdjacentNavProps) {
  const navigate = useNavigate();
  const prevId = adjacent?.prev?.id;
  const nextId = adjacent?.next?.id;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (isTyping(event.target)) return;
      const id =
        event.key === 'ArrowLeft' ? prevId : event.key === 'ArrowRight' ? nextId : undefined;
      if (id === undefined) return;
      event.preventDefault();
      void navigate(`/cards/${id}${search}`, { replace: true });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate, prevId, nextId, search]);

  return (
    <nav
      aria-label="Card navigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-2">
        <Neighbour card={adjacent?.prev} direction="prev" search={search} />
        {children}
        <Neighbour card={adjacent?.next} direction="next" search={search} />
      </div>
    </nav>
  );
}
