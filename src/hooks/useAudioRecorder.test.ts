import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeMediaRecorder, installMediaFakes, uninstallMediaFakes } from '@/test/mediaRecorder';
import { useAudioRecorder } from './useAudioRecorder';

afterEach(() => {
  vi.useRealTimers();
  uninstallMediaFakes();
});

async function startRecording() {
  const hook = renderHook(() => useAudioRecorder());
  await act(() => hook.result.current.start());
  return hook;
}

describe('useAudioRecorder (T7)', () => {
  it('idle → recording → recorded with the preferred format; tracks stopped', async () => {
    const mic = installMediaFakes();
    const hook = renderHook(() => useAudioRecorder());
    expect(hook.result.current.state).toEqual({ status: 'idle' });

    await act(() => hook.result.current.start());
    expect(mic.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(hook.result.current.state).toEqual({ status: 'recording', elapsedMs: 0 });
    expect(FakeMediaRecorder.instances[0]?.mimeType).toBe('audio/mp4');

    act(() => {
      hook.result.current.stop();
    });
    expect(mic.tracks[0]?.stop).toHaveBeenCalled();
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('recorded');
    });
    const state = hook.result.current.state;
    if (state.status !== 'recorded') throw new Error('not recorded');
    expect(state.audio.mime).toBe('audio/mp4');
    expect(await state.audio.blob.text()).toBe('voice');
  });

  it('falls back to webm when mp4 is not supported', async () => {
    installMediaFakes();
    FakeMediaRecorder.supported = new Set(['audio/webm;codecs=opus', 'audio/webm']);
    await startRecording();
    expect(FakeMediaRecorder.instances[0]?.mimeType).toBe('audio/webm;codecs=opus');
  });

  it('AC-41: shows elapsed time and auto-stops at 60 s', async () => {
    vi.useFakeTimers();
    installMediaFakes();
    const hook = await startRecording();

    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(hook.result.current.state).toEqual({ status: 'recording', elapsedMs: 7_000 });

    await act(async () => {
      vi.advanceTimersByTime(53_000);
      await Promise.resolve();
    });
    expect(FakeMediaRecorder.instances[0]?.state).toBe('inactive');
    expect(hook.result.current.state.status).toBe('recorded');
  });

  it('AC-42: permission denied', async () => {
    installMediaFakes({ deny: true });
    const hook = await startRecording();
    expect(hook.result.current.state).toEqual({ status: 'denied' });
  });

  it('reports unsupported browsers', async () => {
    const hook = renderHook(() => useAudioRecorder());
    await act(() => hook.result.current.start());
    expect(hook.result.current.state).toEqual({ status: 'unsupported' });
  });

  it('reset discards the recording and releases the microphone', async () => {
    const mic = installMediaFakes();
    const hook = await startRecording();
    act(() => {
      hook.result.current.reset();
    });
    expect(mic.tracks[0]?.stop).toHaveBeenCalled();
    await act(() => Promise.resolve());
    expect(hook.result.current.state).toEqual({ status: 'idle' });
  });

  it('unmount stops the recorder and the microphone tracks', async () => {
    const mic = installMediaFakes();
    const hook = await startRecording();
    hook.unmount();
    expect(FakeMediaRecorder.instances[0]?.state).toBe('inactive');
    expect(mic.tracks[0]?.stop).toHaveBeenCalled();
  });
});
