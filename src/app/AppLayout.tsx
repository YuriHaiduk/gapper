import { Link, Outlet, useMatches } from 'react-router';
import { OfflineBanner } from './OfflineBanner';
import { OverflowMenu } from './OverflowMenu';

export type RouteHandle = { title?: string; back?: string };

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null;
}

/** Shell for protected pages: sticky safe-area header, offline banner, page outlet. */
export function AppLayout() {
  const matches = useMatches();
  const handle = matches.map((match) => match.handle).findLast(isRouteHandle);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]">
          <div className="flex w-11 justify-start">
            {handle?.back && (
              <Link
                to={handle.back}
                aria-label="Back"
                className="flex size-11 items-center justify-center rounded-lg text-2xl hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-neutral-800"
              >
                <span aria-hidden="true">‹</span>
              </Link>
            )}
          </div>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold">
            {handle?.title ?? 'Gapper'}
          </h1>
          <div className="flex w-11 justify-end">
            <OverflowMenu />
          </div>
        </div>
      </header>
      <OfflineBanner />
      <main className="mx-auto w-full max-w-2xl flex-1 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        <Outlet />
      </main>
    </div>
  );
}
