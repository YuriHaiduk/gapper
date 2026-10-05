import { useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from '@/components/ui/icons';
import { FOCUS_RING } from '@/components/ui/styles';
import { formatDuration } from '@/domain/audio';

type AudioPlayerProps = {
  blob: Blob;
  /** Detail page: ≥ 56 px button (SPEC §7.5); the form uses the 44 px size. */
  large?: boolean;
  /** Accessible name of the Play/Pause button, e.g. "Play pronunciation". */
  label?: string;
};

/** Play/Pause + progress for a local recording, played via an object URL (SPEC §10.4). */
export function AudioPlayer({ blob, large = false, label = 'pronunciation' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  // The URL lives exactly as long as this blob is shown; pausing on cleanup stops playback
  // when the page or the card changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const url = URL.createObjectURL(blob);
    audio.src = url;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setFailed(false);
    audio.play().catch((error: unknown) => {
      console.warn('Audio playback failed', error);
      setFailed(true);
    });
  }

  // MediaRecorder webm files may report an infinite duration until fully played.
  const knownDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = knownDuration ? Math.min(time / knownDuration, 1) : 0;
  const size = large ? 'size-14' : 'size-11';

  return (
    <div className="flex items-center gap-3">
      {/* A spoken word has no meaningful caption track; the card title is its text. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(event) => {
          setTime(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          setTime(0);
        }}
        onDurationChange={(event) => {
          setDuration(event.currentTarget.duration);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 ${FOCUS_RING} focus-visible:outline-offset-2`}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        >
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-sm text-neutral-600 tabular-nums dark:text-neutral-400">
          {failed
            ? "Couldn't play audio."
            : formatDuration(time * 1000) +
              (knownDuration ? ` / ${formatDuration(knownDuration * 1000)}` : '')}
        </span>
      </div>
    </div>
  );
}
