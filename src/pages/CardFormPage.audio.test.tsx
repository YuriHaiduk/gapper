import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { MIC_DENIED } from '@/features/audio/AudioRecorder';
import { applyRemoteCard, getCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { renderApp, TEST_USER } from '@/test/auth';
import { makeCard, makeOther, USER_ID } from '@/test/factories';
import { installMediaFakes, uninstallMediaFakes } from '@/test/mediaRecorder';

const OLD = `${USER_ID}/c1/old.m4a`;

async function outbox() {
  return (await db.outbox.toArray()).map((e) => `${e.entity}:${e.op}:${e.entity_id}`);
}

describe('CardFormPage — audio (SPEC §10.1)', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
  });
  afterEach(() => {
    uninstallMediaFakes();
    vi.restoreAllMocks();
  });

  it('AC-38: record → Stop → preview; Save stores the card with its recording', async () => {
    const user = userEvent.setup();
    const mic = installMediaFakes();
    const app = renderApp('/cards/new');
    await user.type(await screen.findByLabelText('Title'), 'abandon');

    await user.click(screen.getByRole('button', { name: 'Record pronunciation' }));
    expect(await screen.findByRole('timer', { name: 'Recording time' })).toHaveTextContent(
      '0:00 / 1:00',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mic.tracks[0]?.stop).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Play recording' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-record' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1);
    });
    const [card] = await db.cards.toArray();
    expect(card?.audio_path).toMatch(new RegExp(`^${TEST_USER.id}/${card?.id ?? ''}/.+\\.m4a$`));
    expect(await db.audio_blobs.get(card?.audio_path ?? '')).toMatchObject({ uploaded: 0 });
    await waitFor(() => {
      expect(app.location()).toBe(`/cards/${card?.id ?? ''}`);
    });
  });

  it('Remove discards the unsaved recording', async () => {
    const user = userEvent.setup();
    installMediaFakes();
    renderApp('/cards/new');
    await user.type(await screen.findByLabelText('Title'), 'abandon');
    await user.click(screen.getByRole('button', { name: 'Record pronunciation' }));
    await user.click(await screen.findByRole('button', { name: 'Stop' }));
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: 'Record pronunciation' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1);
    });
    expect((await db.cards.toArray())[0]?.audio_path).toBeNull();
    expect(await db.audio_blobs.count()).toBe(0);
  });

  it('AC-42: denied microphone shows the message; the card still saves', async () => {
    const user = userEvent.setup();
    installMediaFakes({ deny: true });
    renderApp('/cards/new');
    await user.type(await screen.findByLabelText('Title'), 'abandon');
    await user.click(screen.getByRole('button', { name: 'Record pronunciation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(MIC_DENIED);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1);
    });
  });

  it('edit: existing recording plays; Remove clears it on save', async () => {
    const user = userEvent.setup();
    await applyRemoteCard(makeCard({ id: 'c1', audio_path: OLD }));
    await db.audio_blobs.put({
      path: OLD,
      card_id: 'c1',
      blob: new Blob(['x'], { type: 'audio/mp4' }),
      mime: 'audio/mp4',
      uploaded: 1,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    renderApp('/cards/c1/edit');
    expect(await screen.findByRole('button', { name: 'Play pronunciation' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('The recording will be removed when you save.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect((await getCard('c1'))?.audio_path).toBeNull();
    });
    expect(await outbox()).toEqual(['card:upsert:c1', `audio:delete:${OLD}`]);
  });

  it('leaving with a new recording asks to discard it', async () => {
    const user = userEvent.setup();
    installMediaFakes();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const app = renderApp('/cards/new');
    await user.click(await screen.findByRole('button', { name: 'Record pronunciation' }));
    await user.click(await screen.findByRole('button', { name: 'Stop' }));
    await screen.findByRole('button', { name: 'Re-record' });

    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(app.location()).toBe('/cards/new');
  });
});
