import { useCallback, useState, type ReactNode } from 'react';
import { HeaderRow } from '@/components/ui/HeaderRow';
import { SearchIcon } from '@/components/ui/icons';
import { FOCUS_RING, ICON_BUTTON } from '@/components/ui/styles';
import { filterLabel } from '@/domain/cardFilter';
import { useCardFilter } from '@/hooks/useCardFilter';
import { useCategories } from '@/hooks/useCategories';
import { FilterSheet } from './FilterSheet';
import { SearchBar } from './SearchBar';

/** `/cards` header (SPEC §11.2–§11.3): search toggle · filter button · menu, search row below. */
export function CardListHeader({ menu }: { menu: ReactNode }) {
  const { filter, setFilter } = useCardFilter();
  const categories = useCategories();
  const [searchOpened, setSearchOpened] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchOpen = searchOpened || filter.q !== undefined;
  const category = categories?.find((item) => item.slug === filter.categorySlug);

  const onSearch = useCallback(
    (q: string) => {
      setFilter({ ...filter, q }, { replace: true });
    },
    [filter, setFilter],
  );

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpened(false);
      if (filter.q !== undefined) onSearch('');
    } else {
      setSearchOpened(true);
    }
  }

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return (
    <>
      <h1 className="sr-only">Cards</h1>
      <HeaderRow
        left={
          <button
            type="button"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-pressed={searchOpen}
            onClick={toggleSearch}
            className={`${ICON_BUTTON} aria-pressed:bg-neutral-200 dark:aria-pressed:bg-neutral-800`}
          >
            <SearchIcon />
          </button>
        }
        center={
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Filter: ${filterLabel(filter, category?.name)}`}
            onClick={() => {
              setSheetOpen(true);
            }}
            className={`flex min-h-11 max-w-full items-center gap-1 rounded-lg px-3 text-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 ${FOCUS_RING}`}
          >
            <span className="truncate">{filterLabel(filter, category?.name)}</span>
            <span aria-hidden="true" className="text-sm">
              ▾
            </span>
          </button>
        }
        right={menu}
      />
      {searchOpen && <SearchBar q={filter.q} onSearch={onSearch} focusOnMount={searchOpened} />}
      {categories && (
        <FilterSheet
          open={sheetOpen}
          onClose={closeSheet}
          filter={filter}
          categories={categories}
          categoryId={category?.id}
          onChange={setFilter}
        />
      )}
    </>
  );
}
