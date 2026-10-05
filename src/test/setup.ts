import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout; ScrollRestoration calls scrollTo on every navigation.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
});
