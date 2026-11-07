import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerSummaryDto } from '@dsm/api-contracts';
import { useActiveServer } from '@dsm/web/core';
import { useAuth } from '@dsm/web/features/auth';

import { ServerSelector } from './ServerSelector';

vi.mock('@dsm/web/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@dsm/web/core')>()),
  useActiveServer: vi.fn(),
}));

vi.mock('@dsm/web/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick }: { children: ReactNode; to: string; onClick?: () => void }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe('ServerSelector', () => {
  const mockServers: ServerSummaryDto[] = [
    {
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
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'DayZ Livonia',
      description: null,
      status: 'stopped',
      gamePort: 2402,
      queryPort: 27017,
      rconPort: 2311,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'DayZ Sakhal',
      description: null,
      status: 'starting',
      gamePort: 2502,
      queryPort: 27018,
      rconPort: 2312,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'DayZ Deathmatch',
      description: null,
      status: 'failed',
      gamePort: 2602,
      queryPort: 27019,
      rconPort: 2313,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const setActiveServerIdMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        username: 'admin',
        role: 'admin',
        email: 'admin@dayz.local',
        roles: ['admin'],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useActiveServer).mockReturnValue({
      servers: mockServers,
      activeServer: mockServers[0],
      activeServerId: mockServers[0].id,
      setActiveServerId: setActiveServerIdMock,
      isLoading: false,
      error: null,
    });
  });

  it('renders active server name and localized Running status badge', () => {
    render(<ServerSelector />);

    expect(screen.getByText('DayZ Chernarus')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('toggles dropdown popover on trigger click', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('DayZ Livonia')).toBeInTheDocument();
    expect(screen.getByText('DayZ Sakhal')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects another server when clicked in the list', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    const livoniaOption = screen.getByRole('option', { name: /dayz livonia/i });
    fireEvent.click(livoniaOption);

    expect(setActiveServerIdMock).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters servers by search query when list has > 3 servers', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Filter servers...');
    fireEvent.change(searchInput, { target: { value: 'Sakhal' } });

    expect(screen.getByText('DayZ Sakhal')).toBeInTheDocument();
    expect(screen.queryByText('DayZ Livonia')).not.toBeInTheDocument();
  });

  it('closes popover on Escape key', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Key other than Escape does not close
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes popover on click outside', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click inside container does not close
    fireEvent.mouseDown(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders Add new server link for admin operators', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Add new server')).toBeInTheDocument();
  });

  it('closes popover when Add new server link is clicked', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    const addServerLink = screen.getByText('Add new server');
    fireEvent.click(addServerLink);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays "No servers found" when search filter matches nothing', () => {
    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Filter servers...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Server XYZ' } });

    expect(screen.getByText('No servers found')).toBeInTheDocument();
  });

  it('renders loading skeleton when activeServer is not loaded yet', () => {
    vi.mocked(useActiveServer).mockReturnValue({
      servers: [],
      activeServer: null,
      activeServerId: null,
      setActiveServerId: setActiveServerIdMock,
      isLoading: true,
      error: null,
    });

    const { container } = render(<ServerSelector />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders "No server registered" when there are no servers', () => {
    vi.mocked(useActiveServer).mockReturnValue({
      servers: [],
      activeServer: null,
      activeServerId: null,
      setActiveServerId: setActiveServerIdMock,
      isLoading: false,
      error: null,
    });

    render(<ServerSelector />);
    expect(screen.getByText('No server registered')).toBeInTheDocument();
  });

  it('does not render Add new server link for non-admin operators', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-2',
        username: 'mod',
        role: 'moderator',
        email: 'mod@dayz.local',
        roles: ['moderator'],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<ServerSelector />);

    const trigger = screen.getByRole('button', { name: /select dayz server instance/i });
    fireEvent.click(trigger);

    expect(screen.queryByText('Add new server')).not.toBeInTheDocument();
  });
});
