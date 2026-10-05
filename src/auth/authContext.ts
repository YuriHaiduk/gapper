import { createContext } from 'react';
import type { AuthUser, SignInResult } from './authService';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signed_out'; user: null }
  | { status: 'signed_in'; user: AuthUser };

export type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
