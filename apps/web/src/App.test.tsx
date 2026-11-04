import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { authStorage } from './features/auth/auth.storage';
import { App } from './App';

describe('App Root Component', () => {
  beforeEach(() => {
    authStorage.clear();
  });

  it('renders root app with providers and redirects guest to sign-in view', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('renders persistent AppShell and navigation rail when authenticated without blank screen', async () => {
    authStorage.set(
      {
        id: 'usr-admin-1',
        username: 'admin',
        email: 'admin@dayz.local',
        role: 'admin',
        roles: ['admin'],
      },
      false,
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    });
  });
});
