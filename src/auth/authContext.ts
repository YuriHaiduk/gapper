import { createContext } from 'react';
import type { AuthUser, SignInResult } from './authService';

/**
 * `expired` — the session ended without the owner signing out (refresh token rejected):
 * local data and the outbox are kept, the app stays usable, sync is paused (SPEC §9, D50).
 */
export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signed_out'; user: null }
  | { status: 'expired'; user: AuthUser | null }
  | { status: 'signed_in'; user: AuthUser };

export type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Owner-initiated sign-out (the caller wipes local data). */
  signOut: () => Promise<void>;
  /** Ends a session the API rejected, keeping local data (state → `expired`). */
  expireSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
