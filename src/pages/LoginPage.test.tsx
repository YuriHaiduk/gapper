import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SignInResult } from '@/auth/authService';
import { renderApp } from '@/test/auth';

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has no sign-up or password reset path (AC-5)', () => {
    renderApp('/login', { initialStatus: 'signed_out' });
    expect(screen.queryByText(/sign up|register|forgot/i)).not.toBeInTheDocument();
  });

  it('validates fields without calling the server', async () => {
    const signIn = vi.fn<() => Promise<SignInResult>>();
    renderApp('/login', { initialStatus: 'signed_out', signIn });
    await fillAndSubmit('', '');
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('AC-3: shows an error on wrong credentials and stays on /login', async () => {
    const signIn = vi.fn(() =>
      Promise.resolve<SignInResult>({ ok: false, error: 'invalid_credentials' }),
    );
    const app = renderApp('/login', { initialStatus: 'signed_out', signIn });
    await fillAndSubmit('owner@example.com', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(signIn).toHaveBeenCalledWith('owner@example.com', 'wrong');
    expect(app.location()).toBe('/login');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows a pending state while signing in', async () => {
    let resolve: (value: SignInResult) => void = () => undefined;
    const signIn = vi.fn(
      () =>
        new Promise<SignInResult>((r) => {
          resolve = r;
        }),
    );
    renderApp('/login', { initialStatus: 'signed_out', signIn });
    await fillAndSubmit('owner@example.com', 'secret');
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    resolve({ ok: false, error: 'unknown' });
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't sign in. Try again.");
  });

  it('shows the offline message when the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp('/login', { initialStatus: 'signed_out' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      "You're offline. Signing in requires a connection.",
    );
  });

  it('AC-2: lands on the redirect target after signing in', async () => {
    const app = renderApp('/login?redirect=%2Fcategories', { initialStatus: 'signed_out' });
    await fillAndSubmit('owner@example.com', 'secret');
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(app.location()).toBe('/categories');
  });

  it('ignores an unsafe redirect target', async () => {
    const app = renderApp('/login?redirect=%2F%2Fevil.com', { initialStatus: 'signed_out' });
    await fillAndSubmit('owner@example.com', 'secret');
    await screen.findByRole('heading', { name: 'Cards' });
    expect(app.location()).toBe('/cards');
  });
});
