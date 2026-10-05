import { useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';

/** Last-resort boundary for render errors so the screen is never blank. */
export function RouteErrorPage() {
  console.error(useRouteError());
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-neutral-600 dark:text-neutral-400">Reload the app to continue.</p>
      <Button
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload
      </Button>
    </main>
  );
}
