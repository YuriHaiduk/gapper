import type { ReactNode } from 'react';

type HeaderRowProps = { left?: ReactNode; center: ReactNode; right: ReactNode };

/** The 56 px app header row: left control · center · right menu (SPEC §6 App shell). */
export function HeaderRow({ left, center, right }: HeaderRowProps) {
  return (
    <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]">
      <div className="flex w-11 justify-start">{left}</div>
      <div className="flex min-w-0 flex-1 justify-center">{center}</div>
      <div className="flex w-11 justify-end">{right}</div>
    </div>
  );
}
