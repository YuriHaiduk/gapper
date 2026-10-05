import { useId, type ComponentProps } from 'react';
import { ErrorText } from './ErrorText';
import { FOCUS_RING } from './styles';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  error?: string | undefined;
};

export function TextField({ label, error, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        // 16 px text prevents iOS zoom on focus.
        className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus-visible:border-black disabled:opacity-60 aria-invalid:border-2 aria-invalid:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:border-white dark:aria-invalid:border-neutral-100 ${FOCUS_RING}`}
        {...rest}
      />
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}
