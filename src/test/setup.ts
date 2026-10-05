import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { wipeLocalData } from '@/db/database';

// jsdom has no layout; ScrollRestoration calls scrollTo on every navigation.
window.scrollTo = () => undefined;

// jsdom has no <dialog> methods; mimic the open attribute and the `close` event.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

// jsdom has no layout; ProseMirror measures ranges when it scrolls the selection into view.
const emptyRect = () => new DOMRect();
Range.prototype.getBoundingClientRect = emptyRect;
Range.prototype.getClientRects = () => Object.assign([], { item: () => null });

beforeEach(async () => {
  await wipeLocalData();
});

afterEach(() => {
  cleanup();
});

// jsdom has no object URLs and no media playback.
URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => undefined;
HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
  this.dispatchEvent(new Event('play'));
  return Promise.resolve();
};
HTMLMediaElement.prototype.pause = function pause(this: HTMLMediaElement) {
  this.dispatchEvent(new Event('pause'));
};
