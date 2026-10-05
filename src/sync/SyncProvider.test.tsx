import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/auth/authContext';
import { getMeta } from '@/repositories/local/metaRepo';
import { saveCard } from '@/repositories/local/cardsLocalRepo';
import { makeCard, USER_ID } from '@/test/factories';
import { SyncProvider, WRITE_SYNC_DELAY_MS } from './SyncProvider';
import type { SyncResult, SyncService } from './syncService';
import { useSyncStatus } from './useSyncStatus';

const OK: SyncResult = { status: 'ok', pushed: 0, pulled: 0, rejected: 0 };

const auth: AuthContextValue = {
  status: 'signed_in',
  user: { id: USER_ID, email: 'owner@example.com' },
  signIn: () => Promise.resolve({ ok: true }),
  signOut: () => Promise.resolve(),
};

function Status() {
  const { pendingCount } = useSyncStatus();
  return <p>pending {pendingCount}</p>;
}

function renderProvider(authValue: AuthContextValue = auth) {
  const service = { sync: vi.fn<SyncService['sync']>(() => Promise.resolve(OK)) };
  render(
    <AuthContext value={authValue}>
      <SyncProvider service={service}>
        <Status />
      </SyncProvider>
    </AuthContext>,
  );
  return service;
}

describe('SyncProvider', () => {
  it('stores the user and syncs on start, then on online and visibility', async () => {
    const service = renderProvider();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });
    expect(await getMeta('user_id')).toBe(USER_ID);

    act(() => {
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(3);
    });
  });

  it('does nothing while signed out', async () => {
    const service = renderProvider({ ...auth, status: 'signed_out', user: null });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(service.sync).not.toHaveBeenCalled();
  });

  it('syncs 2 s after a local write', async () => {
    const service = renderProvider();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });

    // Real timers: fake ones stall fake-indexeddb and live queries.
    const start = Date.now();
    await act(() => saveCard(makeCard()));
    await screen.findByText('pending 1');
    expect(service.sync).toHaveBeenCalledTimes(1);
    await vi.waitFor(
      () => {
        expect(service.sync).toHaveBeenCalledTimes(2);
      },
      { timeout: WRITE_SYNC_DELAY_MS + 1000 },
    );
    expect(Date.now() - start).toBeGreaterThanOrEqual(WRITE_SYNC_DELAY_MS - 50);
  });
});
