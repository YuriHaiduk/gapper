import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <div aria-live="polite">
      {!online && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Offline — changes will sync later
        </p>
      )}
    </div>
  );
}
