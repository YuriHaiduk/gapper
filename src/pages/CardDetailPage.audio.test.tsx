import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { applyRemoteCard } from '@/repositories/local/cardsLocalRepo';
import { applyRemoteCategory } from '@/repositories/local/categoriesLocalRepo';
import { setMeta } from '@/repositories/local/metaRepo';
import { fakeSyncService, renderApp } from '@/test/auth';
import { makeCard, makeOther, USER_ID } from '@/test/factories';

const PATH = `${USER_ID}/c1/r.m4a`;

describe('CardDetailPage — audio (SPEC §7.5, §10.4)', () => {
  beforeEach(async () => {
    await setMeta('user_id', USER_ID);
    await setMeta('initial_sync_done', true);
    await applyRemoteCategory(makeOther());
    await applyRemoteCard(makeCard({ id: 'c1', audio_path: PATH }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('plays a cached recording with a large Play button', async () => {
    await db.audio_blobs.put({
      path: PATH,
      card_id: 'c1',
      blob: new Blob(['x']),
      mime: 'audio/mp4',
      uploaded: 1,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    renderApp('/cards/c1');
    const play = await screen.findByRole('button', { name: 'Play pronunciation' });
    expect(play).toHaveClass('size-14');
  });

  it('online and not cached: downloads at once (D48)', async () => {
    const blob = new Blob(['x'], { type: 'audio/mp4' });
    const downloadAudio = vi.fn(async (path: string, cardId: string) => {
      await db.audio_blobs.put({
        path,
        card_id: cardId,
        blob,
        mime: 'audio/mp4',
        uploaded: 1,
        created_at: '2026-01-01T00:00:00.000Z',
      });
      return blob;
    });
    renderApp('/cards/c1', {
      initialStatus: 'signed_in',
      sync: { ...fakeSyncService, downloadAudio },
    });
    expect(await screen.findByRole('button', { name: 'Play pronunciation' })).toBeInTheDocument();
    expect(downloadAudio).toHaveBeenCalledWith(PATH, 'c1');
  });

  it('AC-43 counterpart: offline and not cached → "Audio unavailable offline"', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp('/cards/c1');
    expect(await screen.findByText('Audio unavailable offline')).toBeInTheDocument();
  });

  it('a failed download shows an error with Retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const downloadAudio = vi.fn(() => Promise.reject(new Error('boom')));
    renderApp('/cards/c1', {
      initialStatus: 'signed_in',
      sync: { ...fakeSyncService, downloadAudio },
    });
    expect(await screen.findByText("Couldn't load audio.")).toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    await waitFor(() => {
      expect(downloadAudio).toHaveBeenCalledTimes(2);
    });
  });

  it('a card without audio shows no player', async () => {
    await applyRemoteCard(makeCard({ id: 'c2', title: 'silent' }));
    renderApp('/cards/c2');
    await screen.findByRole('heading', { name: 'silent' });
    expect(screen.queryByRole('button', { name: /pronunciation/ })).not.toBeInTheDocument();
  });
});
