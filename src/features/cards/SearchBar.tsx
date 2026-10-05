import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { FOCUS_RING } from '@/components/ui/styles';
import { normalizeQuery } from '@/domain/cardFilter';
import { LIMITS } from '@/domain/constants';

const DEBOUNCE_MS = 300;

type SearchBarProps = {
  /** Current `q` from the URL. */
  q: string | undefined;
  /** Writes `q` to the URL (replace navigation). */
  onSearch: (q: string) => void;
  /** Focus the field when the row is opened by the user (not when restored from the URL). */
  focusOnMount: boolean;
};

/** Search row under the header (SPEC §11.3): debounced 300 ms, × clears immediately. */
export function SearchBar({ q = '', onSearch, focusOnMount }: SearchBarProps) {
  const [value, setValue] = useState(q);
  const [urlQ, setUrlQ] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow URL changes made elsewhere (Back/Forward) unless they match what was typed.
  if (urlQ !== q) {
    setUrlQ(q);
    if (normalizeQuery(value) !== q) setValue(q);
  }

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    if (normalizeQuery(value) === q) return;
    const timer = setTimeout(() => {
      onSearch(value);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [value, q, onSearch]);

  return (
    <div className="mx-auto max-w-2xl px-[max(0.5rem,env(safe-area-inset-left))] pb-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          aria-label="Search cards"
          placeholder="Search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={LIMITS.query}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          className={`min-h-11 w-full rounded-lg border border-neutral-300 bg-white pr-12 pl-3 text-base focus-visible:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:border-white [&::-webkit-search-cancel-button]:appearance-none ${FOCUS_RING}`}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue('');
              onSearch('');
              inputRef.current?.focus();
            }}
            className={`absolute top-0 right-0 flex size-11 items-center justify-center rounded-lg ${FOCUS_RING}`}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}
