import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { SplashScreen } from './SplashScreen';

/** Layout route guarding every protected page (SPEC §9); an expired session gets through (D50). */
export function RequireAuth() {
  const { status } = useAuth();
  const { pathname, search } = useLocation();

  if (status === 'loading') return <SplashScreen />;
  if (status === 'signed_out') {
    const redirect = encodeURIComponent(pathname + search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}
