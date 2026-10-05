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
