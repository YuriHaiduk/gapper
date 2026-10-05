import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/auth/authContext';
import { getMeta, setMeta } from '@/repositories/local/metaRepo';
import { getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
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
  expireSession: () => Promise.resolve(),
};

function Status() {
  const { pendingCount, sessionExpired } = useSyncStatus();
  return (
    <p>
      pending {pendingCount}
      {sessionExpired && ' expired'}
    </p>
  );
}

function renderProvider(
  authValue: AuthContextValue = auth,
  {
    result = OK,
    periodMs = 60_000,
    whenIdle = () => Promise.resolve(),
  }: { result?: SyncResult; periodMs?: number; whenIdle?: SyncService['whenIdle'] } = {},
) {
  const service = {
    sync: vi.fn<SyncService['sync']>(() => Promise.resolve(result)),
    whenIdle: vi.fn<SyncService['whenIdle']>(whenIdle),
    discard: vi.fn<SyncService['discard']>(),
    downloadAudio: vi.fn<SyncService['downloadAudio']>(),
  };
  render(
    <AuthContext value={authValue}>
      <SyncProvider service={service} periodMs={periodMs}>
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

  it('syncs 2 s after an edit of a row that is already pending (D61)', async () => {
    const service = renderProvider();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });
    await act(() => saveCard(makeCard()));
    await vi.waitFor(
      () => {
        expect(service.sync).toHaveBeenCalledTimes(2);
      },
      { timeout: WRITE_SYNC_DELAY_MS + 1000 },
    );

    // The fake sync pushed nothing, so the entry is still pending: the count stays at 1.
    await act(() =>
      saveCard(makeCard({ title: 'edited', updated_at: '2026-02-01T00:00:00.000Z' })),
    );
    await vi.waitFor(
      () => {
        expect(service.sync).toHaveBeenCalledTimes(3);
      },
      { timeout: WRITE_SYNC_DELAY_MS + 1000 },
    );
    expect(await screen.findByText('pending 1')).toBeInTheDocument();
  });

  it("starts no sync before another user's local data is wiped (D61)", async () => {
    await setMeta('user_id', 'someone-else');
    // A previous run is still finishing, so the wipe waits; triggers fire meanwhile.
    let finishRun: () => void = () => undefined;
    const running = new Promise<void>((resolve) => {
      finishRun = resolve;
    });
    const service = renderProvider(auth, { whenIdle: () => running });
    await vi.waitFor(() => {
      expect(service.whenIdle).toHaveBeenCalled();
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(service.sync).not.toHaveBeenCalled();

    finishRun();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });
  });

  it('wipes local data of another user before the first sync (D51)', async () => {
    await setMeta('user_id', 'someone-else');
    await saveCard(makeCard({ id: 'theirs' }));
    const service = renderProvider();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });
    expect(await getCard('theirs')).toBeUndefined();
    expect(await getMeta('user_id')).toBe(USER_ID);
  });

  it('keeps local data of the same user', async () => {
    await setMeta('user_id', USER_ID);
    await saveCard(makeCard({ id: 'mine' }));
    const service = renderProvider();
    await vi.waitFor(() => {
      expect(service.sync).toHaveBeenCalledTimes(1);
    });
    expect(await getCard('mine')).toBeDefined();
  });

  it('syncs periodically while visible', async () => {
    const service = renderProvider(auth, { periodMs: 50 });
    await vi.waitFor(() => {
      expect(service.sync.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('does not sync with an expired session and reports it (D50)', async () => {
    const service = renderProvider({ ...auth, status: 'expired' }, { periodMs: 20 });
    await screen.findByText(/expired/);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(service.sync).not.toHaveBeenCalled();
  });

  it('reports a session the API rejected', async () => {
    renderProvider(auth, { result: { ...OK, status: 'auth_error' } });
    expect(await screen.findByText(/expired/)).toBeInTheDocument();
  });
});
