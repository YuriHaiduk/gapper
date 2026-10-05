import { useId, type ComponentProps } from 'react';
import { FIELD } from './styles';

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & { label: string };

/** Native select: the iOS picker wheel on iPhone, a dropdown on desktop. */
export function Select({ label, className = '', children, ...rest }: SelectProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} className={FIELD} {...rest}>
        {children}
      </select>
    </div>
  );
}
