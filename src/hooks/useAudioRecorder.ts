import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_MAX_MS, pickMimeType } from '@/domain/audio';
import type { RecordedAudio } from '@/domain/types';

export type RecorderState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'recording'; elapsedMs: number }
  | { status: 'recorded'; audio: RecordedAudio }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error' };

/** How often the elapsed time is refreshed while recording. */
const TICK_MS = 250;

type Session = {
  recorder: MediaRecorder;
  stream: MediaStream;
  ticker?: number;
  limit?: number;
  /** Set when the result must be thrown away (reset, unmount). */
  discarded: boolean;
};

export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    // Missing outside secure contexts (http on a LAN IP) despite the DOM typings.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function endSession(session: Session, discard: boolean): void {
  if (discard) session.discarded = true;
  window.clearInterval(session.ticker);
  window.clearTimeout(session.limit);
  if (session.recorder.state !== 'inactive') session.recorder.stop();
  // The microphone is released at once, not when the recorder's stop event arrives.
  stopTracks(session.stream);
}

/**
 * Pronunciation recorder (SPEC §10.1, §10.2): picks the best supported format, auto-stops at
 * 60 s, stops microphone tracks on stop/reset/unmount. `start()` must run from a user gesture.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({ status: 'idle' });
  const session = useRef<Session | null>(null);
  // Bumped by every start/reset/unmount so a late getUserMedia result is ignored.
  const generation = useRef(0);

  const stop = useCallback(() => {
    if (session.current) endSession(session.current, false);
  }, []);

  const reset = useCallback(() => {
    generation.current++;
    if (session.current) endSession(session.current, true);
    session.current = null;
    setState({ status: 'idle' });
  }, []);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setState({ status: 'unsupported' });
      return;
    }
    const current = ++generation.current;
    if (session.current) endSession(session.current, true);
    session.current = null;
    setState({ status: 'requesting' });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (current !== generation.current) return;
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setState({ status: denied ? 'denied' : 'error' });
      return;
    }
    if (current !== generation.current) {
      stopTracks(stream);
      return;
    }

    const mimeType = pickMimeType((mime) => MediaRecorder.isTypeSupported(mime));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stopTracks(stream);
      setState({ status: 'error' });
      return;
    }
    const own: Session = { recorder, stream, discarded: false };
    session.current = own;
    const chunks: Blob[] = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('error', () => {
      endSession(own, true);
      if (session.current === own) setState({ status: 'error' });
    });
    recorder.addEventListener('stop', () => {
      endSession(own, false);
      if (own.discarded || session.current !== own) return;
      session.current = null;
      const mime = recorder.mimeType || mimeType;
      if (chunks.length === 0) {
        setState({ status: 'error' });
        return;
      }
      setState({ status: 'recorded', audio: { blob: new Blob(chunks, { type: mime }), mime } });
    });

    recorder.start();
    const startedAt = Date.now();
    setState({ status: 'recording', elapsedMs: 0 });
    own.ticker = window.setInterval(() => {
      const elapsedMs = Math.min(Date.now() - startedAt, AUDIO_MAX_MS);
      setState((s) => (s.status === 'recording' ? { status: 'recording', elapsedMs } : s));
    }, TICK_MS);
    // Auto-stop (AC-41); the recording is kept like after a manual Stop.
    own.limit = window.setTimeout(() => {
      endSession(own, false);
    }, AUDIO_MAX_MS);
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      if (session.current) endSession(session.current, true);
      session.current = null;
    },
    [],
  );

  return { state, start, stop, reset };
}
