import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

export type AuthUser = { id: string; email: string | null };
export type SignInError = 'invalid_credentials' | 'offline' | 'unknown';
export type SignInResult = { ok: true } | { ok: false; error: SignInError };

function toUser(session: Session | null): AuthUser | null {
  return session ? { id: session.user.id, email: session.user.email ?? null } : null;
}

export function mapSignInError(error: unknown, online: boolean): SignInError {
  if (!online || isAuthRetryableFetchError(error)) return 'offline';
  if (isAuthApiError(error) && error.code === 'invalid_credentials') return 'invalid_credentials';
  return 'unknown';
}

/**
 * Subscribes to auth state. The first call delivers the locally persisted session
 * (`INITIAL_SESSION`), so the app can start offline. Returns an unsubscribe function.
 */
export function onAuthChange(listener: (user: AuthUser | null) => void): () => void {
  // Sync callback on purpose: async callbacks are deprecated (deadlock risk on refresh).
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    listener(toUser(session));
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!navigator.onLine) return { ok: false, error: 'offline' };
  try {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: mapSignInError(error, navigator.onLine) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapSignInError(error, navigator.onLine) };
  }
}

export async function signOut(): Promise<void> {
  // `local` scope clears this device even when offline; other devices stay signed in.
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) console.warn('Sign out failed', error);
}
