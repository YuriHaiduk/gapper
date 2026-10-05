export type AppEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; problems: string[] };

type RawEnv = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY', unknown>>;

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Validates browser config. Problems name the variable only — values are never echoed. */
export function parseEnv(raw: RawEnv): EnvResult {
  const problems: string[] = [];
  const supabaseUrl = nonEmpty(raw.VITE_SUPABASE_URL);
  const supabasePublishableKey = nonEmpty(raw.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (supabaseUrl === null) problems.push('VITE_SUPABASE_URL is missing');
  else if (!isHttpUrl(supabaseUrl)) problems.push('VITE_SUPABASE_URL is not a valid http(s) URL');
  if (supabasePublishableKey === null) problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is missing');

  if (problems.length > 0 || supabaseUrl === null || supabasePublishableKey === null) {
    return { ok: false, problems };
  }
  return { ok: true, env: { supabaseUrl, supabasePublishableKey } };
}

export const envResult: EnvResult = parseEnv(import.meta.env);
