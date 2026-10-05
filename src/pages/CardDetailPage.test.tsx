import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { plainToRichText } from '@/domain/richText';
import type { Card } from '@/domain/types';
import { applyRemoteCard, getCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp } from '@/test/auth';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });
const at = (i: number) => new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
const pad = (i: number) => String(i).padStart(2, '0');
const LAW_LEARNING = '?status=learning&category=law';

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

/** Even cards are Law, the rest Other; card 2 is learned. Learning + Law = 4, 0 (and 6…). */
const mixed = (i: number): Partial<Card> => ({
  category_id: i % 2 === 0 ? LAW.id : OTHER_ID,
  ...(i === 2 && { status: 'learned', learned_at: at(i) }),
});

const nextLink = () => screen.findByRole('link', { name: /^Next: / });
const prevLink = () => screen.findByRole('link', { name: /^Previous: / });

describe('CardDetailPage', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
    await applyRemoteCategory(LAW);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AC-28: shows title with status, notes, category and dates in that order', async () => {
    await applyRemoteCard(
      makeCard({
        id: 'c1',
        title: 'burden of proof',
        notes: plainToRichText('тягар доказування'),
        category_id: LAW.id,
        status: 'learned',
        learned_at: at(3),
      }),
    );
    renderApp('/cards/c1');
    const title = await screen.findByRole('heading', { level: 1, name: 'burden of proof' });
    const notes = screen.getByText('тягар доказування');
    const category = screen.getByText('Law');
    const status = screen.getByText('Learned');
    const created = screen.getByText('Created');
    const ordered = [title, status, notes, category, created];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i - 1]?.compareDocumentPosition(ordered[i] as Node)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Learned on')).toBeInTheDocument();
  });

  it('hides empty notes and the learned date of a learning card', async () => {
    await applyRemoteCard(makeCard({ id: 'c1', notes: null }));
    renderApp('/cards/c1');
    await screen.findByRole('heading', { level: 1, name: 'abandon' });
    expect(screen.queryByText('Learned on')).not.toBeInTheDocument();
    expect(document.querySelector('.rich-text')).toBeNull();
  });

  it('AC-25/AC-26: toggles the status with learned_at, the pill updates at once', async () => {
    const user = userEvent.setup();
    await applyRemoteCard(makeCard({ id: 'c1' }));
    const app = renderApp('/cards/c1');
    await user.click(await screen.findByRole('button', { name: 'Mark as learned' }));

    expect(await screen.findByRole('button', { name: 'Move to learning' })).toBeInTheDocument();
    expect(screen.getByText('Learned', { selector: 'span' })).toBeInTheDocument();
    const learned = await getCard('c1');
    expect(learned).toMatchObject({ status: 'learned', created_at: makeCard().created_at });
    expect(learned?.learned_at).not.toBeNull();

    await app.router.navigate('/cards?status=learned');
    expect(await screen.findByRole('link', { name: 'abandon' })).toBeInTheDocument();
    await app.router.navigate('/cards/c1');
    await user.click(await screen.findByRole('button', { name: 'Move to learning' }));
    await waitFor(async () => {
      expect(await getCard('c1')).toMatchObject({ status: 'learning', learned_at: null });
    });
  });

  it('AC-29/AC-31: Next opens the next card of the context and keeps the query', async () => {
    const user = userEvent.setup();
    await seed(6, mixed);
    const app = renderApp(`/cards/card-04${LAW_LEARNING}`);
    const next = await nextLink();
    expect(next).toHaveAccessibleName('Next: word 00');
    expect(next).toHaveTextContent('word 00');
    await user.click(next);
    await waitFor(() => {
      expect(app.location()).toBe(`/cards/card-00${LAW_LEARNING}`);
    });
    expect(await prevLink()).toHaveAccessibleName('Previous: word 04');
  });

  it('AC-30: the edge controls are disabled', async () => {
    await seed(6, mixed);
    renderApp(`/cards/card-04${LAW_LEARNING}`);
    await nextLink();
    expect(screen.getByRole('link', { name: 'No previous card' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: 'No previous card' })).not.toHaveAttribute('href');
  });

  it('AC-32: after three Nexts, browser Back returns to the list', async () => {
    const user = userEvent.setup();
    await seed(5);
    const app = renderApp('/cards');
    await user.click(await screen.findByRole('link', { name: 'word 04' }));
    for (const expected of ['word 03', 'word 02', 'word 01']) {
      await user.click(await screen.findByRole('link', { name: `Next: ${expected}` }));
      await screen.findByRole('heading', { level: 1, name: expected });
    }
    expect(app.location()).toBe('/cards/card-01');
    await app.router.navigate(-1);
    await waitFor(() => {
      expect(app.location()).toBe('/cards');
    });
  });

  it('AC-33: without a query prev/next go through all cards', async () => {
    await seed(6, mixed);
    renderApp('/cards/card-03');
    expect(await prevLink()).toHaveAccessibleName('Previous: word 04');
    expect(await nextLink()).toHaveAccessibleName('Next: word 02');
  });

  it('AC-34: marking the card learned in the Learning context keeps its neighbours', async () => {
    const user = userEvent.setup();
    await seed(6, mixed);
    const app = renderApp(`/cards/card-04${LAW_LEARNING}`);
    await user.click(await screen.findByRole('button', { name: 'Mark as learned' }));
    await screen.findByRole('button', { name: 'Move to learning' });
    await user.click(await nextLink());
    await waitFor(() => {
      expect(app.location()).toBe(`/cards/card-00${LAW_LEARNING}`);
    });
  });

  it('←/→ keys move between cards; modified keys are ignored', async () => {
    const user = userEvent.setup();
    await seed(3);
    const app = renderApp('/cards/card-01?q=word');
    await nextLink();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(app.location()).toBe('/cards/card-01?q=word');
    await user.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(app.location()).toBe('/cards/card-00?q=word');
    });
    await prevLink();
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => {
      expect(app.location()).toBe('/cards/card-01?q=word');
    });
  });

  it('header links: Back to the list context, Edit keeps it', async () => {
    await seed(1);
    renderApp(`/cards/card-00${LAW_LEARNING}`);
    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/gapper/cards/card-00/edit${LAW_LEARNING}`,
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `/gapper/cards${LAW_LEARNING}`,
    );
  });

  it('header Back restores the list scroll position (AC-12)', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    await seed(3);
    renderApp('/cards');
    await user.click(await screen.findByRole('link', { name: 'word 01' }));
    await screen.findByRole('heading', { level: 1, name: 'word 01' });
    sessionStorage.setItem('gapper:cards:scroll:', '500');
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Back' }));
    await screen.findByRole('list', { name: 'Cards' });
    expect(scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it('unknown or deleted card → Card not found with a link back to the context', async () => {
    await applyRemoteCard(makeCard({ id: 'gone', deleted_at: at(1) }));
    renderApp('/cards/gone?category=law');
    expect(await screen.findByText('Card not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to cards' })).toHaveAttribute(
      'href',
      '/gapper/cards?category=law',
    );
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(await db.cards.count()).toBe(1);
  });
});
