/** Delete confirmation text (SPEC §7.3). */
export function deleteCardPrompt(title: string): string {
  return `Delete “${title}”? This cannot be undone.`;
}

/** Comparison key for the duplicate-title hint (SPEC §7.1): trimmed, case-insensitive. */
export function duplicateTitleKey(title: string): string {
  return title.trim().toLowerCase();
}
