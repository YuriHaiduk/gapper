import { useCallback, useLayoutEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { readScrollY, writeScrollY } from './listSession';

/** Navigation state of the card page's Back link: return to the list where it was (D44). */
export const RESTORE_LIST_STATE = { restoreList: true } as const;

function isRestoreState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'restoreList' in state;
}

/**
 * Restores the list scroll position on Back (SPEC §12, AC-12) — browser Back (POP) or the card
 * page's Back link (`RESTORE_LIST_STATE`). `<ScrollRestoration />` runs before the async Dexie
 * read renders the rows, so the position is re-applied once `ready`.
 * Returns the callback to call when a card is opened.
 */
export function useListScrollRestore(query: string, ready: boolean): () => void {
  const navigationType = useNavigationType();
  const location = useLocation();
  const returning =
    navigationType === NavigationType.Pop || isRestoreState(location.state as unknown);
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const y = returning ? readScrollY(query) : null;
    if (y !== null) window.scrollTo(0, y);
  }, [ready, returning, query]);

  return useCallback(() => {
    writeScrollY(query, window.scrollY);
  }, [query]);
}
