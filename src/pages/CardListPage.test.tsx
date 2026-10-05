import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_SIZE } from '@/domain/constants';
import { plainToRichText } from '@/domain/richText';
import type { Card } from '@/domain/types';
import { applyRemoteCard, getCard, saveCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { countAll } from '@/repositories/local/outboxRepo';
import { renderApp } from '@/test/auth';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });
const at = (i: number) => new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
const pad = (i: number) => String(i).padStart(2, '0');

async function seed(count: number, overrides: (i: number) => Partial<Card> = () => ({})) {
  for (let i = 0; i < count; i++) {
    await applyRemoteCard(
      makeCard({
        id: `card-${pad(i)}`,
        title: `word ${pad(i)}`,
        created_at: at(i),
        ...overrides(i),
      }),
    );
  }
}

/** Titles in the rendered list, top to bottom. */
async function titles() {
  const list = await screen.findByRole('list', { name: 'Cards' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('a')?.textContent);
}

const learned = { status: 'learned', learned_at: at(0) } as const;

describe('CardListPage', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
    await applyRemoteCategory(LAW);
  });

  it('AC-7/AC-8: shows the 20 newest, Load more appends the rest', async () => {
    const user = userEvent.setup();
    await seed(35);
    renderApp('/cards');

    const first = await titles();
    expect(first).toHaveLength(PAGE_SIZE);
    expect(first[0]).toBe('word 34');
    expect(first[19]).toBe('word 15');

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(async () => {
      expect(await titles()).toHaveLength(35);
    });
    const all = await titles();
    expect(all.slice(0, 20)).toEqual(first);
    expect(all[34]).toBe('word 00');
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('AC-22: the add button carries the list context', async () => {
    await seed(1, () => ({ category_id: LAW.id }));
    renderApp('/cards?category=law');
    expect(await screen.findByRole('link', { name: 'Add card' })).toHaveAttribute(
      'href',
      '/gapper/cards/new?category=law',
    );
  });

  it('AC-9: exactly 20 cards → no Load more', async () => {
    await seed(20);
    renderApp('/cards');
    expect(await titles()).toHaveLength(20);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('AC-10: no cards → empty state with an add action', async () => {
    renderApp('/cards');
    expect(await screen.findByText('No cards yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first card' })).toHaveAttribute(
      'href',
      '/gapper/cards/new',
    );
  });

  it('AC-11: a row shows title, category, status and links with the list query', async () => {
    await seed(1, () => ({ category_id: LAW.id, audio_path: 'u/c/r.webm' }));
    renderApp('/cards?status=learning&category=law');
    const link = await screen.findByRole('link', { name: 'word 00' });
    expect(link).toHaveAttribute('href', '/gapper/cards/card-00?status=learning&category=law');
    const row = within(link.closest('li') as HTMLElement);
    expect(row.getByText('Law')).toBeInTheDocument();
    expect(row.getByText('Learning')).toBeInTheDocument();
    expect(row.getByRole('img', { name: 'Has audio' })).toBeInTheDocument();
    expect(row.queryByRole('img', { name: 'Not synced yet' })).not.toBeInTheDocument();
  });

  it('marks cards with unsynced changes', async () => {
    await saveCard(makeCard({ id: 'local', title: 'local' }));
    renderApp('/cards');
    const link = await screen.findByRole('link', { name: 'local' });
    expect(
      within(link.closest('li') as HTMLElement).getByRole('img', { name: 'Not synced yet' }),
    ).toBeInTheDocument();
  });

  describe('delete from the list (D62)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('asks like the edit page, then removes the card', async () => {
      const user = userEvent.setup();
      await seed(2);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderApp('/cards');

      await user.click(await screen.findByRole('button', { name: 'Delete “word 00”' }));

      expect(confirm).toHaveBeenCalledWith('Delete “word 00”? This cannot be undone.');
      await waitFor(async () => {
        expect(await titles()).toEqual(['word 01']);
      });
      expect((await getCard('card-00'))?.deleted_at).not.toBeNull();
      // The tombstone and the card's audio folder delete (D29).
      expect(await countAll()).toBe(2);
    });

    it('keeps the card when the confirmation is cancelled', async () => {
      const user = userEvent.setup();
      await seed(1);
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderApp('/cards');

      await user.click(await screen.findByRole('button', { name: 'Delete “word 00”' }));

      expect(await titles()).toEqual(['word 00']);
      expect((await getCard('card-00'))?.deleted_at).toBeNull();
      expect(await countAll()).toBe(0);
    });
  });

  it('AC-13/AC-14: the filter sheet updates the URL, list and header label', async () => {
    const user = userEvent.setup();
    await seed(6, (i) => ({
      category_id: i < 3 ? LAW.id : OTHER_ID,
      ...(i % 3 === 0 ? learned : {}),
    }));
    const app = renderApp('/cards');
    await titles();

    await user.click(screen.getByRole('button', { name: 'Filter: All cards' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filter cards' });
    expect(await within(sheet).findByRole('radio', { name: /^All\s*6$/ })).toBeChecked();
    await user.click(await within(sheet).findByRole('radio', { name: /^Learning\s*4$/ }));
    expect(app.location()).toBe('/cards?status=learning');
    await waitFor(async () => {
      expect(await titles()).toEqual(['word 05', 'word 04', 'word 02', 'word 01']);
    });

    // Category counts follow the selected status (faceted).
    await user.click(await within(sheet).findByRole('radio', { name: /^Law\s*2$/ }));
    expect(app.location()).toBe('/cards?status=learning&category=law');
    await waitFor(async () => {
      expect(await titles()).toEqual(['word 02', 'word 01']);
    });
    expect(screen.getByRole('button', { name: 'Filter: Learning · Law' })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('AC-15: Load more appends exactly the remaining filtered cards', async () => {
    const user = userEvent.setup();
    // 60 cards, every other one in Law, of those 25 learning.
    await seed(60, (i) => ({
      category_id: i % 2 === 0 ? LAW.id : OTHER_ID,
      ...(i % 2 === 0 && i >= 50 ? learned : {}),
    }));
    renderApp('/cards?status=learning&category=law');
    expect(await titles()).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(async () => {
      expect(await titles()).toHaveLength(25);
    });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('AC-16: a bookmarked filtered URL shows the same filtered list', async () => {
    await seed(4, (i) => ({ category_id: i < 2 ? LAW.id : OTHER_ID, ...(i === 0 ? learned : {}) }));
    renderApp('/cards?status=learned&category=law');
    expect(await titles()).toEqual(['word 00']);
    expect(screen.getByRole('button', { name: 'Filter: Learned · Law' })).toBeInTheDocument();
  });

  it('AC-17: unknown category slug → Category not found', async () => {
    renderApp('/cards?category=unknown-slug');
    expect(await screen.findByText('Category not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show all cards' })).toHaveAttribute(
      'href',
      '/gapper/cards',
    );
  });

  it('AC-18: Learned filter without learned cards', async () => {
    await seed(2);
    renderApp('/cards?status=learned');
    expect(await screen.findByText('No learned cards yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add your first card' })).not.toBeInTheDocument();
  });

  it('AC-19: search writes q to the URL after typing and combines with filters', async () => {
    const user = userEvent.setup();
    await applyRemoteCard(makeCard({ id: 'a', title: 'burden of PRÓOF', created_at: at(1) }));
    await applyRemoteCard(
      makeCard({
        id: 'b',
        title: 'evidence',
        notes: plainToRichText('Example: no proof.'),
        created_at: at(2),
        ...learned,
      }),
    );
    await applyRemoteCard(makeCard({ id: 'c', title: 'contract', created_at: at(3) }));
    const app = renderApp('/cards?status=learning');
    await titles();

    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search cards' }), 'proof');
    await waitFor(() => {
      expect(app.location()).toBe('/cards?status=learning&q=proof');
    });
    await waitFor(async () => {
      expect(await titles()).toEqual(['burden of PRÓOF']);
    });

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => {
      expect(app.location()).toBe('/cards?status=learning');
    });
  });

  it('shows the search empty state', async () => {
    await seed(1);
    renderApp('/cards?q=zzz');
    expect(await screen.findByText('No cards match “zzz”.')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search cards' })).toHaveValue('zzz');
  });

  it('shows "Loading your cards…" until the first sync finishes', async () => {
    await setMeta('initial_sync_done', false);
    renderApp('/cards');
    expect(await screen.findByText('Loading your cards…')).toBeInTheDocument();
  });

  it('AC-12: restores the loaded count for the same query', async () => {
    sessionStorage.setItem('gapper:cards:count:status=learning', '40');
    await seed(45);
    renderApp('/cards?status=learning');
    expect(await titles()).toHaveLength(40);
  });
});
