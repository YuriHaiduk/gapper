import { Link } from 'react-router';
import { TEXT_LINK } from '@/components/ui/styles';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/cards" className={TEXT_LINK}>
        Go to cards
      </Link>
    </main>
  );
}
