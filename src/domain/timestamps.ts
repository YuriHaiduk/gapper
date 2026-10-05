/** Normalizes any timestamp (e.g. Postgres µs precision) to `YYYY-MM-DDTHH:mm:ss.sssZ`. */
export function toIso(value: string | number | Date): string {
  return new Date(value).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}
