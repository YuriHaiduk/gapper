import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { MicIcon, StopIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { AUDIO_MAX_MS, formatDuration } from '@/domain/audio';
import type { AudioChange } from '@/domain/types';
import { useAudioRecorder, type RecorderState } from '@/hooks/useAudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { CardAudio } from './CardAudio';

export const MIC_DENIED =
  'Microphone access is blocked. Enable it in Settings → Safari → Microphone.';
export const RECORDING_UNSUPPORTED = "Recording isn't supported in this browser.";
export const RECORDING_FAILED = "Couldn't record. Try again.";

const PROBLEMS: Partial<Record<RecorderState['status'], string>> = {
  denied: MIC_DENIED,
  unsupported: RECORDING_UNSUPPORTED,
  error: RECORDING_FAILED,
};

type AudioRecorderProps = {
  /** The saved card's recording (edit form), shown until replaced or removed. */
  existingPath: string | null;
  cardId: string | undefined;
  value: AudioChange;
  onChange: (change: AudioChange) => void;
  /** True while asking for the microphone or recording: the form can't be saved then (D46). */
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
};

/**
 * Pronunciation field of the card form (SPEC §10.1). Nothing is stored until the form is
 * saved; the result travels as an `AudioChange` (keep / replace / remove).
 */
export function AudioRecorder({
  existingPath,
  cardId,
  value,
  onChange,
  onBusyChange,
  disabled,
}: AudioRecorderProps) {
  const labelId = useId();
  const { state, start, stop, reset } = useAudioRecorder();
  const busy = state.status === 'requesting' || state.status === 'recording';

  // A finished recording becomes the form value; the recorder is ready for "Re-record".
  useEffect(() => {
    if (state.status !== 'recorded') return;
    onChange({ kind: 'replace', audio: state.audio });
    reset();
  }, [state, onChange, reset]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const record = () => void start();
  const problem = PROBLEMS[state.status];
  const keepExisting = value.kind === 'keep' && existingPath !== null;

  let body;
  if (state.status === 'requesting') {
    body = (
      <p
        role="status"
        className="flex min-h-11 items-center gap-2 text-neutral-600 dark:text-neutral-400"
      >
        <Spinner className="size-4" />
        Allow microphone access…
      </p>
    );
  } else if (state.status === 'recording') {
    body = (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-3 rounded-full bg-red-600 motion-safe:animate-pulse"
        />
        <span role="timer" aria-label="Recording time" className="tabular-nums">
          {formatDuration(state.elapsedMs)} / {formatDuration(AUDIO_MAX_MS)}
        </span>
        <Button onClick={stop} className="ml-auto min-h-14 px-6">
          <StopIcon />
          Stop
        </Button>
      </div>
    );
  } else if (value.kind === 'replace') {
    body = (
      <div className="flex flex-col gap-2">
        <AudioPlayer blob={value.audio.blob} label="recording" />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={disabled} onClick={record}>
            Re-record
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onChange({ kind: 'keep' });
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  } else if (keepExisting) {
    body = (
      <div className="flex flex-col gap-2">
        <CardAudio path={existingPath} cardId={cardId ?? ''} />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={disabled} onClick={record}>
            Replace
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onChange({ kind: 'remove' });
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        {value.kind === 'remove' && (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-600 dark:text-neutral-400">
            The recording will be removed when you save.
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange({ kind: 'keep' });
              }}
              className="min-h-11 font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100"
            >
              Undo
            </button>
          </p>
        )}
        <Button
          variant="secondary"
          disabled={disabled || state.status === 'unsupported'}
          onClick={record}
          className="self-start"
        >
          <MicIcon />
          {problem && state.status !== 'unsupported' ? 'Try again' : 'Record pronunciation'}
        </Button>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <span id={labelId} className="text-sm font-medium">
        Pronunciation
      </span>
      {body}
      {problem && <ErrorText role="alert">{problem}</ErrorText>}
    </div>
  );
}
