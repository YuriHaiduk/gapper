import { CARD_STATUSES } from '@/domain/constants';
import { statusLabel } from '@/domain/cardFilter';
import type { CardStatus } from '@/domain/types';

type StatusFieldProps = {
  value: CardStatus;
  disabled: boolean;
  onChange: (status: CardStatus) => void;
};

/** Learning / Learned as two large segmented radio buttons (selected = filled). */
export function StatusField({ value, disabled, onChange }: StatusFieldProps) {
  return (
    <fieldset className="flex flex-col gap-1" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">Status</legend>
      <div className="grid grid-cols-2 gap-2">
        {CARD_STATUSES.map((status) => (
          <label
            key={status}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 font-medium has-checked:border-neutral-900 has-checked:bg-neutral-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-black dark:border-neutral-700 dark:has-checked:border-white dark:has-checked:bg-white dark:has-checked:text-neutral-950 dark:has-focus-visible:outline-white"
          >
            <input
              type="radio"
              name="status"
              value={status}
              checked={value === status}
              onChange={() => {
                onChange(status);
              }}
              className="sr-only"
            />
            {statusLabel(status)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
