// English UI (D64): dates are always English, e.g. `6 Oct 2026`, in the device time zone.
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** Calendar date in English, e.g. `5 Oct 2026` (detail page metadata, SPEC §7.5). */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
