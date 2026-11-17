import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { serverQueryKeys } from '@aegis/web/core';

import {
  AT,
  renderWithQueryClient,
  SERVER_ID,
  serverDetail,
  serverSummary,
} from '../__fixtures__/servers';

import { RestartServerTile } from './RestartServerTile';
import { StopServerTile } from './StopServerTile';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: {
        ...actual.apiClient.servers,
        get: vi.fn(),
        restart: vi.fn(),
        cancelStop: vi.fn(),
      },
    },
  };
});

const running = serverSummary({ status: 'running' });
const runtime = { pid: 4242, startedAt: AT };
const pendingIn = (ms: number) => ({
  executeAt: new Date(Date.now() + ms).toISOString(),
  requestedAt: new Date().toISOString(),
});

function renderTiles(server: ServerSummaryDto = running) {
  return renderWithQueryClient(
    <>
      <StopServerTile server={server} />
      <RestartServerTile server={server} />
    </>,
    [server],
  );
}

const restartButton = () => screen.getByRole('button', { name: /^Restart server$/ });
const stopButton = () => screen.getByRole('button', { name: /^Stop server$/ });
const dialog = () => screen.queryByRole('dialog');

async function openDialog() {
  await waitFor(() => expect(restartButton()).not.toHaveAttribute('aria-disabled'));
  fireEvent.click(restartButton());
}

describe('RestartServerTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error');
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'running', runtime }),
    );
  });

  it('opens the dialog in restart wording', async () => {
    renderTiles();
    await openDialog();

    expect(dialog()).toHaveAccessibleName('Restart "Namalsk"');
    expect(
      screen.getByText(
        'The server restarts right away; players are disconnected until it is back.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '5 min' }));
    expect(screen.getByLabelText('In-game warning (optional)')).toHaveAttribute(
      'placeholder',
      'Server is restarting in 5 minutes. Please find a safe place and log out.',
    );
    expect(screen.getByRole('button', { name: 'Schedule restart' })).toBeInTheDocument();
  });

  it('restarts now with a green toast', async () => {
    vi.mocked(apiClient.servers.restart).mockResolvedValue(
      serverDetail({ status: 'stopping', runtime, restartRequested: true }),
    );
    renderTiles();
    await openDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Restart now' }));

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Restarting',
        '"Namalsk" is saving the world and starts again once it has stopped. Its status updates live.',
        undefined,
      ),
    );
    expect(apiClient.servers.restart).toHaveBeenCalledWith(SERVER_ID, { delaySec: 0 });
    expect(dialog()).not.toBeInTheDocument();
  });

  it('schedules a restart: countdown and Cancel on Restart, a hint on Stop', async () => {
    const pendingStop = pendingIn(120_000);
    vi.mocked(apiClient.servers.restart).mockResolvedValue(
      serverDetail({ status: 'running', runtime, pendingStop, restartRequested: true }),
    );
    renderTiles();
    await openDialog();
    fireEvent.click(screen.getByRole('radio', { name: '1 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule restart' }));

    const time = new Date(pendingStop.executeAt).toLocaleTimeString();
    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Restart Scheduled',
        `"Namalsk" restarts at ${time}. Players have been warned.`,
        undefined,
      ),
    );
    expect(screen.getByText(`Restart scheduled for ${time}`)).toBeInTheDocument();
    expect(screen.getByText(/^Restarts in [12]:\d\d$/)).toBeInTheDocument();
    expect(stopButton()).toHaveAttribute('aria-disabled', 'true');
    expect(stopButton()).toHaveAccessibleDescription(
      'A restart is already scheduled. Cancel it to choose another time.',
    );
    expect(screen.queryByText(/^Stop scheduled for/)).not.toBeInTheDocument();
  });

  it('cancels a scheduled restart with the restart toast', async () => {
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({
        status: 'running',
        runtime,
        pendingStop: pendingIn(60_000),
        restartRequested: true,
      }),
    );
    vi.mocked(apiClient.servers.cancelStop).mockResolvedValue(
      serverDetail({ status: 'running', runtime }),
    );
    renderTiles();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel scheduled restart' }));

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Scheduled Restart Cancelled',
        '"Namalsk" keeps running. Players have been told.',
        undefined,
      ),
    );
  });

  it('a scheduled plain stop stays on the Stop tile and blocks Restart', async () => {
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'running', runtime, pendingStop: pendingIn(60_000) }),
    );
    renderTiles();

    expect(await screen.findByText(/^Stop scheduled for/)).toBeInTheDocument();
    expect(restartButton()).toHaveAttribute('aria-disabled', 'true');
    expect(restartButton()).toHaveAccessibleDescription(
      'A stop is already scheduled. Cancel it to choose another time.',
    );
  });

  it('explains a restart in progress on both tiles', async () => {
    vi.mocked(apiClient.servers.get).mockResolvedValue(
      serverDetail({ status: 'stopping', runtime, restartRequested: true }),
    );
    renderTiles(serverSummary({ status: 'stopping' }));

    expect(
      await screen.findAllByText('The server is restarting. It starts again once it has stopped.'),
    ).toHaveLength(2);
  });

  it('points a stopped server to Start', () => {
    renderTiles(serverSummary({ status: 'stopped' }));
    expect(restartButton()).toHaveAccessibleDescription(
      'The server is not running. Use Start instead.',
    );
  });

  it('shows a red toast and keeps the dialog open when RCON is unreachable', async () => {
    vi.mocked(apiClient.servers.restart).mockRejectedValueOnce(
      new ApiError('unreachable', 502, {
        statusCode: 502,
        error: 'Bad Gateway',
        errorCode: 'SERVER_RCON_UNREACHABLE',
        message: 'No answer.',
        params: { name: 'Namalsk', reason: 'No answer.' },
      }),
    );
    renderTiles();
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Restart now' }));

    await waitFor(() => expect(showToast.error).toHaveBeenCalled());
    expect(vi.mocked(showToast.error).mock.calls[0][0]).toBe('RCON Unreachable');
    expect(dialog()).toBeInTheDocument();
  });

  it.each([
    [
      'stop',
      'The scheduled restart did not run',
      'No RCON login response. The server is still running; Force-stop is still available.',
    ],
    [
      'start',
      'The server stopped but did not start again',
      'No RCON login response. Check the launch settings, then start it from the Start tile.',
    ],
  ] as const)('names a failed %s phase until dismissed', async (phase, title, body) => {
    const queryClient = renderTiles();
    act(() => {
      queryClient.setQueryData(serverQueryKeys.restartFailure(SERVER_ID), {
        phase,
        errorCode: 'X',
        message: 'No RCON login response.',
        at: AT,
      });
    });

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
    // The Stop tile only shows plain stop failures.
    expect(screen.queryByText('The scheduled stop did not run')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    await waitFor(() => expect(screen.queryByText(title)).not.toBeInTheDocument());
  });
});
