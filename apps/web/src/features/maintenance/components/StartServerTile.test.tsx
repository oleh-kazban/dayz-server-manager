import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import {
  EMPTY_LAUNCH_OPTIONS,
  type LaunchCommandPreviewDto,
  type ServerDetailDto,
  type ServerSummaryDto,
} from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { serverQueryKeys } from '@aegis/web/core';

import { StartServerTile } from './StartServerTile';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: { ...actual.apiClient.servers, getLaunchCommand: vi.fn(), start: vi.fn() },
    },
  };
});

const ID = '22222222-2222-4222-8222-222222222222';
const AT = '2026-11-17T10:00:00.000Z';

const summary: ServerSummaryDto = {
  id: ID,
  name: 'Namalsk',
  status: 'stopped',
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: true,
  lastExit: null,
  createdAt: AT,
  updatedAt: AT,
};

const preview = (overrides: Partial<LaunchCommandPreviewDto> = {}): LaunchCommandPreviewDto => ({
  serverId: ID,
  platform: 'linux',
  mods: { modFolders: [], serverModFolders: [], missingFolderCount: 0 },
  command: {
    ready: true,
    executable: '/opt/dayz/DayZServer',
    cwd: '/opt/dayz',
    args: [],
    commandLine: '',
    segments: [],
    issues: [],
  },
  editLock: null,
  ...overrides,
});

const startedDetail: ServerDetailDto = {
  ...summary,
  status: 'starting',
  description: null,
  installPath: '/opt/dayz',
  profilePath: 'profiles',
  missionPath: 'mpmissions/dayzOffline.namalsk',
  launchOptions: EMPTY_LAUNCH_OPTIONS,
  maxPlayers: 60,
  rconIp: '127.0.0.1',
  rconPassword: null,
  runtime: { pid: 4242, startedAt: AT },
};

function renderTile(server: ServerSummaryDto = summary, { seedList = true } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seedList) {
    queryClient.setQueryData(serverQueryKeys.list(), [server]);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <StartServerTile server={server} />
    </QueryClientProvider>,
  );
  return queryClient;
}

const startButton = () => screen.getByRole('button', { name: /Start server/ });

describe('StartServerTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error');
    vi.mocked(apiClient.servers.getLaunchCommand).mockResolvedValue(preview());
    vi.mocked(apiClient.servers.start).mockResolvedValue(startedDetail);
  });

  it('starts the server, updates the cache and shows a green toast', async () => {
    const queryClient = renderTile();
    await waitFor(() => expect(startButton()).not.toHaveAttribute('aria-disabled'));

    fireEvent.click(startButton());
    fireEvent.click(startButton()); // double click: one request

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Starting',
        '"Namalsk" is starting. Its status updates live.',
        undefined,
      ),
    );
    expect(apiClient.servers.start).toHaveBeenCalledTimes(1);
    expect(apiClient.servers.start).toHaveBeenCalledWith(ID);
    expect(queryClient.getQueryData(serverQueryKeys.detail(ID))).toEqual(startedDetail);
    expect(queryClient.getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())?.[0].status).toBe(
      'starting',
    );
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('starts without a loaded server list (deep link) and leaves it unloaded', async () => {
    const queryClient = renderTile(summary, { seedList: false });
    await waitFor(() => expect(startButton()).not.toHaveAttribute('aria-disabled'));
    fireEvent.click(startButton());
    await waitFor(() => expect(showToast.success).toHaveBeenCalled());
    expect(queryClient.getQueryData(serverQueryKeys.list())).toBeUndefined();
  });

  it('only changes the started server in a multi-server list', async () => {
    const other: ServerSummaryDto = { ...summary, id: '33333333-3333-4333-8333-333333333333' };
    const queryClient = renderTile();
    queryClient.setQueryData(serverQueryKeys.list(), [summary, other]);
    await waitFor(() => expect(startButton()).not.toHaveAttribute('aria-disabled'));
    fireEvent.click(startButton());
    await waitFor(() => expect(showToast.success).toHaveBeenCalled());
    expect(
      queryClient.getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())?.map(s => s.status),
    ).toEqual(['starting', 'stopped']);
  });

  it('shows a red toast when the API refuses the start', async () => {
    vi.mocked(apiClient.servers.start).mockRejectedValueOnce(
      new ApiError('Not ready', 422, {
        statusCode: 422,
        error: 'Unprocessable Entity',
        errorCode: 'SERVER_START_FAILED',
        message: "Failed to start '/opt/dayz/DayZServer' (ENOENT).",
        params: { name: 'Namalsk', reason: "Failed to start '/opt/dayz/DayZServer' (ENOENT)." },
      }),
    );
    renderTile();
    await waitFor(() => expect(startButton()).not.toHaveAttribute('aria-disabled'));

    fireEvent.click(startButton());

    await waitFor(() =>
      expect(showToast.error).toHaveBeenCalledWith(
        'Server Failed to Start',
        "Failed to start '/opt/dayz/DayZServer' (ENOENT).",
        undefined,
      ),
    );
    expect(showToast.success).not.toHaveBeenCalled();
    expect(startButton()).not.toHaveAttribute('aria-disabled');
  });

  it('stays focusable but inert and explains an edit lock', async () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockResolvedValue(
      preview({ editLock: { holderName: 'Oleh', acquiredAt: AT } }),
    );
    renderTile();

    const reason = 'serverDZ.cfg is being edited by Oleh. Start is available once editing ends.';
    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(startButton()).toHaveAttribute('aria-disabled', 'true');
    expect(startButton()).not.toBeDisabled();
    expect(startButton()).toHaveAccessibleDescription(reason);

    fireEvent.click(startButton());
    expect(apiClient.servers.start).not.toHaveBeenCalled();
    expect(showToast.success).not.toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('explains a running server and a not-ready launch command', async () => {
    renderTile({ ...summary, status: 'running' });
    expect(await screen.findByText('The server is already running.')).toBeInTheDocument();
    expect(startButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the readiness check while it loads', () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockReturnValue(new Promise(() => undefined));
    renderTile();
    expect(screen.getByText('Checking whether the server can start…')).toBeInTheDocument();
  });

  it('lets the server decide when the readiness check fails, without a toast', async () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockRejectedValue(new Error('offline'));
    renderTile();
    await waitFor(() => expect(startButton()).not.toHaveAttribute('aria-disabled'));
    expect(showToast.error).not.toHaveBeenCalled();
  });
});
