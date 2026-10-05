/** Domain types (SPEC §16.1). Timestamps are ISO-8601 UTC strings with ms precision. */
export type CardStatus = 'learning' | 'learned';

export type Category = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Set only by the server; null until first synced. */
  server_updated_at: string | null;
};

/** Tiptap/ProseMirror JSON node (SPEC §16.1, D42). */
export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = {
  type: string;
  text?: string;
  marks?: RichMark[];
  attrs?: Record<string, unknown>;
  content?: RichNode[];
};
/** Notes document: `{ type: 'doc', content: [...] }`. */
export type RichText = { type: 'doc'; content?: RichNode[] };

export type Card = {
  id: string;
  user_id: string;
  title: string;
  /** Free-form rich text: examples, translations… (D42). */
  notes: RichText | null;
  category_id: string;
  status: CardStatus;
  audio_path: string | null;
  learned_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string | null;
};

/** Local Dexie row: the card plus its derived, normalized search text (SPEC §11.3). */
export type LocalCard = Card & { _search: string };

export type CardFilter = {
  status?: CardStatus;
  categorySlug?: string;
  q?: string;
};

export type OutboxEntity = 'category' | 'card' | 'audio';
export type OutboxOp = 'upsert' | 'delete' | 'upload';

/** Outbox entry (SPEC §15.2). The payload is read from the local row at push time. */
export type OutboxEntry = {
  id: number;
  entity: OutboxEntity;
  op: OutboxOp;
  /** Row id, storage path, or storage folder prefix ending in `/`. */
  entity_id: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

export type AudioBlobRow = {
  path: string;
  card_id: string;
  blob: Blob;
  mime: string;
  uploaded: 0 | 1;
  created_at: string;
};

export type MetaValues = {
  user_id: string;
  cards_cursor: string;
  categories_cursor: string;
  last_sync_at: string;
  initial_sync_done: boolean;
};

export type MetaKey = keyof MetaValues;
export type MetaRow = { [K in MetaKey]: { key: K; value: MetaValues[K] } }[MetaKey];
