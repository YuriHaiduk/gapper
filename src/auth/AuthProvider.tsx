import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type AuthState } from './authContext';
import { onAuthChange, signIn, signOut as endSession } from './authService';
import { nextAuthState } from './authState';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  // True while the owner's own sign-out runs: its SIGNED_OUT event is not an expiry.
  const ownSignOut = useRef(false);

  useEffect(
    () =>
      onAuthChange((event, user) => {
        const own = ownSignOut.current;
        setState((previous) => nextAuthState(previous, event, user, own));
      }),
    [],
  );

  const signOut = useCallback(async () => {
    ownSignOut.current = true;
    try {
      await endSession();
    } finally {
      ownSignOut.current = false;
    }
    // Also covers signing out while expired (no session left, so no event).
    setState({ status: 'signed_out', user: null });
  }, []);

  const expireSession = useCallback(async () => {
    await endSession();
    setState((previous) => ({ status: 'expired', user: previous.user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, expireSession }),
    [state, signOut, expireSession],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
