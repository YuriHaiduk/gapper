import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';
import { useHasUnsavedChanges } from '@/hooks/unsavedChanges';

let watchingVisibility = false;

/**
 * The installed iOS app can stay in memory for days without a navigation, so the browser's
 * own update check never runs; check again whenever the app comes to the foreground (D55).
 */
function checkForUpdatesOnForeground(registration: ServiceWorkerRegistration | undefined) {
  if (!registration || watchingVisibility) return;
  watchingVisibility = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (registration.installing) return;
    registration.update().catch(() => undefined);
  });
}

/**
 * "New version available · Reload" toast (SPEC §22, AC-61). Registers the service worker;
 * hidden while a form has unsaved changes so a reload never discards typed data (D55).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      checkForUpdatesOnForeground(registration);
    },
  });
  const formDirty = useHasUnsavedChanges();
  const visible = needRefresh && !formDirty;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {visible && (
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-lg border border-neutral-300 bg-white py-2 pr-2 pl-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <p className="flex-1 text-sm font-medium">New version available</p>
          <Button
            variant="secondary"
            onClick={() => {
              setNeedRefresh(false);
            }}
          >
            Later
          </Button>
          <Button onClick={() => void updateServiceWorker(true)}>Reload</Button>
        </div>
      )}
    </div>
  );
}
