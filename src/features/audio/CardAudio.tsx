import { ErrorText } from '@/components/ui/ErrorText';
import { Spinner } from '@/components/ui/Spinner';
import { useCardAudio } from '@/hooks/useCardAudio';
import { AudioPlayer } from './AudioPlayer';

const MUTED = 'flex min-h-11 items-center gap-2 text-neutral-600 dark:text-neutral-400';

/**
 * A saved card's recording: player when cached locally, otherwise downloading / offline /
 * error states (SPEC §7.5, §10.4, §25).
 */
export function CardAudio({
  path,
  cardId,
  large = false,
}: {
  path: string;
  cardId: string;
  large?: boolean;
}) {
  const audio = useCardAudio(path, cardId);
  switch (audio.status) {
    case 'ready':
      return <AudioPlayer blob={audio.blob} large={large} />;
    case 'offline':
      return <p className={MUTED}>Audio unavailable offline</p>;
    case 'error':
      return (
        <div className="flex min-h-11 flex-wrap items-center gap-x-2">
          <ErrorText>Couldn&apos;t load audio.</ErrorText>
          <button
            type="button"
            onClick={audio.retry}
            className="min-h-11 font-medium underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      );
    case 'none':
      return null;
    case 'loading':
      return (
        <p role="status" className={MUTED}>
          <Spinner className="size-4" />
          Loading audio…
        </p>
      );
  }
}
