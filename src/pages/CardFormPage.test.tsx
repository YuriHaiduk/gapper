import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { richTextToPlain } from '@/domain/richText';
import { applyRemoteCard, getCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp } from '@/test/auth';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });

async function onlyCard() {
  const cards = await db.cards.toArray();
  const [card] = cards;
  if (cards.length !== 1 || !card) throw new Error(`expected 1 card, got ${cards.length}`);
  return card;
}

describe('CardFormPage', () => {
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

  describe('create', () => {
    it('AC-20: title only → Other, learning; opens the card, list shows it first', async () => {
      const user = userEvent.setup();
      await applyRemoteCard(makeCard({ id: 'old', title: 'older' }));
      const app = renderApp('/cards/new');
      const title = await screen.findByLabelText('Title');
      // Focus is set by an effect, which may run after the field is first found.
      await waitFor(() => {
        expect(title).toHaveFocus();
      });
      expect(screen.getByLabelText('Category')).toHaveValue(OTHER_ID);
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();

      await user.type(title, 'abandon{Enter}');

      const card = await db.cards.filter((c) => c.title === 'abandon').first();
      if (!card) throw new Error('card not saved');
      expect(card).toMatchObject({ category_id: OTHER_ID, status: 'learning', learned_at: null });
      await waitFor(() => {
        expect(app.location()).toBe(`/cards/${card.id}`);
      });
      await app.router.navigate('/cards');
      const list = await screen.findByRole('list', { name: 'Cards' });
      expect(within(list).getAllByRole('link')[0]).toHaveTextContent('abandon');
    });

    it('AC-21: empty title → error, nothing saved', async () => {
      const user = userEvent.setup();
      const app = renderApp('/cards/new');
      await screen.findByRole('textbox', { name: 'Notes' });
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Title is required.')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveFocus();
      expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(/Title is required\./);
      expect(await db.cards.count()).toBe(0);
      expect(app.location()).toBe('/cards/new');
    });

    it('AC-22: the list context preselects the category and is kept on save', async () => {
      const user = userEvent.setup();
      const app = renderApp('/cards/new?status=learning&category=law');
      expect(await screen.findByLabelText('Category')).toHaveValue(LAW.id);
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
        'href',
        '/gapper/cards?status=learning&category=law',
      );
      await user.type(screen.getByLabelText('Title'), 'tort');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(async () => {
        expect((await onlyCard()).category_id).toBe(LAW.id);
      });
      const card = await onlyCard();
      expect(app.location()).toBe(`/cards/${card.id}?status=learning&category=law`);
    });

    it('AC-23: a duplicate title shows a non-blocking hint with a link', async () => {
      const user = userEvent.setup();
      await applyRemoteCard(makeCard({ id: 'c1', title: 'abandon' }));
      renderApp('/cards/new');
      await user.type(await screen.findByLabelText('Title'), ' Abandon');

      const link = await screen.findByRole('link', { name: '“abandon”' });
      expect(link).toHaveAttribute('href', '/gapper/cards/c1');
      expect(link.closest('p')).toHaveTextContent('You already have a card “abandon”.');

      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(async () => {
        expect(await db.cards.count()).toBe(2);
      });
    });

    it('AC-24: Save & add another resets the form and keeps the category', async () => {
      const user = userEvent.setup();
      const app = renderApp('/cards/new');
      await user.type(await screen.findByLabelText('Title'), 'tort');
      await screen.findByRole('textbox', { name: 'Notes' });
      await user.click(screen.getByRole('button', { name: 'Bullet list' }));
      await user.selectOptions(screen.getByLabelText('Part of speech'), 'Noun');
      await user.selectOptions(screen.getByLabelText('Category'), 'Law');
      await user.click(screen.getByRole('button', { name: 'Save & add another' }));

      expect(await screen.findByText('Saved “tort”.')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveValue('');
      expect(screen.getByLabelText('Title')).toHaveFocus();
      expect(screen.getByRole('textbox', { name: 'Notes' }).querySelector('ul')).toBeNull();
      expect(screen.getByLabelText('Part of speech')).toHaveValue('');
      expect(screen.getByLabelText('Category')).toHaveValue(LAW.id);
      expect(app.location()).toBe('/cards/new');
      expect(await onlyCard()).toMatchObject({ title: 'tort', type: 'noun', category_id: LAW.id });
    });
  });

  describe('unsaved changes', () => {
    it('asks before leaving a changed form; Cancel stays, OK leaves', async () => {
      const user = userEvent.setup();
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const app = renderApp('/cards/new?category=law');
      await user.type(await screen.findByLabelText('Title'), 'tort');

      await user.click(screen.getByRole('link', { name: 'Back' }));
      expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(app.location()).toBe('/cards/new?category=law');
      expect(screen.getByLabelText('Title')).toHaveValue('tort');

      await user.click(screen.getByRole('link', { name: 'Back' }));
      await waitFor(() => {
        expect(app.location()).toBe('/cards?category=law');
      });
      expect(await db.cards.count()).toBe(0);
    });

    it('also guards browser Back', async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const app = renderApp('/cards');
      await user.click(await screen.findByRole('link', { name: 'Add card' }));
      await user.type(await screen.findByLabelText('Title'), 'tort');
      await app.router.navigate(-1);

      await waitFor(() => {
        expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
      });
      expect(app.location()).toBe('/cards/new');
      expect(screen.getByLabelText('Title')).toHaveValue('tort');
    });

    it('does not ask for an untouched form, after Save, or after Save & add another', async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, 'confirm');
      const app = renderApp('/cards/new');
      await user.selectOptions(await screen.findByLabelText('Category'), 'Law');
      await user.type(screen.getByLabelText('Title'), 'tort');
      await user.click(screen.getByRole('button', { name: 'Save & add another' }));
      await screen.findByText('Saved “tort”.');
      await user.click(screen.getByRole('link', { name: 'Back' }));
      await waitFor(() => {
        expect(app.location()).toBe('/cards');
      });

      await app.router.navigate('/cards/new');
      await user.type(await screen.findByLabelText('Title'), 'delict{Enter}');
      await waitFor(() => {
        expect(app.location()).toMatch(/^\/cards\/[0-9a-f-]{36}$/);
      });
      expect(confirm).not.toHaveBeenCalled();
    });

    it('delete of a changed card asks only the delete question', async () => {
      const user = userEvent.setup();
      await applyRemoteCard(makeCard({ id: 'c1' }));
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const app = renderApp('/cards/c1/edit');
      await user.type(await screen.findByLabelText('Title'), '!');
      await user.click(screen.getByRole('button', { name: 'Delete card' }));

      await waitFor(() => {
        expect(app.location()).toBe('/cards');
      });
      expect(confirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('edit', () => {
    beforeEach(async () => {
      await applyRemoteCard(makeCard({ id: 'c1', title: 'abandon', category_id: LAW.id }));
    });

    it('AC-35: edits the notes; created_at unchanged; opens the card', async () => {
      const user = userEvent.setup();
      const app = renderApp('/cards/c1/edit?category=law');
      const notes = await screen.findByRole('textbox', { name: 'Notes' });
      expect(notes).toHaveTextContent('покинути');
      expect(screen.getByLabelText('Category')).toHaveValue(LAW.id);
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
        'href',
        '/gapper/cards/c1?category=law',
      );
      expect(screen.queryByRole('button', { name: 'Save & add another' })).not.toBeInTheDocument();

      const bullet = screen.getByRole('button', { name: 'Bullet list' });
      await user.click(bullet);
      expect(bullet).toHaveAttribute('aria-pressed', 'true');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(app.location()).toBe('/cards/c1?category=law');
      });
      const card = await getCard('c1');
      expect(card?.notes?.content?.[0]).toMatchObject({ type: 'bulletList' });
      expect(richTextToPlain(card?.notes)).toBe('покинути');
      expect(card?.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(card?.updated_at).not.toBe('2026-01-01T00:00:00.000Z');
    });

    it('changes and clears the part of speech (D63)', async () => {
      const user = userEvent.setup();
      await applyRemoteCard(makeCard({ id: 'c2', title: 'go on', type: 'verb' }));
      const app = renderApp('/cards/c2/edit');
      const select = await screen.findByLabelText('Part of speech');
      expect(select).toHaveValue('verb');
      await user.selectOptions(select, 'Phrasal verb');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(async () => {
        expect((await getCard('c2'))?.type).toBe('phrasal_verb');
      });

      await app.router.navigate('/cards/c2/edit');
      await user.selectOptions(await screen.findByLabelText('Part of speech'), '—');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(async () => {
        expect((await getCard('c2'))?.type).toBeNull();
      });
    });

    it('changes the status and sets learned_at', async () => {
      const user = userEvent.setup();
      renderApp('/cards/c1/edit');
      expect(await screen.findByRole('radio', { name: 'Learning' })).toBeChecked();
      await user.click(screen.getByRole('radio', { name: 'Learned' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(async () => {
        expect((await getCard('c1'))?.status).toBe('learned');
      });
      expect((await getCard('c1'))?.learned_at).not.toBeNull();
    });

    it('AC-37: delete after confirmation removes the card from the list', async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      await applyRemoteCard(makeCard({ id: 'c2', title: 'keep' }));
      const app = renderApp('/cards/c1/edit');
      await user.click(await screen.findByRole('button', { name: 'Delete card' }));

      expect(confirm).toHaveBeenCalledWith('Delete “abandon”? This cannot be undone.');
      await waitFor(() => {
        expect(app.location()).toBe('/cards');
      });
      const list = await screen.findByRole('list', { name: 'Cards' });
      expect(within(list).queryByText('abandon')).not.toBeInTheDocument();
      expect(within(list).getByText('keep')).toBeInTheDocument();
      expect((await getCard('c1'))?.deleted_at).not.toBeNull();
    });

    it('cancelled delete keeps the card', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const app = renderApp('/cards/c1/edit');
      await user.click(await screen.findByRole('button', { name: 'Delete card' }));

      expect(app.location()).toBe('/cards/c1/edit');
      expect((await getCard('c1'))?.deleted_at).toBeNull();
      expect(await db.outbox.count()).toBe(0);
    });

    it('unknown or deleted card → Card not found', async () => {
      await applyRemoteCard(makeCard({ id: 'dead', deleted_at: '2026-01-02T00:00:00.000Z' }));
      renderApp('/cards/dead/edit?status=learned');
      expect(await screen.findByText('Card not found.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to cards' })).toHaveAttribute(
        'href',
        '/gapper/cards?status=learned',
      );
    });
  });
});
