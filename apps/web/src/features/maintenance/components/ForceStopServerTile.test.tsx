import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { serverQueryKeys } from '@aegis/web/core';

import {
  AT,
  OTHER_SERVER_ID,
  renderWithQueryClient,
  SERVER_ID,
  serverDetail,
  serverSummary,
} from '../__fixtures__/servers';

import { ForceStopServerTile } from './ForceStopServerTile';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: { ...actual.apiClient.servers, forceStop: vi.fn() },
    },
  };
});

const running = serverSummary({ status: 'running' });
const lastExit = { reason: 'force_stopped', exitCode: null, signal: null, at: AT } as const;
const stoppedDetail = serverDetail({ status: 'stopped', lastExit });

function renderTile(server: ServerSummaryDto = running) {
  return renderWithQueryClient(<ForceStopServerTile server={server} />, [
    server,
    serverSummary({ id: OTHER_SERVER_ID, status: 'running' }),
  ]);
}

const forceStopButton = () => screen.getByRole('button', { name: /^Force-stop$/ });
const dialog = () => screen.queryByRole('alertdialog');

function confirmForceStop() {
  fireEvent.click(forceStopButton());
  const confirm = screen.getAllByRole('button', { name: 'Force-stop' }).at(-1);
  fireEvent.click(confirm as HTMLElement);
}

describe('ForceStopServerTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error');
    vi.mocked(apiClient.servers.forceStop).mockResolvedValue(stoppedDetail);
  });

  it('warns about lost progress before anything is sent', () => {
    renderTile();
    fireEvent.click(forceStopButton());

    expect(dialog()).toHaveAccessibleName('Force-stop "Namalsk"?');
    expect(dialog()).toHaveAccessibleDescription(
      'The process is killed without saving. World progress since the last save is lost, and connected players are disconnected immediately.',
    );
    expect(apiClient.servers.forceStop).not.toHaveBeenCalled();
  });

  it('sends nothing when the operator keeps the server running', () => {
    renderTile();
    fireEvent.click(forceStopButton());
    fireEvent.click(screen.getByRole('button', { name: 'Keep running' }));

    expect(dialog()).not.toBeInTheDocument();
    expect(apiClient.servers.forceStop).not.toHaveBeenCalled();
    expect(showToast.success).not.toHaveBeenCalled();
  });

  it('force-stops after confirmation, updates only this server and shows a green toast', async () => {
    const queryClient = renderTile();
    confirmForceStop();

    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Force-Stopped',
        '"Namalsk" was killed. Progress since its last save was not kept.',
        undefined,
      ),
    );
    expect(apiClient.servers.forceStop).toHaveBeenCalledTimes(1);
    expect(apiClient.servers.forceStop).toHaveBeenCalledWith(SERVER_ID);
    expect(dialog()).not.toBeInTheDocument();
    expect(queryClient.getQueryData(serverQueryKeys.detail(SERVER_ID))).toEqual(stoppedDetail);
    expect(
      queryClient
        .getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())
        ?.map(({ status, lastExit: exit }) => ({ status, exit: exit?.reason ?? null })),
    ).toEqual([
      { status: 'stopped', exit: 'force_stopped' },
      { status: 'running', exit: null },
    ]);
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('is inert while the request is in flight', async () => {
    const pending: { resolve?: (value: typeof stoppedDetail) => void } = {};
    vi.mocked(apiClient.servers.forceStop).mockReturnValue(
      new Promise(done => {
        pending.resolve = done;
      }),
    );
    renderTile();
    confirmForceStop();

    await waitFor(() => expect(forceStopButton()).toHaveAttribute('aria-disabled', 'true'));
    fireEvent.click(forceStopButton());
    expect(dialog()).not.toBeInTheDocument();

    pending.resolve?.(stoppedDetail);
    await waitFor(() => expect(showToast.success).toHaveBeenCalled());
    expect(apiClient.servers.forceStop).toHaveBeenCalledTimes(1);
  });

  it('shows a red toast with the reason when the kill fails', async () => {
    vi.mocked(apiClient.servers.forceStop).mockRejectedValueOnce(
      new ApiError('Kill failed', 500, {
        statusCode: 500,
        error: 'Internal Server Error',
        errorCode: 'SERVER_STOP_FAILED',
        message: 'Access is denied.',
        params: { name: 'Namalsk', reason: 'Access is denied.' },
      }),
    );
    renderTile();
    confirmForceStop();

    await waitFor(() =>
      expect(showToast.error).toHaveBeenCalledWith(
        'Server Failed to Stop',
        'Access is denied.',
        undefined,
      ),
    );
    expect(showToast.success).not.toHaveBeenCalled();
    expect(forceStopButton()).not.toHaveAttribute('aria-disabled');
  });

  it.each(['starting', 'stopping'] as const)('is available while %s', status => {
    renderTile(serverSummary({ status }));
    expect(forceStopButton()).not.toHaveAttribute('aria-disabled');
  });

  it.each(['stopped', 'failed'] as const)(
    'stays focusable but inert and explains a %s server',
    status => {
      renderTile(serverSummary({ status }));

      expect(forceStopButton()).toHaveAttribute('aria-disabled', 'true');
      expect(forceStopButton()).not.toBeDisabled();
      expect(forceStopButton()).toHaveAccessibleDescription('The server is not running.');
      fireEvent.click(forceStopButton());
      expect(dialog()).not.toBeInTheDocument();
    },
  );

  it('closes the dialog when the server stops on its own while it is open', () => {
    const queryClient = new QueryClient();
    const tile = (server: ServerSummaryDto) => (
      <QueryClientProvider client={queryClient}>
        <ForceStopServerTile server={server} />
      </QueryClientProvider>
    );
    const { rerender } = render(tile(running));
    fireEvent.click(forceStopButton());
    expect(dialog()).toBeInTheDocument();

    // A live status event re-renders the tile with the stopped server.
    rerender(tile(serverSummary({ status: 'stopped', lastExit })));

    expect(dialog()).not.toBeInTheDocument();
    expect(screen.getByText('The server is not running.')).toBeInTheDocument();
    expect(apiClient.servers.forceStop).not.toHaveBeenCalled();
  });
});
