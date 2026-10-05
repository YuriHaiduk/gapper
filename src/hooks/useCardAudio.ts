import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getAudioBlob } from '@/repositories/local/audioLocalRepo';
import { useSyncStatus } from '@/sync/useSyncStatus';
import { useOnlineStatus } from './useOnlineStatus';

export type CardAudio =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; blob: Blob }
  | { status: 'offline' }
  | { status: 'error'; retry: () => void };

/**
 * A card's recording for playback (SPEC §10.4): the local blob if cached, otherwise it is
 * downloaded and cached at once while online (D48); offline without a copy → `offline`.
 */
export function useCardAudio(path: string | null, cardId: string): CardAudio {
  const online = useOnlineStatus();
  const { downloadAudio } = useSyncStatus();
  // Tagged with the path: useLiveQuery keeps the previous card's result while re-querying.
  const query = useLiveQuery(
    async () => ({ path, row: path ? ((await getAudioBlob(path)) ?? null) : null }),
    [path],
  );
  const cached = query?.path === path ? query.row : undefined;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const missing = path !== null && cached === null;
  const failed = failedPath !== null && failedPath === path;

  useEffect(() => {
    if (!path || !missing || !online || failed) return;
    let active = true;
    downloadAudio(path, cardId).catch((error: unknown) => {
      console.warn('Audio download failed', error);
      if (active) setFailedPath(path);
    });
    return () => {
      active = false;
    };
  }, [path, cardId, missing, online, failed, downloadAudio]);

  if (!path) return { status: 'none' };
  if (cached) return { status: 'ready', blob: cached.blob };
  if (cached === undefined) return { status: 'loading' };
  if (!online) return { status: 'offline' };
  if (failed) {
    return {
      status: 'error',
      retry: () => {
        setFailedPath(null);
      },
    };
  }
  return { status: 'loading' };
}
