import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link
        to="/cards"
        className="inline-flex min-h-11 items-center rounded-lg px-4 font-medium text-indigo-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-400"
      >
        Go to cards
      </Link>
    </main>
  );
}
