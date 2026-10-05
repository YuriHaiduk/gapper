import { db } from '@/db/database';
import type { MetaKey, MetaValues } from '@/domain/types';

export async function getMeta<K extends MetaKey>(key: K): Promise<MetaValues[K] | undefined> {
  const row = await db.meta.get(key);
  return row?.value as MetaValues[K] | undefined;
}

export async function setMeta<K extends MetaKey>(key: K, value: MetaValues[K]): Promise<void> {
  await db.meta.put({ key, value });
}
