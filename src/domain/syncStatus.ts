/** Inputs for the sync status line (SPEC §15.6). */
export type SyncStatusInput = {
  online: boolean;
  syncing: boolean;
  /** Outbox entries not yet pushed, failed ones included. */
  pending: number;
  failed: number;
  lastSyncAt: string | null;
};

export type SyncStatusKind = 'error' | 'syncing' | 'offline' | 'pending' | 'synced' | 'never';

export type SyncStatusLabel = { kind: SyncStatusKind; text: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** `just now`, `5 min ago`, `3 h ago`, then the date (device locale). */
export function relativeTime(iso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(iso));
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${String(Math.floor(elapsed / MINUTE))} min ago`;
  if (elapsed < 24 * HOUR) return `${String(Math.floor(elapsed / HOUR))} h ago`;
  return DATE_FORMAT.format(new Date(iso));
}

function changes(count: number): string {
  return `${String(count)} ${count === 1 ? 'change' : 'changes'} pending`;
}

/** Status line for the menu (SPEC §15.6). Failed entries win: they need the owner. */
export function syncStatusLabel(input: SyncStatusInput, now: number): SyncStatusLabel {
  if (input.failed > 0) return { kind: 'error', text: 'Sync error' };
  if (!input.online) {
    return {
      kind: 'offline',
      text: input.pending > 0 ? `Offline — ${changes(input.pending)}` : 'Offline',
    };
  }
  if (input.syncing) return { kind: 'syncing', text: 'Syncing…' };
  if (input.pending > 0) return { kind: 'pending', text: changes(input.pending) };
  if (input.lastSyncAt) {
    return { kind: 'synced', text: `Synced · ${relativeTime(input.lastSyncAt, now)}` };
  }
  return { kind: 'never', text: 'Not synced yet' };
}

/** Offline banner text (SPEC §25): the pending count tells the owner what will sync later. */
export function offlineBannerText(pending: number): string {
  return pending > 0 ? `Offline — ${changes(pending)}` : 'Offline — changes will sync later';
}
