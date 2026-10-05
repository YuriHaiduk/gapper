import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { parseCardFilter, serializeCardFilter } from '@/domain/cardFilter';
import type { CardFilter } from '@/domain/types';

export type SetCardFilter = (filter: CardFilter, options?: { replace?: boolean }) => void;

/** List context from the URL (SPEC §11.1); `query` is the canonical query string without `?`. */
export function useCardFilter(): { filter: CardFilter; query: string; setFilter: SetCardFilter } {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = serializeCardFilter(parseCardFilter(params));
  const filter = useMemo(() => parseCardFilter(new URLSearchParams(query)), [query]);
  const setFilter = useCallback<SetCardFilter>(
    (next, options) => {
      const search = serializeCardFilter(next);
      void navigate(
        { pathname: '/cards', search: search ? `?${search}` : '' },
        { replace: options?.replace ?? false },
      );
    },
    [navigate],
  );
  return { filter, query, setFilter };
}
