type ConfigErrorScreenProps = { problems: string[] };

export function ConfigErrorScreen({ problems }: ConfigErrorScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-[max(1rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-semibold">Configuration error</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        The app is missing required settings. Copy <code>.env.example</code> to <code>.env</code>,
        fill in the values and restart the dev server.
      </p>
      <ul className="list-disc space-y-1 pl-5 font-semibold">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </main>
  );
}
