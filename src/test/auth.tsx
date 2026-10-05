import { useMemo, useState, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/router';
import { AuthContext, type AuthContextValue, type AuthState } from '@/auth/authContext';
import type { SignInResult } from '@/auth/authService';
import { SyncProvider } from '@/sync/SyncProvider';
import type { SyncService } from '@/sync/syncService';

export const TEST_USER = { id: 'user-1', email: 'owner@example.com' };
const BASENAME = '/gapper/';

/** Sync service stand-in: never touches the network. */
export const fakeSyncService: SyncService = {
  sync: () => Promise.resolve({ status: 'ok', pushed: 0, pulled: 0, rejected: 0 }),
};

type FakeAuthProps = {
  initialStatus: AuthState['status'];
  signIn?: (email: string, password: string) => Promise<SignInResult>;
  children: ReactNode;
};

/** Stateful stand-in for AuthProvider: a successful signIn flips the state like Supabase does. */
function FakeAuthProvider({ initialStatus, signIn, children }: FakeAuthProps) {
  const [state, setState] = useState<AuthState>(
    initialStatus === 'signed_in'
      ? { status: 'signed_in', user: TEST_USER }
      : { status: initialStatus, user: null },
  );
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (email, password) => {
        const result = await (signIn ?? (() => Promise.resolve<SignInResult>({ ok: true })))(
          email,
          password,
        );
        if (result.ok) setState({ status: 'signed_in', user: TEST_USER });
        return result;
      },
      signOut: () => {
        setState({ status: 'signed_out', user: null });
        return Promise.resolve();
      },
    }),
    [state, signIn],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Renders the real route table in memory at `path` (relative to the base path). */
export function renderApp(
  path: string,
  options: Omit<FakeAuthProps, 'children'> = { initialStatus: 'signed_in' },
) {
  const router = createMemoryRouter(routes, {
    basename: BASENAME,
    initialEntries: [BASENAME.slice(0, -1) + path],
  });
  render(
    <FakeAuthProvider {...options}>
      <SyncProvider service={fakeSyncService}>
        <RouterProvider router={router} />
      </SyncProvider>
    </FakeAuthProvider>,
  );
  return {
    router,
    /** Current location as the app sees it (without the base path). */
    location: () => {
      const { pathname, search } = router.state.location;
      return pathname.slice(BASENAME.length - 1) + search;
    },
  };
}
