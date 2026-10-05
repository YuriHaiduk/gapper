import type { ComponentProps } from 'react';

type ErrorTextProps = Omit<ComponentProps<'p'>, 'children'> & { children: string };

/** Error/warning line: marked by weight and a ⚠ glyph, never by color (SPEC §6). */
export function ErrorText({ children, className = '', ...rest }: ErrorTextProps) {
  return (
    <p className={`text-sm font-semibold ${className}`} {...rest}>
      <span aria-hidden="true">{'\u26A0\uFE0E '}</span>
      <span>{children}</span>
    </p>
  );
}
