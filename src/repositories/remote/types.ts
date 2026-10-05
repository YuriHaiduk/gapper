import type { Card, Category } from '@/domain/types';

export type RemoteRow<T> = T & { server_updated_at: string };

/** Thin wrapper over one Supabase table (used only by `sync/`). */
export type RemoteTable<T extends { id: string }> = {
  /** Upserts and returns the server row, or `null` when the LWW trigger skipped a stale write. */
  upsert(row: T): Promise<RemoteRow<T> | null>;
  getById(id: string): Promise<RemoteRow<T> | null>;
  /** Rows with `server_updated_at > cursor`, oldest first. */
  pullSince(cursor: string, limit: number): Promise<RemoteRow<T>[]>;
};

export type AudioRemote = {
  /** Uploads without overwriting; an already existing object counts as success. */
  upload(path: string, blob: Blob, contentType: string): Promise<void>;
  /** Removes one object, or every object under a folder prefix ending in `/`. */
  remove(pathOrPrefix: string): Promise<void>;
  /** Downloads one object (authenticated; RLS applies). */
  download(path: string): Promise<Blob>;
};

export type SyncRemote = {
  categories: RemoteTable<Category>;
  cards: RemoteTable<Card>;
  audio: AudioRemote;
};
