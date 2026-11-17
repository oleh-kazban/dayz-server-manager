import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { ServerDetailDto, ServerSummaryDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { serverQueryKeys } from '@aegis/web/core';

import {
  AT,
  renderWithQueryClient,
  SERVER_ID,
  serverDetail,
  serverSummary,
} from '../__fixtures__/servers';

import { StopServerTile } from './StopServerTile';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: { ...actual.apiClient.servers, get: vi.fn(), stop: vi.fn(), cancelStop: vi.fn() },
    },
  };
});

const running = serverSummary({ status: 'running' });
const runtime = { pid: 4242, startedAt: AT };
const pendingIn = (ms: number) => ({
  executeAt: new Date(Date.now() + ms).toISOString(),
  requestedAt: new Date().toISOString(),
});

function renderTile(server: ServerSummaryDto = running) {
  return renderWithQueryClient(<StopServerTile server={server} />, [server]);
}

const stopButton = () => screen.getByRole('button', { name: /^Stop server$/ });
const dialog = () => screen.queryByRole('dialog');

async function openDialog() {
  await waitFor(() => expect(stopButton()).not.toHaveAttribute('aria-disabled'));
  fireEvent.click(stopButton());
  expect(dialog()).toBeInTheDocument();
}

describe('StopServerTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error');
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'running', runtime }),
    );
  });

  it('stops now: green toast, dialog closes, cache updated', async () => {
    const stopping = serverDetail({ status: 'stopping', runtime });
    vi.mocked(apiClient.servers.stop).mockResolvedValue(stopping);
    const queryClient = renderTile();
    await openDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Stop now' }));

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Stopping',
        '"Namalsk" is saving the world and shutting down. Its status updates live.',
        undefined,
      ),
    );
    expect(apiClient.servers.stop).toHaveBeenCalledWith(SERVER_ID, { delaySec: 0 });
    expect(dialog()).not.toBeInTheDocument();
    expect(queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(SERVER_ID))).toEqual(
      stopping,
    );
    expect(queryClient.getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())?.[0].status).toBe(
      'stopping',
    );
  });

  it('schedules a stop: green toast with the time, then the countdown and Cancel', async () => {
    const pendingStop = pendingIn(300_000);
    const scheduled = serverDetail({ status: 'running', runtime, pendingStop });
    vi.mocked(apiClient.servers.stop).mockResolvedValue(scheduled);
    renderTile();
    await openDialog();

    fireEvent.click(screen.getByRole('radio', { name: '5 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule stop' }));

    const time = new Date(pendingStop.executeAt).toLocaleTimeString();
    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Stop Scheduled',
        `"Namalsk" stops at ${time}. Players have been warned.`,
        undefined,
      ),
    );
    expect(apiClient.servers.stop).toHaveBeenCalledWith(SERVER_ID, { delaySec: 300 });
    expect(screen.getByText(`Stop scheduled for ${time}`)).toBeInTheDocument();
    expect(screen.getByText(/^Stops in [45]:\d\d$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel scheduled stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Stop server$/ })).not.toBeInTheDocument();
  });

  it('cancels a scheduled stop with a green toast', async () => {
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'running', runtime, pendingStop: pendingIn(60_000) }),
    );
    vi.mocked(apiClient.servers.cancelStop).mockResolvedValue(
      serverDetail({ status: 'running', runtime }),
    );
    renderTile();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel scheduled stop' }));

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Scheduled Stop Cancelled',
        '"Namalsk" keeps running. Players have been told.',
        undefined,
      ),
    );
    expect(apiClient.servers.cancelStop).toHaveBeenCalledWith(SERVER_ID);
    expect(await screen.findByRole('button', { name: /^Stop server$/ })).toBeInTheDocument();
  });

  it('says it is stopping once the scheduled time has passed', async () => {
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'running', runtime, pendingStop: pendingIn(-1_000) }),
    );
    renderTile();
    expect(await screen.findByText('Stopping now…')).toBeInTheDocument();
  });

  it('keeps the dialog open with a red toast pointing to force-stop when RCON is unreachable', async () => {
    vi.mocked(apiClient.servers.stop).mockRejectedValueOnce(
      new ApiError('unreachable', 502, {
        statusCode: 502,
        error: 'Bad Gateway',
        errorCode: 'SERVER_RCON_UNREACHABLE',
        message: 'No RCON login response.',
        params: { name: 'Namalsk', reason: 'No RCON login response.' },
      }),
    );
    renderTile();
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Stop now' }));

    await waitFor(() =>
      expect(showToast.error).toHaveBeenCalledWith(
        'RCON Unreachable',
        'Could not reach BattlEye RCON for "Namalsk" (No RCON login response.). Nothing was stopped; force-stop is still available.',
        undefined,
      ),
    );
    expect(dialog()).toBeInTheDocument();
    expect(showToast.success).not.toHaveBeenCalled();
  });

  it('shows server field errors inline next to the red toast', async () => {
    vi.mocked(apiClient.servers.stop).mockRejectedValueOnce(
      new ApiError('invalid', 400, {
        statusCode: 400,
        error: 'Bad Request',
        errorCode: 'VALIDATION_FAILED',
        message: 'Warning message can be at most 120 characters',
        fieldErrors: {
          message: {
            code: 'INVALID_VALUE',
            message: 'Warning message can be at most 120 characters',
          },
        },
      }),
    );
    renderTile();
    await openDialog();
    fireEvent.click(screen.getByRole('radio', { name: '1 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule stop' }));

    await waitFor(() => expect(showToast.error).toHaveBeenCalled());
    expect(screen.getByLabelText('In-game warning (optional)')).toHaveAccessibleDescription(
      'Warning message can be at most 120 characters',
    );
  });

  it.each([
    ['stopped', 'The server is not running.'],
    ['starting', 'The server is still starting. Wait until it is running.'],
    ['stopping', 'The server is already stopping.'],
  ] as const)('stays focusable but inert and explains a %s server', (status, reason) => {
    renderTile(serverSummary({ status }));
    expect(stopButton()).toHaveAttribute('aria-disabled', 'true');
    expect(stopButton()).toHaveAccessibleDescription(reason);
    fireEvent.click(stopButton());
    expect(dialog()).not.toBeInTheDocument();
  });

  it('shows a scheduled stop that failed when due until dismissed', async () => {
    const queryClient = renderTile();
    act(() => {
      queryClient.setQueryData(serverQueryKeys.stopFailure(SERVER_ID), {
        errorCode: 'SERVER_RCON_UNREACHABLE',
        message: 'No RCON login response.',
        at: AT,
      });
    });

    expect(await screen.findByText('The scheduled stop did not run')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No RCON login response. The server is still running; Force-stop is still available.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    await waitFor(() =>
      expect(screen.queryByText('The scheduled stop did not run')).not.toBeInTheDocument(),
    );
  });

  it('clears an earlier failure when a new stop is sent', async () => {
    vi.mocked(apiClient.servers.stop).mockReturnValue(new Promise(() => undefined));
    const queryClient = renderTile();
    act(() => {
      queryClient.setQueryData(serverQueryKeys.stopFailure(SERVER_ID), {
        errorCode: 'X',
        message: 'Old failure.',
        at: AT,
      });
    });
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Stop now' }));
    await waitFor(() =>
      expect(screen.queryByText('The scheduled stop did not run')).not.toBeInTheDocument(),
    );
    expect(stopButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('closes the dialog from its own controls', async () => {
    renderTile();
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(dialog()).not.toBeInTheDocument();
    expect(apiClient.servers.stop).not.toHaveBeenCalled();
  });

  it('closes the dialog when the server stops elsewhere', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tile = (server: ServerSummaryDto) => (
      <QueryClientProvider client={queryClient}>
        <StopServerTile server={server} />
      </QueryClientProvider>
    );
    const { rerender } = render(tile(running));
    await openDialog();

    // A live status event re-renders the tile with the server no longer running.
    rerender(tile(serverSummary({ status: 'stopped' })));

    expect(dialog()).not.toBeInTheDocument();
    expect(screen.getByText('The server is not running.')).toBeInTheDocument();
  });
});
