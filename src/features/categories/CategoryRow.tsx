import { cardCountLabel } from '@/domain/categories';
import type { Category } from '@/domain/types';
import { FOCUS_RING } from '@/components/ui/styles';

const ACTION = `min-h-11 rounded-lg px-3 text-base font-medium hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800 ${FOCUS_RING}`;

type CategoryRowProps = {
  category: Category;
  count: number;
  disabled: boolean;
  onRename: () => void;
  onDelete: () => void;
};

function LockIcon() {
  return (
    <svg
      role="img"
      aria-label="Locked"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-5 text-neutral-400"
    >
      <title>Locked</title>
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** One category: name, card count and actions; `Other` is locked (SPEC §8.1). */
export function CategoryRow({ category, count, disabled, onRename, onDelete }: CategoryRowProps) {
  return (
    <div className="flex min-h-16 items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{category.name}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{cardCountLabel(count)}</p>
      </div>
      {category.is_system ? (
        <span className="flex size-11 items-center justify-center">
          <LockIcon />
        </span>
      ) : (
        <>
          <button
            type="button"
            aria-label={`Rename ${category.name}`}
            disabled={disabled}
            onClick={onRename}
            className={ACTION}
          >
            Rename
          </button>
          <button
            type="button"
            aria-label={`Delete ${category.name}`}
            disabled={disabled}
            onClick={onDelete}
            className={`${ACTION} underline underline-offset-4`}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
