import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from '@/auth/AuthProvider';
import type { EnvResult } from '@/lib/env';
import { ConfigErrorScreen } from './ConfigErrorScreen';
import { getRouter } from './router';

type AppProps = { envResult: EnvResult };

export function App({ envResult }: AppProps) {
  if (!envResult.ok) return <ConfigErrorScreen problems={envResult.problems} />;

  return (
    <AuthProvider>
      <RouterProvider router={getRouter()} />
    </AuthProvider>
  );
}
