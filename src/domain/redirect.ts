export const DEFAULT_AFTER_LOGIN = '/cards';

/**
 * Returns `value` only if it is a same-app relative path (SPEC §21, no open redirect),
 * otherwise the default landing page.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value?.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  // `//host` and `/\host` are protocol-relative URLs in browsers.
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_AFTER_LOGIN;
  return value;
}
