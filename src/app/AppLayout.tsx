import type { ComponentType, ReactNode } from 'react';
import { Link, Outlet, useMatches } from 'react-router';
import { HeaderRow } from '@/components/ui/HeaderRow';
import { ICON_BUTTON } from '@/components/ui/styles';
import { OfflineBanner } from './OfflineBanner';
import { OverflowMenu } from './OverflowMenu';

export type RouteHandle = {
  title?: string;
  back?: string;
  /** Replaces the default back · title · menu row (e.g. the card list's filter header). */
  Header?: ComponentType<{ menu: ReactNode }>;
};

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null;
}

/** Shell for protected pages: sticky safe-area header, offline banner, page outlet. */
export function AppLayout() {
  const matches = useMatches();
  const handle = matches.map((match) => match.handle).findLast(isRouteHandle);
  const Header = handle?.Header;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        {Header ? (
          <Header menu={<OverflowMenu />} />
        ) : (
          <HeaderRow
            left={
              handle?.back && (
                <Link to={handle.back} aria-label="Back" className={ICON_BUTTON}>
                  <span aria-hidden="true">‹</span>
                </Link>
              )
            }
            center={
              <h1 className="truncate text-center text-lg font-semibold">
                {handle?.title ?? 'Gapper'}
              </h1>
            }
            right={<OverflowMenu />}
          />
        )}
      </header>
      <OfflineBanner />
      <main className="mx-auto w-full max-w-2xl flex-1 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        <Outlet />
      </main>
    </div>
  );
}
