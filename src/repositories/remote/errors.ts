/**
 * `network` — unreachable / offline: stop pushing, retry on the next trigger.
 * `auth` — session rejected: stop pushing, keep the outbox (SPEC §9).
 * `rejected` — the server refused this entry (constraint, RLS…): count an attempt, move on.
 */
export type RemoteErrorKind = 'network' | 'auth' | 'rejected';

export class RemoteError extends Error {
  readonly kind: RemoteErrorKind;
  readonly code: string;

  constructor(kind: RemoteErrorKind, message: string, code = '') {
    super(message);
    this.name = 'RemoteError';
    this.kind = kind;
    this.code = code;
  }
}

const UNIQUE_VIOLATION = '23505';
const AUTH_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof RemoteError && error.code === UNIQUE_VIOLATION;
}

type PostgrestLikeError = { message: string; code?: string };

/** Maps a PostgREST `{ error, status }` pair to a typed error. */
export function fromPostgrest(error: PostgrestLikeError, status: number): RemoteError {
  const code = error.code ?? '';
  if (status === 0 || !navigator.onLine) return new RemoteError('network', error.message, code);
  if (status === 401 || AUTH_CODES.has(code)) return new RemoteError('auth', error.message, code);
  return new RemoteError('rejected', error.message, code);
}

/** Maps a storage-js error: API errors carry an HTTP `status`, network failures don't. */
export function fromStorage(error: Error & { status?: number | undefined }): RemoteError {
  if (error.status === undefined || !navigator.onLine) {
    return new RemoteError('network', error.message);
  }
  if (error.status === 401) return new RemoteError('auth', error.message, '401');
  return new RemoteError('rejected', error.message, String(error.status));
}
