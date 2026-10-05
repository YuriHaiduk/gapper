import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { mapSignInError } from './authService';

describe('mapSignInError', () => {
  it('maps invalid credentials', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    expect(mapSignInError(error, true)).toBe('invalid_credentials');
  });

  it('maps network failures to offline', () => {
    expect(mapSignInError(new AuthRetryableFetchError('Failed to fetch', 0), true)).toBe('offline');
  });

  it('maps anything to offline when the browser reports offline', () => {
    expect(mapSignInError(new Error('boom'), false)).toBe('offline');
  });

  it('maps other errors to unknown', () => {
    expect(
      mapSignInError(new AuthApiError('Too many requests', 429, 'over_request_rate_limit'), true),
    ).toBe('unknown');
    expect(mapSignInError(new Error('boom'), true)).toBe('unknown');
  });
});
