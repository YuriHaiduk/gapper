import { useCallback, useLayoutEffect, useRef } from 'react';
import { NavigationType, useNavigationType } from 'react-router';
import { readScrollY, writeScrollY } from './listSession';

/**
 * Restores the list scroll position on Back (SPEC §12, AC-12). `<ScrollRestoration />` runs
 * before the async Dexie read renders the rows, so the position is re-applied once `ready`.
 * Returns the callback to call when a card is opened.
 */
export function useListScrollRestore(query: string, ready: boolean): () => void {
  const navigationType = useNavigationType();
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const y = navigationType === NavigationType.Pop ? readScrollY(query) : null;
    if (y !== null) window.scrollTo(0, y);
  }, [ready, navigationType, query]);

  return useCallback(() => {
    writeScrollY(query, window.scrollY);
  }, [query]);
}
