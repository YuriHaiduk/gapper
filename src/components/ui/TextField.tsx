import { useId, type ComponentProps } from 'react';

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
        className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-60 aria-invalid:border-red-600 dark:border-neutral-700 dark:bg-neutral-900"
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
