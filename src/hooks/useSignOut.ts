import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { useSyncStatus } from '@/sync/useSyncStatus';

function unsyncedMessage(count: number): string {
  const changes = count === 1 ? '1 unsynced change' : `${String(count)} unsynced changes`;
  return `You have ${changes}. Signing out will discard them.`;
}

/**
 * Sign out (SPEC §9, AC-6): confirm when changes are unsynced (D32), end the session, wipe
 * local data (D20, D49), go to `/login`.
 */
export function useSignOut(): { signingOut: boolean; signOut: () => Promise<void> } {
  const { signOut: endSession } = useAuth();
  const { pendingCount, resetLocalData } = useSyncStatus();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (pendingCount > 0 && !window.confirm(unsyncedMessage(pendingCount))) return;
    setSigningOut(true);
    // Session first: sync triggers stop, then the wipe waits for a run in flight.
    await endSession();
    await resetLocalData();
    // Replace whatever `/login?redirect=…` the guard may have produced on the auth event.
    await navigate('/login', { replace: true });
  }, [pendingCount, endSession, resetLocalData, navigate]);

  return { signingOut, signOut };
}
