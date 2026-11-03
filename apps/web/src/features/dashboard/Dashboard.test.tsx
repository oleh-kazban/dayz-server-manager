import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '../auth/auth.context';

import { Dashboard } from './Dashboard';

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders authenticated user information and server connectivity', async () => {
    const mockAuthContext = {
      user: {
        id: 'usr-456',
        username: 'admin',
        email: 'admin@dayz.local',
        role: 'admin' as const,
        roles: ['admin' as const],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Dashboard />
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.getByText('Authentication Status')).toBeInTheDocument();
    expect(screen.getByText('Backend Connectivity')).toBeInTheDocument();
    expect(screen.getByText('usr-456')).toBeInTheDocument();
  });
});
