import { describe, expect, it } from 'vitest';
import {
  offlineBannerText,
  relativeTime,
  syncStatusLabel,
  type SyncStatusInput,
} from './syncStatus';

const NOW = Date.parse('2026-10-05T12:00:00.000Z');
const BASE: SyncStatusInput = {
  online: true,
  syncing: false,
  pending: 0,
  failed: 0,
  lastSyncAt: '2026-10-05T11:58:00.000Z',
};

describe('relativeTime', () => {
  it('uses just now, minutes, hours, then the date', () => {
    expect(relativeTime('2026-10-05T11:59:30.000Z', NOW)).toBe('just now');
    expect(relativeTime('2026-10-05T11:55:00.000Z', NOW)).toBe('5 min ago');
    expect(relativeTime('2026-10-05T09:00:00.000Z', NOW)).toBe('3 h ago');
    expect(relativeTime('2026-10-01T09:00:00.000Z', NOW)).toMatch(/2026/);
  });

  it('treats a future timestamp (clock skew) as just now', () => {
    expect(relativeTime('2026-10-05T12:05:00.000Z', NOW)).toBe('just now');
  });
});

describe('syncStatusLabel', () => {
  it('shows the last sync time when everything is pushed', () => {
    expect(syncStatusLabel(BASE, NOW)).toEqual({ kind: 'synced', text: 'Synced · 2 min ago' });
  });

  it('shows pending changes, singular and plural', () => {
    expect(syncStatusLabel({ ...BASE, pending: 1 }, NOW).text).toBe('1 change pending');
    expect(syncStatusLabel({ ...BASE, pending: 3 }, NOW).text).toBe('3 changes pending');
  });

  it('shows syncing while a run is active', () => {
    expect(syncStatusLabel({ ...BASE, syncing: true, pending: 2 }, NOW).kind).toBe('syncing');
  });

  it('shows offline with the pending count', () => {
    expect(syncStatusLabel({ ...BASE, online: false, pending: 3 }, NOW).text).toBe(
      'Offline — 3 changes pending',
    );
    expect(syncStatusLabel({ ...BASE, online: false }, NOW).text).toBe('Offline');
  });

  it('puts failed entries first', () => {
    expect(syncStatusLabel({ ...BASE, online: false, failed: 1, pending: 4 }, NOW)).toEqual({
      kind: 'error',
      text: 'Sync error',
    });
  });

  it('says not synced yet before the first sync', () => {
    expect(syncStatusLabel({ ...BASE, lastSyncAt: null }, NOW).kind).toBe('never');
  });
});

describe('offlineBannerText', () => {
  it('includes the pending count when there is one', () => {
    expect(offlineBannerText(0)).toBe('Offline — changes will sync later');
    expect(offlineBannerText(2)).toBe('Offline — 2 changes pending');
  });
});
