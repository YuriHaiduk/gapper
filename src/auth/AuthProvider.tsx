import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type AuthState } from './authContext';
import { onAuthChange, signIn, signOut } from './authService';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(
    () =>
      onAuthChange((user) => {
        setState(user ? { status: 'signed_in', user } : { status: 'signed_out', user: null });
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(() => ({ ...state, signIn, signOut }), [state]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
