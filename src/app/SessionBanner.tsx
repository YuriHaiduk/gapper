import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { FOCUS_RING } from '@/components/ui/styles';
import { useSyncStatus } from '@/sync/useSyncStatus';

/**
 * "Session expired — Sign in again" (SPEC §9, D50). Local data and the outbox are kept;
 * after signing in as the same user, sync resumes.
 */
export function SessionBanner() {
  const { status, expireSession } = useAuth();
  const { sessionExpired } = useSyncStatus();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  async function signInAgain() {
    // The API rejected a session supabase-js still holds: end it locally, keep the data.
    if (status === 'signed_in') await expireSession();
    await navigate(`/login?redirect=${encodeURIComponent(pathname + search)}`);
  }

  return (
    <div aria-live="polite">
      {sessionExpired && (
        <p className="flex flex-wrap items-center justify-center gap-x-2 border-b border-neutral-300 px-4 py-1 text-center text-sm font-semibold dark:border-neutral-700">
          <span>
            <span aria-hidden="true">{'⚠︎ '}</span>Session expired —
          </span>
          <button
            type="button"
            onClick={() => void signInAgain()}
            className={`min-h-11 rounded-lg px-2 underline underline-offset-4 ${FOCUS_RING}`}
          >
            Sign in again
          </button>
        </p>
      )}
    </div>
  );
}
