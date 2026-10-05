import { describe, expect, it } from 'vitest';
import { validateLogin } from './loginValidation';

describe('validateLogin', () => {
  it('accepts a valid email and non-empty password', () => {
    expect(validateLogin({ email: ' owner@example.com ', password: 'x' })).toEqual({});
  });

  it('requires both fields', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Enter your email.',
      password: 'Enter your password.',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateLogin({ email: 'owner@', password: 'x' }).email).toBe('Enter a valid email.');
  });
});
