import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { statusLabel } from '@/domain/cardFilter';
import { CARD_STATUSES } from '@/domain/constants';
import type { CardFilter, CardStatus, Category } from '@/domain/types';
import { useCardFacets } from '@/hooks/useCardFacets';

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  filter: CardFilter;
  categories: Category[];
  /** Id of the selected category (for the status counts). */
  categoryId: string | undefined;
  onChange: (filter: CardFilter) => void;
};

/**
 * Status + category picker (SPEC §11.2): native `<dialog>`, bottom sheet on phones, panel on
 * wider screens. Every choice applies immediately; Done, Escape or a backdrop tap closes it.
 */
export function FilterSheet({ open, onClose, ...body }: FilterSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // The click handler only detects taps on the backdrop; keyboard users close with Escape/Done.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label="Filter cards"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-neutral-900 backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:rounded-2xl dark:bg-neutral-900 dark:text-neutral-100"
    >
      {open && <FilterSheetBody onClose={onClose} {...body} />}
    </dialog>
  );
}

function FilterSheetBody({
  filter,
  categories,
  categoryId,
  onChange,
  onClose,
}: Omit<FilterSheetProps, 'open'>) {
  const facets = useCardFacets(filter, categoryId);
  const count = (value: number | undefined) => (facets ? (value ?? 0) : undefined);

  const statusOptions: {
    value: CardStatus | undefined;
    label: string;
    count: number | undefined;
  }[] = [
    { value: undefined, label: 'All', count: count(facets?.byStatus.all) },
    ...CARD_STATUSES.map((status) => ({
      value: status,
      label: statusLabel(status),
      count: count(facets?.byStatus[status]),
    })),
  ];

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Group legend="Status">
        {statusOptions.map((option) => (
          <Option
            key={option.label}
            name="status"
            label={option.label}
            count={option.count}
            checked={filter.status === option.value}
            onSelect={() => {
              const next = { ...filter };
              if (option.value) next.status = option.value;
              else delete next.status;
              onChange(next);
            }}
          />
        ))}
      </Group>
      <Group legend="Category">
        <Option
          name="category"
          label="All categories"
          count={count(facets?.allCategories)}
          checked={filter.categorySlug === undefined}
          onSelect={() => {
            const next = { ...filter };
            delete next.categorySlug;
            onChange(next);
          }}
        />
        {categories.map((category) => (
          <Option
            key={category.id}
            name="category"
            label={category.name}
            count={count(facets?.byCategory[category.id])}
            checked={filter.categorySlug === category.slug}
            onSelect={() => {
              onChange({ ...filter, categorySlug: category.slug });
            }}
          />
        ))}
      </Group>
      <Button onClick={onClose}>Done</Button>
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="pb-1 text-sm font-semibold text-neutral-600 uppercase dark:text-neutral-400">
        {legend}
      </legend>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</div>
    </fieldset>
  );
}

type OptionProps = {
  name: string;
  label: string;
  count: number | undefined;
  checked: boolean;
  onSelect: () => void;
};

function Option({ name, label, count, checked, onSelect }: OptionProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="size-5 accent-neutral-900 dark:accent-white"
      />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {count !== undefined && (
        <span className="text-sm text-neutral-600 tabular-nums dark:text-neutral-400">{count}</span>
      )}
    </label>
  );
}
