import { useId, type ComponentProps } from 'react';
import { ErrorText } from './ErrorText';
import { FIELD } from './styles';

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: string;
  error?: string | undefined;
};

/** Multiline field; grows with its content where `field-sizing` is supported. */
export function TextArea({ label, error, className = '', rows = 2, ...rest }: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${FIELD} field-sizing-content py-2`}
        {...rest}
      />
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}
