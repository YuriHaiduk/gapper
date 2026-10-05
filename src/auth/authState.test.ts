import { describe, expect, it } from 'vitest';
import type { AuthState } from './authContext';
import { nextAuthState } from './authState';

const USER = { id: 'user-1', email: 'owner@example.com' };
const LOADING: AuthState = { status: 'loading', user: null };
const SIGNED_IN: AuthState = { status: 'signed_in', user: USER };

describe('nextAuthState', () => {
  it('signs in whenever the event carries a session', () => {
    expect(nextAuthState(LOADING, 'INITIAL_SESSION', USER, false)).toEqual(SIGNED_IN);
    expect(nextAuthState({ status: 'expired', user: USER }, 'SIGNED_IN', USER, false)).toEqual(
      SIGNED_IN,
    );
  });

  it('is signed out on a cold start without a session', () => {
    expect(nextAuthState(LOADING, 'INITIAL_SESSION', null, false)).toEqual({
      status: 'signed_out',
      user: null,
    });
  });

  it('is signed out after the owner signs out', () => {
    expect(nextAuthState(SIGNED_IN, 'SIGNED_OUT', null, true).status).toBe('signed_out');
  });

  it('expires when the session ends without the owner signing out, keeping the user', () => {
    expect(nextAuthState(SIGNED_IN, 'SIGNED_OUT', null, false)).toEqual({
      status: 'expired',
      user: USER,
    });
  });

  it('stays expired through the initial null session of a cold start', () => {
    const expired = nextAuthState(LOADING, 'SIGNED_OUT', null, false);
    expect(expired.status).toBe('expired');
    expect(nextAuthState(expired, 'INITIAL_SESSION', null, false)).toBe(expired);
  });
});
