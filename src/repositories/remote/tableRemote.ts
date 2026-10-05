import { toIso } from '@/domain/timestamps';
import { getSupabase } from '@/lib/supabase';
import { fromPostgrest } from './errors';
import type { RemoteRow, RemoteTable } from './types';

type Row = { id: string; user_id: string; server_updated_at: string | null };

type TableSpec<T extends Row> = {
  table: string;
  /** Explicit column list (never `*`). */
  columns: readonly (keyof T & string)[];
  /** Timestamp columns normalized to ms-precision ISO strings. */
  timestamps: readonly (keyof T & string)[];
};

/**
 * Generic Supabase table wrapper. Upserts omit `user_id` (DB default `auth.uid()`, RLS
 * guards it) and `server_updated_at` (trigger-owned).
 */
export function createTableRemote<T extends Row>(spec: TableSpec<T>): RemoteTable<T> {
  const select = spec.columns.join(',');

  function fromServer(raw: Record<string, unknown>): RemoteRow<T> {
    const row: Record<string, unknown> = { ...raw };
    for (const column of spec.timestamps) {
      const value = row[column];
      if (typeof value === 'string') row[column] = toIso(value);
    }
    return row as RemoteRow<T>;
  }

  return {
    async upsert(row) {
      const { user_id, server_updated_at, ...rest } = row;
      const payload: Record<string, unknown> = rest;
      const { data, error, status } = await getSupabase()
        .from(spec.table)
        .upsert(payload, { onConflict: 'id' })
        .select(select);
      if (error) throw fromPostgrest(error, status);
      const [first] = data as unknown as Record<string, unknown>[];
      return first ? fromServer(first) : null;
    },

    async getById(id) {
      const { data, error, status } = await getSupabase()
        .from(spec.table)
        .select(select)
        .eq('id', id)
        .maybeSingle();
      if (error) throw fromPostgrest(error, status);
      return data ? fromServer(data as unknown as Record<string, unknown>) : null;
    },

    async pullSince(cursor, limit) {
      const { data, error, status } = await getSupabase()
        .from(spec.table)
        .select(select)
        .gt('server_updated_at', cursor)
        .order('server_updated_at', { ascending: true })
        .limit(limit);
      if (error) throw fromPostgrest(error, status);
      return (data as unknown as Record<string, unknown>[]).map(fromServer);
    },
  };
}
