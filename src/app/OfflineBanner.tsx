import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <div aria-live="polite">
      {!online && (
        <p className="bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-950">
          Offline — changes will sync later
        </p>
      )}
    </div>
  );
}
