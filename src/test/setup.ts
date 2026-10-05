import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { clearDb } from '@/db/database';

// jsdom has no layout; ScrollRestoration calls scrollTo on every navigation.
window.scrollTo = () => undefined;

beforeEach(async () => {
  await clearDb();
});

afterEach(() => {
  cleanup();
});
