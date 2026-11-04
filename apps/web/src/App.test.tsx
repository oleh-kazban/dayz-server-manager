import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { authStorage } from './features/auth/auth.storage';
import { App, AppErrorBoundary } from './App';

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

  it('catches uncaught child rendering exceptions and displays RootErrorFallback', () => {
    function BrokenComponent(): never {
      throw new Error('Explosive test render failure');
    }

    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('Explosive test render failure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
