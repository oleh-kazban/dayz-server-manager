import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import {
  EMPTY_LAUNCH_OPTIONS,
  type ServerDetailDto,
  type ServerSummaryDto,
} from '@aegis/api-contracts';
import { useActiveServer } from '@aegis/web/core';

import { MaintenanceView } from './MaintenanceView';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

vi.mock('@aegis/web/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@aegis/web/core')>()),
  useActiveServer: vi.fn(),
}));

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: { ...actual.apiClient.servers, get: vi.fn(), getLaunchCommand: vi.fn() },
    },
  };
});

const ID = '22222222-2222-4222-8222-222222222222';
const AT = '2026-11-17T10:00:00.000Z';
const server: ServerSummaryDto = {
  id: ID,
  name: 'Namalsk',
  status: 'running',
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: true,
  lastExit: null,
  createdAt: AT,
  updatedAt: AT,
};
const detail = (overrides: Partial<ServerDetailDto> = {}): ServerDetailDto => ({
  ...server,
  description: null,
  installPath: '/opt/dayz',
  profilePath: 'profiles',
  missionPath: 'mpmissions/dayzOffline.namalsk',
  launchOptions: EMPTY_LAUNCH_OPTIONS,
  maxPlayers: 60,
  rconIp: '127.0.0.1',
  rconPassword: null,
  runtime: { pid: 4242, startedAt: AT },
  ...overrides,
});

function activeServer(value: Partial<ReturnType<typeof useActiveServer>>) {
  vi.mocked(useActiveServer).mockReturnValue({
    servers: [],
    activeServer: null,
    activeServerId: null,
    setActiveServerId: vi.fn(),
    isLoading: false,
    error: null,
    ...value,
  } as ReturnType<typeof useActiveServer>);
}

function renderView() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MaintenanceView />
    </QueryClientProvider>,
  );
}

describe('MaintenanceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.servers.get).mockResolvedValue(detail());
    vi.mocked(apiClient.servers.getLaunchCommand).mockReturnValue(new Promise(() => undefined));
  });

  it('shows the lifecycle section with live status and the running process', async () => {
    activeServer({ servers: [server], activeServer: server, activeServerId: ID });
    renderView();

    expect(screen.getByRole('heading', { name: 'Maintenance & Lifecycle' })).toBeInTheDocument();
    expect(screen.getByText('Server lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(
      await screen.findByText(`PID 4242 · started ${new Date(AT).toLocaleString()}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start server/ })).toBeInTheDocument();
  });

  it('explains why a failed server ended', async () => {
    const failed: ServerSummaryDto = {
      ...server,
      status: 'failed',
      lastExit: { reason: 'crashed', exitCode: 1, signal: null, at: AT },
    };
    vi.mocked(apiClient.servers.get).mockResolvedValue(detail({ ...failed, runtime: null }));
    activeServer({ servers: [failed], activeServer: failed, activeServerId: ID });
    renderView();
    expect(await screen.findByText('Crashed (exit 1)')).toHaveAttribute(
      'title',
      `Crashed (exit 1) at ${new Date(AT).toLocaleString()}`,
    );
  });

  it('says when no process is running', async () => {
    const stopped: ServerSummaryDto = { ...server, status: 'stopped' };
    vi.mocked(apiClient.servers.get).mockResolvedValue(detail({ ...stopped, runtime: null }));
    activeServer({ servers: [stopped], activeServer: stopped, activeServerId: ID });
    renderView();
    expect(await screen.findByText('No server process is running.')).toBeInTheDocument();
  });

  it('shows a skeleton while loading and the empty state without servers', () => {
    activeServer({ isLoading: true });
    renderView();
    expect(screen.queryByText('Server lifecycle')).not.toBeInTheDocument();
  });

  it('sends the operator to server settings to add a server', () => {
    activeServer({});
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(navigate).toHaveBeenCalledWith({ to: '/settings/server' });
  });
});
