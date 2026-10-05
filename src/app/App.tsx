import type { EnvResult } from '@/lib/env';
import { ConfigErrorScreen } from './ConfigErrorScreen';

type AppProps = { envResult: EnvResult };

export function App({ envResult }: AppProps) {
  if (!envResult.ok) return <ConfigErrorScreen problems={envResult.problems} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-2 px-[max(1rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <h1 className="text-3xl font-bold">Gapper</h1>
      <p className="text-neutral-600 dark:text-neutral-400">Personal vocabulary cards</p>
    </main>
  );
}
