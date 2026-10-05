import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';
import { FOCUS_RING } from './styles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  pending?: boolean;
};

const VARIANTS = {
  primary:
    'bg-neutral-900 text-white hover:bg-black disabled:bg-neutral-400 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-600',
  secondary:
    'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800',
} as const;

/** Button look for links that act as buttons (e.g. empty-state actions). */
export function buttonClassName(
  variant: keyof typeof VARIANTS = 'primary',
  className = '',
): string {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-base font-medium focus-visible:outline-offset-2 ${FOCUS_RING} disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`;
}

export function Button({
  variant = 'primary',
  pending = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || pending}
      aria-busy={pending || undefined}
      className={buttonClassName(variant, className)}
      {...rest}
    >
      {pending && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
