import { Spinner } from '@/components/ui/Spinner';

export function SplashScreen() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-4"
    >
      <span className="text-3xl font-bold">Gapper</span>
      <Spinner className="size-6 text-indigo-600" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
