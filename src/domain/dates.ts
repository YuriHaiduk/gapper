const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Calendar date in the device locale, e.g. `5 Oct 2026` (detail page metadata, SPEC §7.5). */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
