import type { ReactNode } from 'react';

/** Inline monochrome icons (`currentColor`), decorative unless labelled by the caller. */
type IconProps = { className?: string };

export function SearchIcon({ className = 'size-6' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SpeakerIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

export function PlusIcon({ className = 'size-7' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function StrokeIcon({ className = 'size-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </StrokeIcon>
  );
}

export function BulletListIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </StrokeIcon>
  );
}

export function NumberedListIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M3.5 9h3.5M3.5 14.5a1.5 1.5 0 1 1 2.6 1L3.5 19.5h3.5" />
    </StrokeIcon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </StrokeIcon>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </StrokeIcon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </StrokeIcon>
  );
}

export function PlayIcon({ className = 'size-6' }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function PauseIcon({ className = 'size-6' }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function StopIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
