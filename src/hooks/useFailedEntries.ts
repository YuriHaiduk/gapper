import { useLiveQuery } from 'dexie-react-hooks';
import type { OutboxEntry } from '@/domain/types';
import { getCard } from '@/repositories/local/cardsLocalRepo';
import { getCategory } from '@/repositories/local/categoriesLocalRepo';
import { listFailed } from '@/repositories/local/outboxRepo';

export type FailedEntry = { id: number; label: string; error: string };

async function describe(entry: OutboxEntry): Promise<string> {
  if (entry.entity === 'card') {
    const card = await getCard(entry.entity_id);
    return card ? `Card “${card.title}”` : 'Card';
  }
  if (entry.entity === 'category') {
    const category = await getCategory(entry.entity_id);
    return category ? `Category “${category.name}”` : 'Category';
  }
  return entry.op === 'upload' ? 'Recording upload' : 'Recording removal';
}

/** Outbox entries the server kept rejecting, labelled for the sync panel (SPEC §15.2). */
export function useFailedEntries(): FailedEntry[] | undefined {
  return useLiveQuery(async () => {
    const entries = await listFailed();
    return Promise.all(
      entries.map(async (entry) => ({
        id: entry.id,
        label: await describe(entry),
        error: entry.last_error ?? 'Rejected by the server',
      })),
    );
  }, []);
}
