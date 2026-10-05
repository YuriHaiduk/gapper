import type { AuthState } from './authContext';
import type { AuthEvent, AuthUser } from './authService';

/**
 * Next auth state for a Supabase auth event (D50). A session that disappears without the
 * owner signing out — `SIGNED_OUT` from a rejected refresh — becomes `expired`, and stays so
 * through the `INITIAL_SESSION` (null) that follows on a cold start.
 */
export function nextAuthState(
  previous: AuthState,
  event: AuthEvent,
  user: AuthUser | null,
  ownSignOut: boolean,
): AuthState {
  if (user) return { status: 'signed_in', user };
  if (ownSignOut) return { status: 'signed_out', user: null };
  if (event === 'SIGNED_OUT') return { status: 'expired', user: previous.user };
  if (previous.status === 'expired') return previous;
  return { status: 'signed_out', user: null };
}
