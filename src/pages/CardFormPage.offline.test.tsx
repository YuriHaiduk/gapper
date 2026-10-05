import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToRichText, richTextToPlain } from '@/domain/richText';
import { applyRemoteCard, getCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp } from '@/test/auth';
import { makeCard, makeOther, USER_ID } from '@/test/factories';

// The editor chunk can't be fetched: offline before it was ever loaded (D54).
vi.mock('@/features/cards/NotesEditor', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});

describe('CardFormPage without the notes editor chunk', () => {
  beforeEach(async () => {
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
    await applyRemoteCard(
      makeCard({ id: 'c1', title: 'abandon', notes: plainToRichText('покинути') }),
    );
  });

  it('keeps the form usable: notes read-only with Retry, the rest saves', async () => {
    const user = userEvent.setup();
    const app = renderApp('/cards/c1/edit');

    expect(await screen.findByText(/notes editor couldn't load/)).toBeInTheDocument();
    expect(screen.getByText('покинути')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/notes editor couldn't load/)).toBeInTheDocument();

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'abandonment');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(app.location()).toBe('/cards/c1');
    });
    const card = await getCard('c1');
    expect(card?.title).toBe('abandonment');
    expect(richTextToPlain(card?.notes)).toBe('покинути');
  });
});
