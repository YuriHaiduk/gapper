import { describe, expect, it } from 'vitest';
import { audioPath, baseMime, extensionFor, formatDuration, pickMimeType } from './audio';

describe('pickMimeType', () => {
  it('prefers audio/mp4, then webm with opus, then plain webm', () => {
    expect(pickMimeType(() => true)).toBe('audio/mp4');
    expect(pickMimeType((m) => m.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((m) => m === 'audio/webm')).toBe('audio/webm');
  });

  it('falls back to the browser default', () => {
    expect(pickMimeType(() => false)).toBe('');
  });
});

describe('baseMime / extensionFor', () => {
  it('strips parameters', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('audio/mp4')).toBe('audio/mp4');
  });

  it('maps types to extensions', () => {
    expect(extensionFor('audio/mp4')).toBe('m4a');
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionFor('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extensionFor('')).toBe('webm');
  });
});

describe('audioPath', () => {
  it('builds <user>/<card>/<recording>.<ext>', () => {
    expect(audioPath('u', 'c', 'r', 'audio/mp4')).toBe('u/c/r.m4a');
  });
});

describe('formatDuration', () => {
  it('formats m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7_400)).toBe('0:07');
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
});
