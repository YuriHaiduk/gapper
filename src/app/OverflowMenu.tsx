import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ICON_BUTTON } from '@/components/ui/styles';
import { syncStatusLabel, type SyncStatusLabel } from '@/domain/syncStatus';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSignOut } from '@/hooks/useSignOut';
import { useSyncStatus } from '@/sync/useSyncStatus';
import { SyncPanel } from './SyncPanel';

const ITEM =
  'flex min-h-11 w-full items-center px-4 text-left text-base hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800';

/** Accessible name of the ⋯ button: the indicator dot is announced with it (D52). */
function menuLabel(status: SyncStatusLabel): string {
  return status.kind === 'error' || status.kind === 'pending' || status.kind === 'offline'
    ? `Menu, ${status.text}`
    : 'Menu';
}

/** Header ⋯ menu (SPEC §6) with the sync status line and indicator (SPEC §15.6, D52). */
export function OverflowMenu() {
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // "Synced · 2 min ago" is computed when the menu opens (render stays pure).
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const online = useOnlineStatus();
  const { syncing, syncNow, pendingCount, failedCount, lastSyncAt } = useSyncStatus();
  const { signingOut, signOut } = useSignOut();
  const status = syncStatusLabel(
    { online, syncing, pending: pendingCount, failed: failedCount, lastSyncAt },
    now,
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={menuLabel(status)}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setNow(Date.now());
          setOpen((value) => !value);
        }}
        className={`${ICON_BUTTON} relative`}
      >
        <span aria-hidden="true">⋯</span>
        {status.kind === 'error' ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[11px] leading-none font-bold text-white dark:bg-white dark:text-neutral-950"
          >
            !
          </span>
        ) : (
          pendingCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-2 right-2 size-2 rounded-full bg-neutral-500"
            />
          )
        )}
      </button>
      {open && (
        <ul
          id={menuId}
          className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <li aria-live="polite">
            {status.kind === 'error' ? (
              <button
                type="button"
                className={`${ITEM} font-semibold`}
                onClick={() => {
                  setOpen(false);
                  setPanelOpen(true);
                }}
              >
                <span aria-hidden="true">{'⚠︎ '}</span>
                Sync error — details
              </button>
            ) : (
              <p className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">
                {status.text}
              </p>
            )}
          </li>
          <li>
            <button
              type="button"
              className={ITEM}
              disabled={syncing || !online}
              onClick={() => {
                setOpen(false);
                void syncNow();
              }}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </li>
          <li>
            <Link
              to="/categories"
              className={ITEM}
              onClick={() => {
                setOpen(false);
              }}
            >
              Categories
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={ITEM}
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </li>
        </ul>
      )}
      <SyncPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
        }}
      />
    </div>
  );
}
