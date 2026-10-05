type SpinnerProps = { className?: string };

export function Spinner({ className = 'size-5' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${className}`}
    />
  );
}
