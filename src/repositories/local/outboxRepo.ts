import { db } from '@/db/database';
import { MAX_PUSH_ATTEMPTS } from '@/domain/constants';
import { nowIso } from '@/domain/timestamps';
import type { OutboxEntity, OutboxEntry, OutboxOp } from '@/domain/types';

/**
 * Appends an outbox entry. Call inside the same Dexie transaction as the row write.
 * An identical pending entry is reused (edits coalesce, payload is read at push time);
 * a failed one is re-armed because the new edit may fix the rejection.
 */
export async function enqueue(entity: OutboxEntity, op: OutboxOp, entityId: string): Promise<void> {
  const existing = await db.outbox
    .where('[entity+entity_id]')
    .equals([entity, entityId])
    .filter((entry) => entry.op === op)
    .first();
  if (existing) {
    if (existing.attempts > 0) {
      await db.outbox.update(existing.id, { attempts: 0, last_error: null });
    }
    return;
  }
  await db.outbox.add({
    entity,
    op,
    entity_id: entityId,
    created_at: nowIso(),
    attempts: 0,
    last_error: null,
  });
}

/** Entries the push loop should try, oldest first. Failed entries wait for Retry (step 10). */
export function listPending(): Promise<OutboxEntry[]> {
  return db.outbox.filter((entry) => entry.attempts < MAX_PUSH_ATTEMPTS).toArray();
}

export async function hasPending(entity: OutboxEntity, entityId: string): Promise<boolean> {
  return (await db.outbox.where('[entity+entity_id]').equals([entity, entityId]).count()) > 0;
}

export async function getEntry(id: number): Promise<OutboxEntry | undefined> {
  return db.outbox.get(id);
}

export async function removeEntry(id: number): Promise<void> {
  await db.outbox.delete(id);
}

export async function markFailed(id: number, error: string): Promise<void> {
  await db.outbox
    .where('id')
    .equals(id)
    .modify((entry) => {
      entry.attempts += 1;
      entry.last_error = error;
    });
}

/** All entries not yet pushed, including failed ones (logout warning, pending indicator). */
export function countAll(): Promise<number> {
  return db.outbox.count();
}

export function countFailed(): Promise<number> {
  return db.outbox.filter((entry) => entry.attempts >= MAX_PUSH_ATTEMPTS).count();
}
