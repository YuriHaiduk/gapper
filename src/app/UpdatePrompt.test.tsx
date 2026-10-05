import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp } from '@/test/auth';
import { makeOther, USER_ID } from '@/test/factories';
import { pwaRegister } from '@/test/pwaRegisterMock';

function newVersionWaiting() {
  act(() => {
    pwaRegister.setNeedRefresh(true);
  });
}

describe('UpdatePrompt (SPEC §22, AC-61)', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
  });

  it('stays hidden until a new version is waiting', async () => {
    renderApp('/cards');
    await screen.findByRole('heading', { name: /cards/i });
    expect(screen.queryByText('New version available')).not.toBeInTheDocument();

    newVersionWaiting();
    expect(screen.getByText('New version available')).toBeInTheDocument();
  });

  it('Reload activates the new service worker and reloads', async () => {
    const user = userEvent.setup();
    renderApp('/cards');
    newVersionWaiting();

    await user.click(await screen.findByRole('button', { name: 'Reload' }));
    expect(pwaRegister.updateCalls).toEqual([true]);
  });

  it('Later hides the toast without updating', async () => {
    const user = userEvent.setup();
    renderApp('/cards');
    newVersionWaiting();

    await user.click(await screen.findByRole('button', { name: 'Later' }));
    expect(screen.queryByText('New version available')).not.toBeInTheDocument();
    expect(pwaRegister.updateCalls).toEqual([]);
  });

  it('is hidden while a form has unsaved changes (D55)', async () => {
    const user = userEvent.setup();
    renderApp('/cards/new');
    const title = await screen.findByLabelText('Title');
    await user.type(title, 'abandon');
    newVersionWaiting();
    expect(screen.queryByText('New version available')).not.toBeInTheDocument();

    await user.clear(title);
    await waitFor(() => {
      expect(screen.getByText('New version available')).toBeInTheDocument();
    });
  });
});
