import type { ReactNode } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@dsm/api-client';
import type { ServerSummaryDto } from '@dsm/api-contracts';
import { useActiveServer } from '@dsm/web/core';

import { AuthContext } from '../auth/auth.context';

import { Dashboard } from './Dashboard';

vi.mock('@dsm/api-client', () => ({
  apiClient: {
    health: {
      get: vi.fn(),
    },
  },
}));

vi.mock('@dsm/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dsm/web/core')>();
  return {
    ...actual,
    useActiveServer: vi.fn(),
  };
});

vi.mock('../server-settings', () => ({
  CreateServerModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-server-modal" /> : null,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick }: { children: ReactNode; to: string; onClick?: () => void }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

describe('Dashboard Component', () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(apiClient.health.get).mockResolvedValue({
      status: 'ok',
      uptime: 125,
      timestamp: new Date().toISOString(),
    });
  });

  it('renders zero-state onboarding banner when no servers are registered and opens modal', () => {
    vi.mocked(useActiveServer).mockReturnValue({
      servers: [],
      activeServer: null,
      activeServerId: null,
      setActiveServerId: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Dashboard />
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('zero-state-banner')).toBeInTheDocument();
    expect(screen.getByText('No DayZ Servers Registered')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /add dayz server/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(screen.getByTestId('create-server-modal')).toBeInTheDocument();
  });

  it('renders authenticated user information, active server console, and connectivity when servers exist', async () => {
    const mockServer: ServerSummaryDto = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'DayZ Chernarus',
      description: null,
      status: 'running',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(useActiveServer).mockReturnValue({
      servers: [mockServer],
      activeServer: mockServer,
      activeServerId: mockServer.id,
      setActiveServerId: vi.fn(),
      isLoading: false,
      error: null,
    });

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
    expect(screen.getByText(/DayZ Chernarus/)).toBeInTheDocument();
    expect(screen.queryByTestId('zero-state-banner')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('125s')).toBeInTheDocument();
    });

    const headerAddBtn = screen.getByRole('button', { name: /add dayz server/i });
    fireEvent.click(headerAddBtn);
    expect(screen.getByTestId('create-server-modal')).toBeInTheDocument();
  });

  it('handles health check query failure gracefully', async () => {
    vi.mocked(apiClient.health.get).mockRejectedValue(new Error('Network down'));

    vi.mocked(useActiveServer).mockReturnValue({
      servers: [],
      activeServer: null,
      activeServerId: null,
      setActiveServerId: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Dashboard />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });
});
