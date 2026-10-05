import { offlineBannerText } from '@/domain/syncStatus';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncStatus } from '@/sync/useSyncStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { pendingCount } = useSyncStatus();
  return (
    <div aria-live="polite">
      {!online && (
        <p className="bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-950">
          {offlineBannerText(pendingCount)}
        </p>
      )}
    </div>
  );
}
