import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app shell when config is valid', () => {
    render(
      <App
        envResult={{
          ok: true,
          env: {
            supabaseUrl: 'https://abc.supabase.co',
            supabasePublishableKey: 'sb_publishable_x',
          },
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Gapper' })).toBeInTheDocument();
  });

  it('renders the configuration error screen with problems', () => {
    render(<App envResult={{ ok: false, problems: ['VITE_SUPABASE_URL is missing'] }} />);
    expect(screen.getByRole('heading', { name: 'Configuration error' })).toBeInTheDocument();
    expect(screen.getByText('VITE_SUPABASE_URL is missing')).toBeInTheDocument();
  });
});
