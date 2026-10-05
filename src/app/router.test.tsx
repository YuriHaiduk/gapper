import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/auth';

describe('routing and guards', () => {
  it('AC-1: redirects a signed-out visitor to login with the requested path', async () => {
    const app = renderApp('/cards', { initialStatus: 'signed_out' });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(app.location()).toBe('/login?redirect=%2Fcards');
  });

  it('keeps the query string in the redirect', async () => {
    const app = renderApp('/cards?status=learning', { initialStatus: 'signed_out' });
    await screen.findByRole('button', { name: 'Sign in' });
    expect(app.location()).toBe('/login?redirect=%2Fcards%3Fstatus%3Dlearning');
  });

  it('AC-4: redirects a signed-in owner away from login', async () => {
    const app = renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Cards' })).toBeInTheDocument();
    expect(app.location()).toBe('/cards');
  });

  it('redirects / to /cards', async () => {
    const app = renderApp('/');
    await screen.findByRole('heading', { name: 'Cards' });
    expect(app.location()).toBe('/cards');
  });

  it('shows the splash while auth initializes', () => {
    renderApp('/cards', { initialStatus: 'loading' });
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('renders NotFound for unknown paths', () => {
    renderApp('/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to cards' })).toBeInTheDocument();
  });

  it('opens categories from the overflow menu and signs out to /login', async () => {
    const user = userEvent.setup();
    const app = renderApp('/cards');

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('link', { name: 'Categories' }));
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(app.location()).toBe('/login');
    });
  });
});
