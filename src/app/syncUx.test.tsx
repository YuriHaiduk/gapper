import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
import { countAll } from '@/repositories/local/outboxRepo';
import { fakeSyncService, renderApp } from '@/test/auth';
import { makeCard, makeCategory } from '@/test/factories';

afterEach(() => {
  vi.restoreAllMocks();
});

async function failEntry(cardId: string): Promise<number> {
  const [entry] = await db.outbox.where('[entity+entity_id]').equals(['card', cardId]).toArray();
  if (!entry) throw new Error('no entry');
  await db.outbox.update(entry.id, { attempts: 5, last_error: 'check violation' });
  return entry.id;
}

describe('sign out (SPEC §9)', () => {
  it('AC-6: confirms unsynced changes, then wipes local data and shows /login', async () => {
    const user = userEvent.setup();
    await saveCard(makeCard({ id: 'card-1', title: 'gap' }));
    await saveCard(makeCard({ id: 'card-2', title: 'gape' }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const app = renderApp('/cards');
    await screen.findByRole('link', { name: 'gap' });

    await user.click(screen.getByRole('button', { name: /^Menu/ }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(confirm).toHaveBeenLastCalledWith(
      'You have 2 unsynced changes. Signing out will discard them.',
    );
    expect(app.location()).toBe('/cards');
    expect(await getCard('card-1')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(app.location()).toBe('/login');
    });
    expect(await db.cards.count()).toBe(0);
    expect(await countAll()).toBe(0);
  });

  it('signs out without asking when everything is synced', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    await db.categories.put(makeCategory({ id: 'cat-1' }));
    const app = renderApp('/cards');

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(app.location()).toBe('/login');
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.categories.count()).toBe(0);
  });
});

describe('sync status (SPEC §15.6)', () => {
  it('shows pending changes on the menu button and in the menu', async () => {
    const user = userEvent.setup();
    await saveCard(makeCard({ title: 'gap' }));
    renderApp('/cards');

    await user.click(await screen.findByRole('button', { name: 'Menu, 1 change pending' }));
    expect(screen.getByText('1 change pending')).toBeInTheDocument();
  });

  it('shows the pending count in the offline banner', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await saveCard(makeCard({ id: 'card-1', title: 'gap' }));
    await saveCard(makeCard({ id: 'card-2', title: 'gape' }));
    renderApp('/cards');
    expect(await screen.findByText('Offline — 2 changes pending')).toBeInTheDocument();
  });

  it('lists failed entries; Retry re-arms and syncs, Discard restores the server version', async () => {
    const user = userEvent.setup();
    await saveCard(makeCard({ id: 'card-1', title: 'gap' }));
    const entryId = await failEntry('card-1');
    const sync = vi.fn(() => fakeSyncService.sync());
    const discard = vi.fn(() => db.outbox.delete(entryId));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/cards', {
      initialStatus: 'signed_in',
      sync: { ...fakeSyncService, sync, discard },
    });

    await user.click(await screen.findByRole('button', { name: 'Menu, Sync error' }));
    await user.click(screen.getByRole('button', { name: /Sync error — details/ }));
    const panel = screen.getByRole('dialog', { name: 'Sync errors' });
    expect(await within(panel).findByText('Card “gap”')).toBeInTheDocument();
    expect(within(panel).getByText('check violation')).toBeInTheDocument();

    const calls = sync.mock.calls.length;
    await user.click(within(panel).getByRole('button', { name: 'Retry' }));
    await waitFor(async () => {
      expect((await db.outbox.get(entryId))?.attempts).toBe(0);
    });
    expect(sync.mock.calls.length).toBeGreaterThan(calls);

    await db.outbox.update(entryId, { attempts: 5 });
    await user.click(await within(panel).findByRole('button', { name: 'Discard' }));
    expect(discard).toHaveBeenCalledWith(entryId);
    expect(await within(panel).findByText('No sync errors.')).toBeInTheDocument();
  });
});

describe('expired session (D50)', () => {
  it('keeps the app usable with a banner that leads to sign-in', async () => {
    const user = userEvent.setup();
    await saveCard(makeCard({ title: 'gap' }));
    const app = renderApp('/cards?status=learning', { initialStatus: 'expired' });

    expect(await screen.findByRole('link', { name: 'gap' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    await waitFor(() => {
      expect(app.location()).toBe('/login?redirect=%2Fcards%3Fstatus%3Dlearning');
    });
    expect(await countAll()).toBe(1);
  });

  it('ends a session the API rejected and keeps local data', async () => {
    const user = userEvent.setup();
    await saveCard(makeCard({ title: 'gap' }));
    const sync = () =>
      Promise.resolve({ status: 'auth_error' as const, pushed: 0, pulled: 0, rejected: 0 });
    const app = renderApp('/cards', {
      initialStatus: 'signed_in',
      sync: { ...fakeSyncService, sync },
    });

    await user.click(await screen.findByRole('button', { name: 'Sign in again' }));
    await waitFor(() => {
      expect(app.location()).toBe('/login?redirect=%2Fcards');
    });
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(await countAll()).toBe(1);
  });
});
