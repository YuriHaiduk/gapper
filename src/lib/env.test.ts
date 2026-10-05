import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts a valid config and trims values', () => {
    expect(
      parseEnv({
        VITE_SUPABASE_URL: ' https://abc.supabase.co ',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
      }),
    ).toEqual({
      ok: true,
      env: { supabaseUrl: 'https://abc.supabase.co', supabasePublishableKey: 'sb_publishable_123' },
    });
  });

  it('reports every missing variable', () => {
    expect(parseEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '  ' })).toEqual({
      ok: false,
      problems: ['VITE_SUPABASE_URL is missing', 'VITE_SUPABASE_PUBLISHABLE_KEY is missing'],
    });
    expect(parseEnv({}).ok).toBe(false);
  });

  it('rejects a non-http URL without echoing the value', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: 'ftp://secret-host',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
    });
    expect(result).toEqual({
      ok: false,
      problems: ['VITE_SUPABASE_URL is not a valid http(s) URL'],
    });
    expect(JSON.stringify(result)).not.toContain('secret-host');
  });
});
