import { vi } from 'vitest';

/** Minimal `MediaStreamTrack` whose `stop()` can be asserted. */
export class FakeTrack {
  readyState: 'live' | 'ended' = 'live';
  stop = vi.fn(() => {
    this.readyState = 'ended';
  });
}

/** Minimal `MediaRecorder`: emits one chunk and `stop` asynchronously, like browsers do. */
export class FakeMediaRecorder extends EventTarget {
  static supported = new Set(['audio/mp4']);
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported(mime: string): boolean {
    return FakeMediaRecorder.supported.has(mime);
  }

  state: 'inactive' | 'recording' = 'inactive';
  readonly mimeType: string;
  readonly stream: { getTracks: () => FakeTrack[] };

  constructor(stream: { getTracks: () => FakeTrack[] }, options?: { mimeType?: string }) {
    super();
    this.stream = stream;
    this.mimeType = options?.mimeType ?? 'audio/webm';
    FakeMediaRecorder.instances.push(this);
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    queueMicrotask(() => {
      const data = new Blob(['voice'], { type: this.mimeType });
      this.dispatchEvent(Object.assign(new Event('dataavailable'), { data }));
      this.dispatchEvent(new Event('stop'));
    });
  }
}

export type FakeMic = {
  tracks: FakeTrack[];
  getUserMedia: ReturnType<typeof vi.fn>;
};

/**
 * Installs `MediaRecorder` and `navigator.mediaDevices.getUserMedia` fakes. `deny` makes the
 * permission request fail with `NotAllowedError`. Undo with `uninstallMediaFakes()`.
 */
export function installMediaFakes({ deny = false } = {}): FakeMic {
  const tracks: FakeTrack[] = [];
  const getUserMedia = vi.fn(() => {
    if (deny) return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    const track = new FakeTrack();
    tracks.push(track);
    return Promise.resolve({ getTracks: () => [track] });
  });
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.supported = new Set(['audio/mp4']);
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  return { tracks, getUserMedia };
}

export function uninstallMediaFakes(): void {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
}
