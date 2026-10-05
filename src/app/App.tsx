import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from '@/auth/AuthProvider';
import type { EnvResult } from '@/lib/env';
import { getSyncService } from '@/sync';
import { SyncProvider } from '@/sync/SyncProvider';
import { ConfigErrorScreen } from './ConfigErrorScreen';
import { getRouter } from './router';

type AppProps = { envResult: EnvResult };

export function App({ envResult }: AppProps) {
  if (!envResult.ok) return <ConfigErrorScreen problems={envResult.problems} />;

  return (
    <AuthProvider>
      <SyncProvider service={getSyncService()}>
        <RouterProvider router={getRouter()} />
      </SyncProvider>
    </AuthProvider>
  );
}
