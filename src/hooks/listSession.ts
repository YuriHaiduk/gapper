import { PAGE_SIZE } from '@/domain/constants';

/**
 * Per-tab list state keyed by the canonical query (SPEC §12): how many cards were loaded and
 * where the list was scrolled when a card was opened. Storage errors (private mode) are ignored.
 */
const countKey = (query: string) => `gapper:cards:count:${query}`;
const scrollKey = (query: string) => `gapper:cards:scroll:${query}`;

function read(key: string): number | null {
  try {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

export function readVisibleCount(query: string): number {
  const count = read(countKey(query));
  return count !== null && count % PAGE_SIZE === 0 ? count : PAGE_SIZE;
}

export function writeVisibleCount(query: string, count: number): void {
  write(countKey(query), count);
}

export function readScrollY(query: string): number | null {
  return read(scrollKey(query));
}

export function writeScrollY(query: string, y: number): void {
  write(scrollKey(query), y);
}
