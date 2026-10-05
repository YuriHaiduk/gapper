import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { applyRemoteCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp } from '@/test/auth';
import { makeCard, makeCategory, makeOther, OTHER_ID, USER_ID } from '@/test/factories';

const LAW = makeCategory({ id: 'cat-law', name: 'Law', slug: 'law' });

async function seed() {
  await setMeta('user_id', USER_ID);
  await applyRemoteCategory(makeOther());
  await applyRemoteCategory(LAW);
  for (let i = 0; i < 7; i++)
    await applyRemoteCard(makeCard({ id: `law-${i}`, category_id: LAW.id }));
  await applyRemoteCard(makeCard({ id: 'other-1', category_id: OTHER_ID }));
  await applyRemoteCard(
    makeCard({ id: 'gone', category_id: OTHER_ID, deleted_at: '2026-01-02T00:00:00.000Z' }),
  );
}

async function row(name: string) {
  const item = (await screen.findByText(name, { selector: 'p' })).closest('li');
  if (!item) throw new Error(`no row for ${name}`);
  return within(item);
}

function names() {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent);
}

describe('CategoriesPage', () => {
  beforeEach(seed);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AC-49/AC-48: lists categories with card counts; Other is locked and last', async () => {
    renderApp('/categories');
    expect((await row('Law')).getByText('7 cards')).toBeInTheDocument();
    const other = await row('Other');
    expect(other.getByText('1 card')).toBeInTheDocument();
    expect(other.getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    expect(other.queryByRole('button')).not.toBeInTheDocument();
    expect(names()).toEqual(['Law', 'Other']);
  });

  it('AC-45: creates a category', async () => {
    const user = userEvent.setup();
    renderApp('/categories');
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    await user.type(screen.getByLabelText('New category'), 'Idioms{Enter}');

    expect((await row('Idioms')).getByText('0 cards')).toBeInTheDocument();
    expect(names()).toEqual(['Idioms', 'Law', 'Other']);
    expect(await db.categories.where('slug').equals('idioms').count()).toBe(1);
    expect(screen.getByRole('button', { name: 'New category' })).toBeInTheDocument();
  });

  it('AC-46: shows the duplicate-name error and keeps the form open', async () => {
    const user = userEvent.setup();
    renderApp('/categories');
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    await user.type(screen.getByLabelText('New category'), 'law');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const input = screen.getByLabelText('New category');
    expect(await screen.findByText('A category with this name already exists.')).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('New category')).not.toBeInTheDocument();
  });

  it('renames a category inline', async () => {
    const user = userEvent.setup();
    renderApp('/categories');
    await user.click((await row('Law')).getByRole('button', { name: 'Rename Law' }));
    const input = screen.getByLabelText('Category name');
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, 'Legal{Enter}');

    expect((await row('Legal')).getByText('7 cards')).toBeInTheDocument();
    expect((await db.categories.get(LAW.id))?.slug).toBe('legal');
  });

  it('AC-47: deletes after confirmation and moves the cards to Other', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/categories');
    await user.click((await row('Law')).getByRole('button', { name: 'Delete Law' }));

    expect(confirm).toHaveBeenCalledWith('Delete “Law”? Its 7 cards will move to Other.');
    await waitFor(() => {
      expect(screen.queryByText('Law')).not.toBeInTheDocument();
    });
    expect((await row('Other')).getByText('8 cards')).toBeInTheDocument();
    expect(screen.getByText('Create categories to organize your cards.')).toBeInTheDocument();
  });

  it('keeps the category when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderApp('/categories');
    await user.click((await row('Law')).getByRole('button', { name: 'Delete Law' }));

    expect((await db.categories.get(LAW.id))?.deleted_at).toBeNull();
    expect(screen.getByText('Law')).toBeInTheDocument();
  });

  it('shows no empty hint while user categories exist', async () => {
    renderApp('/categories');
    await row('Law');
    expect(screen.queryByText('Create categories to organize your cards.')).not.toBeInTheDocument();
  });
});
