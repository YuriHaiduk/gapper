import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { clearDb } from '@/db/database';

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

beforeEach(async () => {
  await clearDb();
});

afterEach(() => {
  cleanup();
});
