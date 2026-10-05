import { Link } from 'react-router';
import { buttonClassName } from './Button';

type EmptyStateProps = { message: string; action?: { to: string; label: string } };

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
      {action && (
        <Link to={action.to} className={buttonClassName()}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
