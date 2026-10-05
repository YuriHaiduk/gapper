import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { safeRedirect } from '@/domain/redirect';
import { SplashScreen } from './SplashScreen';

/**
 * Guard for `/login`. Also performs the post-login redirect: the session change re-renders
 * this guard, so the login form itself never navigates (no race with the auth event).
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') return <SplashScreen />;
  if (status === 'signed_in') {
    return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />;
  }
  return children;
}
