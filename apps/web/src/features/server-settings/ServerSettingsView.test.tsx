import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import {
  DEFAULT_LAUNCH_OPTIONS,
  EMPTY_LAUNCH_OPTIONS,
  type LaunchCommandPreviewDto,
  type ServerDetailDto,
  type ServerSummaryDto,
  type ValidateServerPathsResponseDto,
} from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { enUSTranslations, serverQueryKeys } from '@aegis/web/core';

import { ServerSettingsView } from './ServerSettingsView';

const mockNavigate = vi.fn();
const mockSetActiveServerId = vi.fn();

const mockActiveServerSummary: ServerSummaryDto = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'DayZ Namalsk',
  description: 'Namalsk survival server',
  status: 'stopped',
  gamePort: 2402,
  queryPort: 27018,
  rconPort: 2410,
  isDefault: false,
  lastExit: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockDefaultServerSummary: ServerSummaryDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'DayZ Chernarus Vanilla',
  description: 'Main instance',
  status: 'running',
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: true,
  lastExit: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockServerDetail: ServerDetailDto = {
  ...mockActiveServerSummary,
  installPath: 'C:\\DayZServer\\Namalsk',
  profilePath: 'profiles',
  missionPath: 'mpmissions\\dayzOffline.namalsk',
  launchOptions: { ...EMPTY_LAUNCH_OPTIONS, cpuCount: 4, doLogs: true },
  runtime: null,
  lastExit: null,
  maxPlayers: 60,
  rconIp: '127.0.0.1',
  rconPassword: 'current-rcon-secret',
};

function buildLaunchContext(serverId: string): LaunchCommandPreviewDto {
  return {
    serverId,
    platform: 'win32',
    mods: { modFolders: ['@CF'], serverModFolders: [], missingFolderCount: 0 },
    command: {
      ready: true,
      executable: 'C:\\DayZServer\\Namalsk\\DayZServer_x64.exe',
      cwd: 'C:\\DayZServer\\Namalsk',
      args: [],
      commandLine: '',
      segments: [],
      issues: [],
    },
  };
}

let mockServers: ServerSummaryDto[] = [mockDefaultServerSummary, mockActiveServerSummary];
let currentActiveSummary: ServerSummaryDto | null = mockActiveServerSummary;
let currentDetail: ServerDetailDto | null = mockServerDetail;

vi.mock('./components/server-config/ServerConfigCard', () => ({
  ServerConfigCard: ({
    serverId,
    serverName,
    isServerRunning,
  }: {
    serverId: string;
    serverName: string;
    isServerRunning: boolean;
  }) => (
    <div
      data-testid="server-config-card"
      data-server-id={serverId}
      data-server-name={serverName}
      data-running={String(isServerRunning)}
    />
  ),
}));

vi.mock('@aegis/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/web/core')>();
  return {
    ...actual,
    useActiveServer: () => ({
      servers: mockServers,
      activeServer: currentActiveSummary,
      activeServerId: currentActiveSummary?.id ?? null,
      setActiveServerId: mockSetActiveServerId,
      isLoading: false,
      error: null,
    }),
  };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: {
        ...actual.apiClient.servers,
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        create: vi.fn(),
        validatePaths: vi.fn(),
        getLaunchCommand: vi.fn(),
      },
    },
  };
});

describe('ServerSettingsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    mockServers = [mockDefaultServerSummary, mockActiveServerSummary];
    currentActiveSummary = { ...mockActiveServerSummary };
    currentDetail = { ...mockServerDetail };

    vi.mocked(apiClient.servers.get).mockImplementation(async () => currentDetail!);
    vi.mocked(apiClient.servers.update).mockImplementation(async () => currentDetail!);
    vi.mocked(apiClient.servers.getLaunchCommand).mockImplementation(async serverId =>
      buildLaunchContext(serverId),
    );
    vi.mocked(apiClient.servers.delete).mockImplementation(async () => ({ success: true }));
    vi.mocked(apiClient.servers.create).mockImplementation(async dto => ({
      ...mockServerDetail,
      ...dto,
      id: '33333333-3333-4333-8333-333333333333',
      description: dto.description ?? null,
      launchOptions: DEFAULT_LAUNCH_OPTIONS,
      status: 'stopped',
      isDefault: dto.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    vi.mocked(apiClient.servers.validatePaths).mockImplementation(async (serverId, dto) => {
      const installRoot = dto?.installPath ?? mockServerDetail.installPath;
      const profileRelative = dto?.profilePath ?? 'profiles';
      return buildValidationResult(serverId, {
        paths: {
          installPath: {
            target: 'installPath',
            configuredPath: installRoot,
            resolvedPath: installRoot,
            status: 'valid',
            exists: true,
            isDirectory: true,
            executablePath: `${installRoot}\\DayZServer_x64.exe`,
            executablePresent: true,
            executableRunnable: true,
          },
          profilePath: {
            target: 'profilePath',
            configuredPath: profileRelative,
            resolvedPath: `${installRoot}\\${profileRelative}`,
            status: 'valid',
            exists: true,
            isDirectory: true,
            writable: true,
          },
          battleyePath: {
            target: 'battleyePath',
            configuredPath: `${profileRelative}\\BattlEye`,
            resolvedPath: `${installRoot}\\${profileRelative}\\BattlEye`,
            status: 'valid',
            exists: true,
            isDirectory: true,
            writable: true,
          },
          missionPath: {
            target: 'missionPath',
            configuredPath: dto?.missionPath ?? mockServerDetail.missionPath,
            resolvedPath: `${installRoot}\\mpmissions\\dayzOffline.namalsk`,
            status: 'valid',
            exists: true,
            isDirectory: true,
            hasInitScript: true,
            hasEconomyDb: true,
          },
        },
      });
    });
  });

  const buildValidationResult = (
    serverId: string,
    overrides?: Partial<ValidateServerPathsResponseDto>,
  ): ValidateServerPathsResponseDto => ({
    serverId,
    valid: true,
    platform: 'win32',
    checkedAt: '2026-11-14T12:00:00.000Z',
    paths: {
      installPath: {
        target: 'installPath',
        configuredPath: 'C:\\DayZServer\\Namalsk',
        resolvedPath: 'C:\\DayZServer\\Namalsk',
        status: 'valid',
        exists: true,
        isDirectory: true,
        executablePath: 'C:\\DayZServer\\Namalsk\\DayZServer_x64.exe',
        executablePresent: true,
        executableRunnable: true,
      },
      profilePath: {
        target: 'profilePath',
        configuredPath: 'profiles',
        resolvedPath: 'C:\\DayZServer\\Namalsk\\profiles',
        status: 'valid',
        exists: true,
        isDirectory: true,
        writable: true,
      },
      battleyePath: {
        target: 'battleyePath',
        configuredPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
        resolvedPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
        status: 'valid',
        exists: true,
        isDirectory: true,
        writable: true,
      },
      missionPath: {
        target: 'missionPath',
        configuredPath: 'mpmissions\\dayzOffline.namalsk',
        resolvedPath: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
        status: 'valid',
        exists: true,
        isDirectory: true,
        hasInitScript: true,
        hasEconomyDb: true,
      },
    },
    discoveredMissions: [
      {
        name: 'dayzOffline.chernarusplus',
        relativePath: 'mpmissions/dayzOffline.chernarusplus',
        resolvedPath: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.chernarusplus',
        hasInitScript: true,
        hasEconomyDb: true,
      },
      {
        name: 'dayzOffline.namalsk',
        relativePath: 'mpmissions/dayzOffline.namalsk',
        resolvedPath: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
        hasInitScript: true,
        hasEconomyDb: false,
      },
    ],
    issues: [],
    ...overrides,
  });

  const renderView = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ServerSettingsView />
      </QueryClientProvider>,
    );

  it('hydrates form fields with active server details', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Namalsk survival server')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2402')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2410')).toBeInTheDocument();
    expect(screen.getByDisplayValue('current-rcon-secret')).toBeInTheDocument();
    expect(screen.getByDisplayValue('C:\\DayZServer\\Namalsk')).toBeInTheDocument();
    expect(screen.getByLabelText(/CPU Count/i)).toHaveValue(4);
    expect(screen.getByLabelText(/FPS Limit/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Server logs/i)).toBeChecked();
    expect(screen.getByLabelText(/Admin log/i)).not.toBeChecked();

    const preview = await screen.findByRole('region', { name: /Compiled launch command/i });
    const args = within(preview)
      .getAllByRole('listitem')
      .map(item => item.querySelector('code')?.textContent);
    expect(args).toEqual([
      '-config=serverDZ.cfg',
      '-port=2402',
      '-profiles=profiles',
      '-BEpath=profiles\\BattlEye',
      '-mod=@CF',
      '-cpuCount=4',
      '-doLogs',
    ]);
    expect(
      within(preview).getByText('C:\\DayZServer\\Namalsk\\DayZServer_x64.exe'),
    ).toBeInTheDocument();
    expect(within(preview).queryByText('Unsaved')).not.toBeInTheDocument();
    expect(screen.getByTestId('derived-profile-path')).toHaveTextContent(
      'C:\\DayZServer\\Namalsk\\profiles',
    );
    expect(screen.getByTestId('derived-battleye-path')).toHaveTextContent(
      'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
    );
    expect(screen.getByLabelText('Active Mission')).toHaveTextContent(
      'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
    );
  });

  it('allows port and path modifications when server is stopped', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('2402')).toBeInTheDocument();
    });

    const gamePortInput = screen.getByDisplayValue('2402');
    const installPathInput = screen.getByDisplayValue('C:\\DayZServer\\Namalsk');

    expect(gamePortInput).not.toBeDisabled();
    expect(installPathInput).not.toBeDisabled();
    expect(screen.queryByText(/Configuration Locked/i)).not.toBeInTheDocument();
  });

  it('locks network ports and storage paths when server is running (GUARD-SRV-03)', async () => {
    currentActiveSummary = { ...mockDefaultServerSummary };
    currentDetail = {
      ...mockServerDetail,
      ...mockDefaultServerSummary,
      status: 'running',
    };

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Configuration Locked/i)).toBeInTheDocument();
    });

    const gamePortInput = screen.getByDisplayValue('2302');
    const installPathInput = screen.getByDisplayValue('C:\\DayZServer\\Namalsk');

    expect(gamePortInput).toBeDisabled();
    expect(installPathInput).toBeDisabled();
  });

  it('submits updated settings and triggers SERVER_UPDATED toast without rendering inline Settings Saved notice', async () => {
    vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
      ...mockServerDetail,
      name: 'DayZ Namalsk Season 2',
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('DayZ Namalsk');
    fireEvent.change(nameInput, { target: { value: 'DayZ Namalsk Season 2' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.servers.update).toHaveBeenCalledWith(
        mockActiveServerSummary.id,
        expect.objectContaining({
          name: 'DayZ Namalsk Season 2',
        }),
      );
      expect(showToast.success).toHaveBeenCalledWith(
        'Settings Saved',
        'Configuration for "DayZ Namalsk Season 2" has been updated successfully.',
        undefined,
      );
    });
    expect(screen.queryByText('Settings Saved')).not.toBeInTheDocument();
  });

  it('triggers error toast when update mutation fails with a non-field error (e.g. SERVER_RUNNING_CONFIG_LOCKED) without rendering inline Update Failed notice', async () => {
    vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
      new ApiError('Running lock', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_RUNNING_CONFIG_LOCKED',
        message: 'Cannot alter network ports while running',
        params: { id: mockActiveServerSummary.id, name: 'DayZ Namalsk', status: 'running' },
      }),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Edited' } });
    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Configuration Locked',
        'Cannot modify server configuration, ports, credentials, or file paths while "DayZ Namalsk" is running.',
        undefined,
      );
    });
    expect(screen.queryByText('Update Failed')).not.toBeInTheDocument();
  });

  it('disables delete button when server is active (GUARD-SRV-01)', async () => {
    currentActiveSummary = { ...mockActiveServerSummary, status: 'running' };
    currentDetail = {
      ...mockServerDetail,
      status: 'running',
    };

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Server must be stopped before deletion/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete server/i });
    expect(deleteButton).toBeDisabled();
  });

  it('allows deleting a stopped default server and enables delete button', async () => {
    currentActiveSummary = { ...mockDefaultServerSummary, status: 'stopped' };
    currentDetail = {
      ...mockServerDetail,
      ...mockDefaultServerSummary,
      status: 'stopped',
      isDefault: true,
    };

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });
  });

  it('keeps ports and paths editable and delete enabled for a failed server', async () => {
    currentActiveSummary = { ...mockActiveServerSummary, status: 'failed' };
    currentDetail = { ...mockServerDetail, status: 'failed' };

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('2402')).not.toBeDisabled();
    expect(screen.getByDisplayValue('C:\\DayZServer\\Namalsk')).not.toBeDisabled();
    expect(screen.queryByText(/Configuration Locked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Server must be stopped before deletion/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
  });

  it.each([
    { status: 'starting', label: 'Starting' },
    { status: 'stopping', label: 'Stopping' },
  ] as const)(
    'locks ports, paths and delete for a $status server (GUARD-SRV-01, GUARD-SRV-03)',
    async ({ status, label }) => {
      currentActiveSummary = { ...mockActiveServerSummary, status };
      currentDetail = { ...mockServerDetail, status };

      renderView();

      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      expect(screen.getByText(/Configuration Locked/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('2402')).toBeDisabled();
      expect(screen.getByDisplayValue('C:\\DayZServer\\Namalsk')).toBeDisabled();
      expect(screen.getByText(/Server must be stopped before deletion/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete server/i })).toBeDisabled();
    },
  );

  it.each([
    { status: 'running', label: 'Running' },
    { status: 'stopped', label: 'Stopped' },
  ] as const)(
    'renders the localized $status label in the header status tag',
    async ({ status, label }) => {
      currentActiveSummary = { ...mockActiveServerSummary, status };
      currentDetail = { ...mockServerDetail, status };

      renderView();

      await waitFor(() => {
        expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
      });
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it('renders empty zero-state notice when zero servers exist in DSM console', async () => {
    mockServers = [];
    currentActiveSummary = null;
    currentDetail = null;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/No DayZ Servers Registered/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add DayZ Server/i })).toBeInTheDocument();
    });

    const addServerBtn = screen.getByRole('button', { name: /Add DayZ Server/i });
    fireEvent.click(addServerBtn);

    const dialog = screen.getByRole('dialog', { name: /Create DayZ Server/i });
    expect(dialog).toBeInTheDocument();

    const cancelBtn = within(dialog).getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog', { name: /Create DayZ Server/i })).not.toBeInTheDocument();
  });

  it('opens KeywordConfirmation modal and executes server deletion only after keyword matches', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete server/i });
    fireEvent.click(deleteButton);

    // KeywordConfirmation dialog appears
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole('button', { name: 'Delete server' });
    expect(confirmButton).toBeDisabled();

    // Type the server name into the keyword confirmation input
    const keywordInput = within(dialog).getByRole('textbox');
    fireEvent.change(keywordInput, { target: { value: mockActiveServerSummary.name } });

    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiClient.servers.delete).toHaveBeenCalledWith(mockActiveServerSummary.id);
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Deleted',
        'Server "DayZ Namalsk" has been removed from DayZ Server Manager.',
        undefined,
      );
      expect(mockSetActiveServerId).toHaveBeenCalledWith(mockDefaultServerSummary.id, {
        ignoreBlocker: true,
      });
    });
  });

  it('closes KeywordConfirmation modal when Cancel button is clicked', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete server/i });
    fireEvent.click(deleteButton);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('triggers error toast when server deletion fails on backend', async () => {
    vi.mocked(apiClient.servers.delete).mockRejectedValueOnce(
      new ApiError('Server running', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_RUNNING_DELETE_LOCKED',
        message: 'Cannot delete while running',
        params: {
          id: mockActiveServerSummary.id,
          name: mockActiveServerSummary.name,
          status: 'running',
        },
      }),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete server/i }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: mockActiveServerSummary.name },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete server' }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Deletion Locked',
        'Cannot delete "DayZ Namalsk" while it is running. Stop the server first.',
        undefined,
      );
    });
  });

  it('navigates to dashboard and clears serverId search param when last server is deleted', async () => {
    mockServers = [mockActiveServerSummary];
    currentActiveSummary = mockActiveServerSummary;

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete server/i });
    fireEvent.click(deleteButton);

    const dialog = screen.getByRole('alertdialog');
    const keywordInput = within(dialog).getByRole('textbox');
    fireEvent.change(keywordInput, { target: { value: mockActiveServerSummary.name } });

    const confirmButton = within(dialog).getByRole('button', { name: 'Delete server' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiClient.servers.delete).toHaveBeenCalledWith(mockActiveServerSummary.id);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/dashboard',
          search: expect.any(Function),
        }),
      );
      const searchUpdater = mockNavigate.mock.calls[0][0].search as (
        prev: Record<string, unknown>,
      ) => Record<string, unknown>;
      expect(searchUpdater({ serverId: '123', tab: 'logs' })).toEqual({ tab: 'logs' });
    });
  });

  it('opens CreateServerModal and allows creating a new server instance', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add new server/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add new server/i }));

    expect(screen.getByRole('dialog', { name: /Create DayZ Server/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. DayZ Namalsk Hardcore');
    fireEvent.change(nameInput, { target: { value: 'DayZ Deer Isle' } });

    const submitButton = screen.getByRole('button', { name: 'Create Server' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.servers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DayZ Deer Isle',
          gamePort: 2302,
          rconPort: 2310,
        }),
      );
    });
  });

  it('displays inline field validation errors in CreateServerModal when submitting empty fields', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add new server/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add new server/i }));

    const dialog = screen.getByRole('dialog', { name: /Create DayZ Server/i });
    expect(dialog).toBeInTheDocument();

    const submitButton = within(dialog).getByRole('button', { name: 'Create Server' });
    fireEvent.click(submitButton);

    expect(screen.getByText('Server name is required.')).toBeInTheDocument();
    expect(apiClient.servers.create).not.toHaveBeenCalled();

    // Type into the input to verify reactive error clearance
    const nameInput = screen.getByPlaceholderText('e.g. DayZ Namalsk Hardcore');
    fireEvent.change(nameInput, { target: { value: 'Valid Server Name' } });

    expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();
  });

  it('displays inline field validation errors in ServerSettingsForm when name is empty', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockServerDetail.name)).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue(mockServerDetail.name);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Server name is required.')).toBeInTheDocument();
    expect(apiClient.servers.update).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();
  });

  it('updates form fields and saves server configuration successfully', async () => {
    vi.mocked(apiClient.servers.update).mockResolvedValue({
      ...mockServerDetail,
      name: 'Updated Chernarus',
      description: 'New Description',
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockServerDetail.name)).toBeInTheDocument();
    });

    // Update name
    fireEvent.change(screen.getByDisplayValue(mockServerDetail.name), {
      target: { value: 'Updated Chernarus' },
    });

    // Update description
    const descInput = screen.getByPlaceholderText('Instance notes or purpose');
    fireEvent.change(descInput, { target: { value: 'New Description' } });

    // Update Game Port
    const gamePortInput = screen.getByDisplayValue(String(mockServerDetail.gamePort));
    fireEvent.change(gamePortInput, { target: { value: '2304' } });

    // Update RCON Port
    const rconPortInput = screen.getByDisplayValue(String(mockServerDetail.rconPort));
    fireEvent.change(rconPortInput, { target: { value: '2312' } });

    // Update RCON Password
    const rconPassInput = screen.getByLabelText(/RCON Password/i);
    fireEvent.change(rconPassInput, { target: { value: 'newpassword123' } });

    // Update Paths
    const installInput = screen.getByDisplayValue(mockServerDetail.installPath);
    fireEvent.change(installInput, { target: { value: 'D:\\DayZServer' } });

    // Update launch options
    fireEvent.change(screen.getByLabelText(/CPU Count/i), { target: { value: '8' } });
    fireEvent.click(screen.getByLabelText(/Freeze check/i));

    // Toggle default instance
    const toggle = screen.getByLabelText(/Default Server Instance/i);
    fireEvent.click(toggle);

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.servers.update).toHaveBeenCalledWith(
        mockServerDetail.id,
        expect.objectContaining({
          name: 'Updated Chernarus',
          description: 'New Description',
          gamePort: 2304,
          rconPort: 2312,
          rconPassword: 'newpassword123',
          installPath: 'D:\\DayZServer',
          launchOptions: {
            ...EMPTY_LAUNCH_OPTIONS,
            cpuCount: 8,
            doLogs: true,
            freezeCheck: true,
          },
          isDefault: true,
        }),
      );
      expect(showToast.success).toHaveBeenCalledWith(
        'Settings Saved',
        'Configuration for "Updated Chernarus" has been updated successfully.',
        undefined,
      );
    });
  });

  describe('engine launch options (DSM-00125)', () => {
    it('marks the compiled preview unsaved while launch options differ and blocks invalid values on save without a request or toast', async () => {
      renderView();
      const preview = await screen.findByRole('region', { name: /Compiled launch command/i });

      fireEvent.click(screen.getByLabelText(/Network log/i));
      expect(within(preview).getByText('Unsaved')).toBeInTheDocument();
      expect(within(preview).getByText('-netLog')).toBeInTheDocument();

      const cpuInput = screen.getByLabelText(/CPU Count/i);
      fireEvent.change(cpuInput, { target: { value: '99' } });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      const message =
        'CPU count must be a whole number between 1 and 64, or empty for the engine default.';
      expect(await screen.findByText(message)).toBeInTheDocument();
      await waitFor(() => expect(cpuInput).toHaveFocus());
      expect(apiClient.servers.update).not.toHaveBeenCalled();
      expect(showToast.error).not.toHaveBeenCalled();

      fireEvent.change(cpuInput, { target: { value: '4' } });
      expect(screen.queryByText(message)).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText(/Network log/i));
      expect(within(preview).queryByText('Unsaved')).not.toBeInTheDocument();
    });

    it('shows an API launchOptions field error inline with a red toast and hides it once the value is edited', async () => {
      vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
        new ApiError('Validation failed', 400, {
          statusCode: 400,
          error: 'Bad Request',
          errorCode: 'VALIDATION_FAILED',
          message: 'CPU count must be between 1 and 64',
          fieldErrors: {
            'launchOptions.cpuCount': {
              code: 'INVALID_VALUE',
              message: 'CPU count must be between 1 and 64',
            },
          },
        }),
      );
      renderView();
      await screen.findByRole('region', { name: /Compiled launch command/i });

      const cpuInput = screen.getByLabelText(/CPU Count/i);
      fireEvent.change(cpuInput, { target: { value: '8' } });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => expect(apiClient.servers.update).toHaveBeenCalled());
      await waitFor(() => expect(showToast.error).toHaveBeenCalled());
      expect(await screen.findByText('CPU count must be between 1 and 64')).toBeInTheDocument();
      expect(showToast.error).toHaveBeenCalledWith(
        'Validation Error',
        'Please review the highlighted fields and correct any invalid values.',
        undefined,
      );
      await waitFor(() => expect(cpuInput).toHaveFocus());

      fireEvent.change(cpuInput, { target: { value: '6' } });
      expect(screen.queryByText('CPU count must be between 1 and 64')).not.toBeInTheDocument();
    });

    it('saves launch options with a green toast and resets the preview to saved', async () => {
      vi.mocked(apiClient.servers.update).mockImplementationOnce(async (_id, dto) => ({
        ...currentDetail!,
        launchOptions: dto.launchOptions!,
      }));
      renderView();
      const preview = await screen.findByRole('region', { name: /Compiled launch command/i });

      fireEvent.change(screen.getByLabelText(/FPS Limit/i), { target: { value: '120' } });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(apiClient.servers.update).toHaveBeenCalledWith(
          mockServerDetail.id,
          expect.objectContaining({
            launchOptions: { ...EMPTY_LAUNCH_OPTIONS, cpuCount: 4, doLogs: true, limitFPS: 120 },
          }),
        );
      });
      await waitFor(() => expect(showToast.success).toHaveBeenCalled());
      expect(within(preview).getByText('-limitFPS=120')).toBeInTheDocument();
      await waitFor(() => {
        expect(within(preview).queryByText('Unsaved')).not.toBeInTheDocument();
      });
    });
  });

  it('highlights all conflicting fields inline AND fires a red error toast when saving server settings fails with 409 fieldErrors (REQ-03)', async () => {
    vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
      new ApiError('Conflicts detected', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_NAME_CONFLICT',
        message: 'Conflict',
        params: { name: 'DayZ Chernarus Vanilla' },
        fieldErrors: {
          name: {
            code: 'SERVER_NAME_CONFLICT',
            message: 'Name conflict',
            params: { name: 'DayZ Chernarus Vanilla' },
          },
          gamePort: {
            code: 'SERVER_PORT_COLLISION',
            message: 'Port 2302 conflict',
            params: {
              port: 2302,
              occupiedBy: 'DayZ Chernarus Vanilla',
              occupiedById: 'srv-1',
            },
          },
          rconPort: {
            code: 'SERVER_PORT_COLLISION',
            message: 'Port 2310 conflict',
            params: {
              port: 2310,
              occupiedBy: 'DayZ Chernarus Vanilla',
              occupiedById: 'srv-1',
            },
          },
        },
      }),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockServerDetail.name)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Edited' } });
    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('A server named "DayZ Chernarus Vanilla" already exists.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Port 2302 is already in use by server "DayZ Chernarus Vanilla".'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Port 2310 is already in use by server "DayZ Chernarus Vanilla".'),
      ).toBeInTheDocument();
    });
    expect(showToast.error).toHaveBeenCalledWith(
      'Server Name Conflict',
      'A server named "DayZ Chernarus Vanilla" already exists. Please choose a unique name.',
      undefined,
    );

    // Editing the highlighted name field clears only that field's error
    const nameInput = screen.getByDisplayValue(mockServerDetail.name);
    fireEvent.change(nameInput, { target: { value: 'DayZ Namalsk Unique' } });
    expect(
      screen.queryByText('A server named "DayZ Chernarus Vanilla" already exists.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Port 2302 is already in use by server "DayZ Chernarus Vanilla".'),
    ).toBeInTheDocument();
  });

  it('opens and closes CreateServerModal from header Add new server button', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add new server/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add new server/i }));
    const dialog = screen.getByRole('dialog', { name: /Create DayZ Server/i });
    expect(dialog).toBeInTheDocument();

    const cancelBtn = within(dialog).getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog', { name: /Create DayZ Server/i })).not.toBeInTheDocument();
  });

  it('validates client-side required fields, port bounds, port collisions, and short rcon password in ServerSettingsForm', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockServerDetail.name)).toBeInTheDocument();
    });

    // 1. Clear installation path and set invalid ports and short password
    const installInput = screen.getByDisplayValue(mockServerDetail.installPath);
    fireEvent.change(installInput, { target: { value: '   ' } });

    const gamePortInput = screen.getByDisplayValue(String(mockServerDetail.gamePort));
    fireEvent.change(gamePortInput, { target: { value: '500' } });

    const rconPortInput = screen.getByDisplayValue(String(mockServerDetail.rconPort));
    fireEvent.change(rconPortInput, { target: { value: '0' } });

    const rconPassInput = screen.getByLabelText(/BattlEye RCON Password/i);
    fireEvent.change(rconPassInput, { target: { value: '123' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Installation path is required.')).toBeInTheDocument();
    expect(screen.getAllByText('Port must be between 1024 and 65535.')).toHaveLength(2);
    expect(
      screen.getByText('RCON password must be between 6 and 32 characters'),
    ).toBeInTheDocument();
    expect(apiClient.servers.update).not.toHaveBeenCalled();

    // 2. Test port collision when ports are equal
    fireEvent.change(installInput, { target: { value: 'C:\\DayZServer\\Namalsk' } });
    fireEvent.change(rconPassInput, { target: { value: 'secretpass' } });

    fireEvent.change(gamePortInput, { target: { value: '2302' } });
    fireEvent.change(rconPortInput, { target: { value: '2302' } });

    fireEvent.click(saveButton);

    expect(
      screen.getByText('Game port, query port, and RCON port must all be distinct.'),
    ).toBeInTheDocument();
    expect(apiClient.servers.update).not.toHaveBeenCalled();

    // Changing gamePort clears the distinct port error attached to gamePort
    fireEvent.change(gamePortInput, { target: { value: '2305' } });
    expect(
      screen.queryByText('Game port, query port, and RCON port must all be distinct.'),
    ).not.toBeInTheDocument();

    // Changing rconPort exercises its onChange and clearFieldError
    fireEvent.change(rconPortInput, { target: { value: '2315' } });
  });

  it('allows saving unlocked metadata while locking all runtime configuration fields on active servers (GUARD-SRV-03)', async () => {
    currentActiveSummary = { ...mockDefaultServerSummary };
    currentDetail = {
      ...mockServerDetail,
      ...mockDefaultServerSummary,
      status: 'running',
    };

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Configuration Locked/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Server Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Game Port \(UDP\)/i)).toBeDisabled();
    expect(screen.getByLabelText(/BattlEye RCON Port/i)).toBeDisabled();
    expect(screen.getByLabelText(/BattlEye RCON Bind IP/i)).toBeDisabled();
    expect(screen.getByLabelText(/BattlEye RCON Password/i)).toBeDisabled();
    expect(screen.getByLabelText(/Installation Path/i)).toBeDisabled();
    expect(screen.getByLabelText(/CPU Count/i)).toBeDisabled();
    expect(screen.getByLabelText(/FPS Limit/i)).toBeDisabled();
    expect(screen.getByLabelText(/Server logs/i)).toBeDisabled();

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Live maintenance note' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.servers.update).toHaveBeenCalledWith(mockDefaultServerSummary.id, {
        description: 'Live maintenance note',
        isDefault: true,
      });
    });
  });

  it('renders Server Not Found notice when server detail query fails', async () => {
    vi.mocked(apiClient.servers.get).mockRejectedValueOnce(new Error('Failed to fetch detail'));

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Server Not Found')).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to load configuration for the selected server/i),
      ).toBeInTheDocument();
    });
  });

  it('ignores rapid duplicate save clicks while update mutation is in flight (QA-01)', async () => {
    let resolveUpdate!: (val: ServerDetailDto) => void;
    vi.mocked(apiClient.servers.update).mockReturnValueOnce(
      new Promise(resolve => {
        resolveUpdate = resolve;
      }),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Edited' } });
    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    const formId = saveButton.getAttribute('form')!;
    const form = document.getElementById(formId)!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiClient.servers.update).toHaveBeenCalledTimes(1);
    });

    resolveUpdate(mockServerDetail);
    await waitFor(() => {
      expect(showToast.success).toHaveBeenCalledTimes(1);
    });
  });

  it('ignores rapid duplicate delete confirmation clicks while delete mutation is in flight (QA-01)', async () => {
    let resolveDelete!: (val: { success: boolean }) => void;
    vi.mocked(apiClient.servers.delete).mockReturnValueOnce(
      new Promise(resolve => {
        resolveDelete = resolve;
      }),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete server/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete server/i }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: mockActiveServerSummary.name },
    });

    const confirmButton = within(dialog).getByRole('button', { name: 'Delete server' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiClient.servers.delete).toHaveBeenCalledTimes(1);
    });

    resolveDelete({ success: true });
    await waitFor(() => {
      expect(showToast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage & File System Paths Validation and Mission Discovery (REQ-06)', () => {
    it('does not validate on mount and submits trimmed draft paths only on Validate Paths click without rendering Discovered Missions section', async () => {
      vi.mocked(apiClient.servers.validatePaths).mockResolvedValueOnce(
        buildValidationResult(mockActiveServerSummary.id, {
          paths: {
            ...buildValidationResult(mockActiveServerSummary.id).paths,
            installPath: {
              ...buildValidationResult(mockActiveServerSummary.id).paths.installPath,
              configuredPath: 'D:\\Servers\\DayZ',
              resolvedPath: 'D:\\Servers\\DayZ',
              executablePath: 'D:\\Servers\\DayZ\\DayZServer_x64.exe',
            },
          },
        }),
      );

      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });
      expect(apiClient.servers.validatePaths).not.toHaveBeenCalled();
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('Valid')).not.toBeInTheDocument();
      expect(screen.queryByText('Discovered Missions')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: '  D:\\Servers\\DayZ  ' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenNthCalledWith(
          1,
          mockActiveServerSummary.id,
          {
            installPath: 'D:\\Servers\\DayZ',
            profilePath: 'profiles',
            missionPath: 'mpmissions\\dayzOffline.namalsk',
          },
        );
      });

      expect(await screen.findByText('Verified')).toBeInTheDocument();
      expect(
        screen.getByText(/Installation, executable, profile, and mission paths are verified on/i),
      ).toBeInTheDocument();
      expect(screen.getAllByText('Valid')).toHaveLength(4);
      expect(
        screen.getByText('Executable: D:\\Servers\\DayZ\\DayZServer_x64.exe'),
      ).toBeInTheDocument();
      expect(screen.getByText('init.c present')).toBeInTheDocument();
      expect(screen.getByText('db/ present')).toBeInTheDocument();
      expect(screen.queryByText('Discovered Missions')).not.toBeInTheDocument();
    });

    it('renders each path once: diagnostics under a field never repeat its label or resolved path', async () => {
      renderView();

      fireEvent.click(await screen.findByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();

      for (const label of ['Profile Directory', 'BattlEye Directory']) {
        expect(screen.getAllByText(label)).toHaveLength(1);
      }
      expect(screen.queryByText('Installation & Executable')).not.toBeInTheDocument();
      expect(screen.queryByText('Mission Directory')).not.toBeInTheDocument();

      expect(screen.getAllByText('C:\\DayZServer\\Namalsk\\profiles')).toHaveLength(1);
      expect(screen.getAllByText('C:\\DayZServer\\Namalsk\\profiles\\BattlEye')).toHaveLength(1);
      for (const target of ['installPath', 'profilePath', 'battleyePath', 'missionPath']) {
        expect(
          within(screen.getByTestId(`path-diagnostics-${target}`)).getByText('Valid'),
        ).toBeInTheDocument();
      }
    });

    it('renders Verified with Warnings for non-blocking issues (singular and plural) and Select emptyText when no missions discovered', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      vi.mocked(apiClient.servers.validatePaths)
        .mockResolvedValueOnce(
          buildValidationResult(mockActiveServerSummary.id, {
            valid: true,
            discoveredMissions: [],
            paths: {
              ...buildValidationResult(mockActiveServerSummary.id).paths,
              battleyePath: {
                target: 'battleyePath',
                configuredPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
                resolvedPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
                status: 'warning',
                exists: false,
                isDirectory: false,
                writable: false,
              },
            },
            issues: [
              {
                target: 'battleyePath',
                severity: 'warning',
                code: 'BATTLEYE_DIR_MISSING',
                message: 'BattlEye missing',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          buildValidationResult(mockActiveServerSummary.id, {
            valid: true,
            paths: {
              ...buildValidationResult(mockActiveServerSummary.id).paths,
              battleyePath: {
                target: 'battleyePath',
                configuredPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
                resolvedPath: 'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
                status: 'warning',
                exists: false,
                isDirectory: false,
                writable: false,
              },
              missionPath: {
                target: 'missionPath',
                configuredPath: 'mpmissions\\dayzOffline.namalsk',
                resolvedPath: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
                status: 'warning',
                exists: true,
                isDirectory: true,
                hasInitScript: true,
                hasEconomyDb: false,
              },
            },
            issues: [
              {
                target: 'battleyePath',
                severity: 'warning',
                code: 'BATTLEYE_DIR_MISSING',
                message: 'BattlEye missing',
              },
              {
                target: 'missionPath',
                severity: 'warning',
                code: 'MISSION_ECONOMY_DB_MISSING',
                message: 'db missing',
              },
            ],
          }),
        );

      // 1 warning
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      expect(await screen.findByText('Verified with Warnings')).toBeInTheDocument();
      expect(screen.getByText(/with 1 non-blocking warning to review\./i)).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.BATTLEYE_DIR_MISSING),
      ).toBeInTheDocument();
      expect(screen.queryByText('Discovered Missions')).not.toBeInTheDocument();

      // 2 warnings (plural) + db/ missing tag
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(screen.getByText(/with 2 non-blocking warnings to review\./i)).toBeInTheDocument();
      });
      expect(screen.getByText('db/ missing')).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.MISSION_ECONOMY_DB_MISSING),
      ).toBeInTheDocument();
    });

    it('renders Issues Detected for blocking errors (singular and plural), skipped dependent checks, and missing init.c', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      const base = buildValidationResult(mockActiveServerSummary.id);
      vi.mocked(apiClient.servers.validatePaths)
        .mockResolvedValueOnce({
          ...base,
          valid: false,
          discoveredMissions: [],
          paths: {
            installPath: {
              target: 'installPath',
              configuredPath: 'C:\\DayZServer\\Namalsk',
              resolvedPath: null,
              status: 'error',
              exists: false,
              isDirectory: false,
              executablePath: null,
              executablePresent: false,
              executableRunnable: false,
            },
            profilePath: {
              target: 'profilePath',
              configuredPath: 'profiles',
              resolvedPath: null,
              status: 'skipped',
              exists: false,
              isDirectory: null,
              writable: null,
            },
            battleyePath: {
              target: 'battleyePath',
              configuredPath: 'profiles\\BattlEye',
              resolvedPath: null,
              status: 'skipped',
              exists: false,
              isDirectory: null,
              writable: null,
            },
            missionPath: {
              target: 'missionPath',
              configuredPath: 'dayzOffline.namalsk',
              resolvedPath: null,
              status: 'skipped',
              exists: false,
              isDirectory: null,
              hasInitScript: null,
              hasEconomyDb: null,
            },
          },
          issues: [
            {
              target: 'installPath',
              severity: 'error',
              code: 'INSTALL_DIR_MISSING',
              message: 'Missing install dir',
            },
          ],
        })
        .mockResolvedValueOnce({
          ...base,
          valid: false,
          discoveredMissions: [
            {
              name: 'broken.mission',
              relativePath: 'mpmissions/broken.mission',
              resolvedPath: 'C:\\DayZServer\\Namalsk\\mpmissions\\broken.mission',
              hasInitScript: false,
              hasEconomyDb: false,
            },
          ],
          paths: {
            ...base.paths,
            installPath: {
              ...base.paths.installPath,
              status: 'error',
              executablePresent: false,
              executableRunnable: false,
            },
            missionPath: {
              ...base.paths.missionPath,
              status: 'error',
              hasInitScript: false,
              hasEconomyDb: false,
            },
          },
          issues: [
            {
              target: 'installPath',
              severity: 'error',
              code: 'EXECUTABLE_MISSING',
              message: 'Missing exe',
            },
            {
              target: 'missionPath',
              severity: 'error',
              code: 'MISSION_INIT_SCRIPT_MISSING',
              message: 'Missing init.c',
            },
          ],
        });

      // 1 diagnostic item + skipped statuses
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      expect(await screen.findByText('Issues Detected')).toBeInTheDocument();
      expect(screen.getByText(/\(1 diagnostic item\)\./i)).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getAllByText('Skipped')).toHaveLength(3);
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.INSTALL_DIR_MISSING),
      ).toBeInTheDocument();

      // 2 diagnostic items + missing init.c
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(screen.getByText(/\(2 diagnostic items\)\./i)).toBeInTheDocument();
      });
      expect(screen.getByText('init.c missing')).toBeInTheDocument();
      expect(screen.getByText('db/ missing')).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.EXECUTABLE_MISSING),
      ).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.MISSION_INIT_SCRIPT_MISSING),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Active Mission'));
      expect(
        await screen.findByRole('option', {
          name: 'C:\\DayZServer\\Namalsk\\mpmissions\\broken.mission',
        }),
      ).toBeInTheDocument();
    });

    it('renders MISSION_SYMLINK_ESCAPE message without rendering init.c missing or db/ missing tags when artifact flags are null', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      const base = buildValidationResult(mockActiveServerSummary.id);
      vi.mocked(apiClient.servers.validatePaths).mockResolvedValueOnce({
        ...base,
        valid: false,
        discoveredMissions: [],
        paths: {
          ...base.paths,
          missionPath: {
            target: 'missionPath',
            configuredPath: 'mpmissions\\escapedLink',
            resolvedPath: 'D:\\ExternalSecret',
            status: 'error',
            exists: true,
            isDirectory: true,
            hasInitScript: null,
            hasEconomyDb: null,
          },
        },
        issues: [
          {
            target: 'missionPath',
            severity: 'error',
            code: 'MISSION_SYMLINK_ESCAPE',
            message: 'Mission path resolved outside mpmissions directory.',
          },
        ],
      });

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      expect(await screen.findByText('Issues Detected')).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.MISSION_SYMLINK_ESCAPE),
      ).toBeInTheDocument();
      expect(screen.queryByText('init.c missing')).not.toBeInTheDocument();
      expect(screen.queryByText('db/ missing')).not.toBeInTheDocument();
    });

    it('renders 1-per-row StoragePathsCard, ignores stale detail.profilePath without doubling, and saves selected Active Mission from Select dropdown', async () => {
      currentDetail = {
        ...mockServerDetail,
        profilePath: 'C:\\DayZServer\\Namalsk\\profiles',
      };
      vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
        ...currentDetail,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });

      const { unmount } = renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      const installInput = screen.getByLabelText('Installation Path');
      const gridContainer = installInput.closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).not.toHaveClass('md:grid-cols-3');

      expect(screen.getByTestId('derived-profile-path')).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\profiles',
      );
      expect(screen.getByTestId('derived-battleye-path')).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\profiles\\BattlEye',
      );
      expect(screen.queryByLabelText('Profile Path')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Max Players/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Steam Query Port/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Discovered Missions')).not.toBeInTheDocument();

      const missionSelect = screen.getByLabelText('Active Mission');
      expect(missionSelect).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
      );

      // Mission discovery only happens on explicit validation
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();

      fireEvent.click(missionSelect);
      fireEvent.click(
        await screen.findByRole('option', {
          name: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.chernarusplus',
        }),
      );
      expect(missionSelect).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.chernarusplus',
      );

      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
      await waitFor(() => {
        expect(apiClient.servers.update).toHaveBeenCalledWith(
          mockActiveServerSummary.id,
          expect.objectContaining({
            missionPath: 'mpmissions/dayzOffline.chernarusplus',
          }),
        );
      });
      unmount();
      queryClient.clear();

      // Empty missionPath + no validation yet renders Select placeholder & emptyText
      currentDetail = { ...mockServerDetail, missionPath: '' };
      renderView();

      const emptyMissionSelect = await screen.findByLabelText('Active Mission');
      expect(emptyMissionSelect).toHaveTextContent('Select a mission...');
      fireEvent.click(emptyMissionSelect);
      expect(
        await screen.findByText('No missions discovered under mpmissions/'),
      ).toBeInTheDocument();
    });

    it('normalizes backslash detail.missionPath against forward-slash discoveredMissions so Active Mission renders one option without duplicate entries', async () => {
      currentDetail = {
        ...mockServerDetail,
        missionPath: 'mpmissions\\dayzOffline.namalsk',
      };

      renderView();

      fireEvent.click(await screen.findByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();

      const missionSelect = screen.getByLabelText('Active Mission');
      expect(missionSelect).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
      );

      fireEvent.click(missionSelect);

      expect(
        await screen.findAllByRole('option', {
          name: 'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
        }),
      ).toHaveLength(1);
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    it('allows path validation when server is running while keeping Installation Path and Active Mission locked', async () => {
      currentActiveSummary = { ...mockDefaultServerSummary, status: 'running' };
      currentDetail = {
        ...mockServerDetail,
        ...mockDefaultServerSummary,
        status: 'running',
      };

      renderView();

      await waitFor(() => {
        expect(screen.getByText(/Configuration Locked/i)).toBeInTheDocument();
      });

      const validateBtn = screen.getByRole('button', { name: /Validate Paths/i });
      expect(validateBtn).not.toBeDisabled();
      expect(screen.getByLabelText('Installation Path')).toBeDisabled();
      expect(screen.getByLabelText('Active Mission')).toBeDisabled();

      fireEvent.click(validateBtn);

      expect(await screen.findByText('Verified')).toBeInTheDocument();
      expect(screen.getByLabelText('Active Mission')).toHaveTextContent(
        'C:\\DayZServer\\Namalsk\\mpmissions\\dayzOffline.namalsk',
      );
    });

    it('attaches inline 400 fieldErrors with a red toast, preserves draft input, and clears errors on subsequent success', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      vi.mocked(apiClient.servers.validatePaths)
        .mockRejectedValueOnce(
          new ApiError('Validation failed', 400, {
            statusCode: 400,
            error: 'Bad Request',
            errorCode: 'VALIDATION_FAILED',
            message: 'Path traversal is not permitted',
            fieldErrors: {
              installPath: {
                code: 'PATH_TRAVERSAL_FORBIDDEN',
                message: 'Path traversal (..) is not permitted',
              },
              missionPath: {
                code: 'PATH_NULL_BYTES_FORBIDDEN',
                message: 'Null bytes are forbidden',
              },
            },
          }),
        )
        .mockResolvedValueOnce(buildValidationResult(mockActiveServerSummary.id));

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: 'C:\\DayZ\\..\\bad' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(screen.getByText('Path traversal (..) is not permitted.')).toBeInTheDocument();
        expect(screen.getByText('Null bytes are forbidden in paths.')).toBeInTheDocument();
      });
      expect(showToast.error).toHaveBeenCalledWith(
        'Validation Error',
        'Please review the highlighted fields and correct any invalid values.',
        undefined,
      );
      expect(screen.getByLabelText('Installation Path')).toHaveValue('C:\\DayZ\\..\\bad');

      // Re-running validation clears inline path errors on success
      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: 'C:\\DayZServer\\Namalsk' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument();
      });
      expect(screen.queryByText('Path traversal (..) is not permitted.')).not.toBeInTheDocument();
      expect(screen.queryByText('Null bytes are forbidden in paths.')).not.toBeInTheDocument();
    });

    it('triggers notifyApiError toast on 403 AUTH_FORBIDDEN_ADMIN_REQUIRED without clearing unsaved path inputs', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      vi.mocked(apiClient.servers.validatePaths).mockRejectedValueOnce(
        new ApiError('Forbidden', 403, {
          statusCode: 403,
          error: 'Forbidden',
          errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
          message: 'Admin role required',
        }),
      );

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: 'D:\\CustomUnsavedPath' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith(
          'Access Denied',
          'Administrator privileges are required to perform this action.',
          undefined,
        );
      });
      expect(screen.getByLabelText('Installation Path')).toHaveValue('D:\\CustomUnsavedPath');
    });

    it('prevents concurrent Validate Paths requests on rapid double-click', async () => {
      renderView();

      await screen.findByRole('button', { name: /Validate Paths/i });

      let resolveValidation!: (value: ValidateServerPathsResponseDto) => void;
      vi.mocked(apiClient.servers.validatePaths).mockReturnValueOnce(
        new Promise(resolve => {
          resolveValidation = resolve;
        }),
      );

      const validateBtn = screen.getByRole('button', { name: /Validate Paths/i });
      fireEvent.click(validateBtn);
      fireEvent.click(validateBtn);

      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(1);
        expect(validateBtn).toBeDisabled();
        expect(validateBtn).toHaveAttribute('aria-busy', 'true');
      });

      resolveValidation(buildValidationResult(mockActiveServerSummary.id));

      expect(await screen.findByText('Verified')).toBeInTheDocument();
      expect(validateBtn).not.toBeDisabled();
    });

    it('clears stale validation diagnostics on activeServerId switch and ignores late success and error responses from prior server', async () => {
      let resolveLateSuccess!: (value: ValidateServerPathsResponseDto) => void;
      let rejectLateError!: (err: Error) => void;

      const { rerender } = renderView();

      fireEvent.click(await screen.findByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();

      // 1. Start slow validation on Server A, then switch activeServerId to Server B
      vi.mocked(apiClient.servers.validatePaths)
        .mockReturnValueOnce(
          new Promise(resolve => {
            resolveLateSuccess = resolve;
          }),
        )
        .mockReturnValueOnce(
          new Promise((_resolve, reject) => {
            rejectLateError = reject;
          }),
        );

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(2);
      });

      const serverBDetail: ServerDetailDto = {
        ...mockServerDetail,
        ...mockDefaultServerSummary,
        status: 'stopped',
        installPath: 'C:\\DayZServer\\Chernarus',
        profilePath: 'profiles',
        missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      };
      currentActiveSummary = { ...mockDefaultServerSummary, status: 'stopped' };
      currentDetail = serverBDetail;

      rerender(
        <QueryClientProvider client={queryClient}>
          <ServerSettingsView />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('DayZ Chernarus Vanilla')).toBeInTheDocument();
      });
      // Switching servers never triggers validation on its own
      expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();

      // Resolve Server A's stale request after switch -> diagnostics must stay cleared
      resolveLateSuccess(buildValidationResult(mockActiveServerSummary.id));
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();

      // 2. Start slow validation on Server B, then switch back to Server A
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(3);
      });

      currentActiveSummary = mockActiveServerSummary;
      currentDetail = mockServerDetail;

      rerender(
        <QueryClientProvider client={queryClient}>
          <ServerSettingsView />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
      });
      expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(3);
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();

      // Reject Server B's stale request -> error toast must be suppressed
      rejectLateError(
        new ApiError('Forbidden', 403, {
          statusCode: 403,
          error: 'Forbidden',
          errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
          message: 'Admin role required',
        }),
      );
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(showToast.error).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();
    });
  });

  describe('RCON Credentials, ServerConfigCard & DSM-00124 Validation', () => {
    it('edits BattlEye RCON Bind IP and saves the updated configuration payload', async () => {
      const customRconIp = ['192', '168', '1', '50'].join('.');
      vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
        ...mockServerDetail,
        rconIp: customRconIp,
      });

      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText(/BattlEye RCON Bind IP/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/BattlEye RCON Bind IP/i), {
        target: { value: customRconIp },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(apiClient.servers.update).toHaveBeenCalledWith(
          mockActiveServerSummary.id,
          expect.objectContaining({
            rconIp: customRconIp,
          }),
        );
      });
    });

    it('hydrates BattlEye RCON Password cleanly, omits unchanged password on save, clears to null when emptied, and syncs external cache updates', async () => {
      vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
        ...mockServerDetail,
        description: 'Description only change',
      });

      renderView();

      const rconInput = await screen.findByLabelText(/BattlEye RCON Password/i);
      expect(rconInput).toHaveValue('current-rcon-secret');
      expect(screen.queryByText('Security & Credentials')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Admin Password/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Server Join Password/i)).not.toBeInTheDocument();

      // Leaving BattlEye RCON Password unchanged omits rconPassword from PATCH payload
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'Description only change' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(apiClient.servers.update).toHaveBeenCalledTimes(1);
      });
      const firstPayload = vi.mocked(apiClient.servers.update).mock.calls[0]?.[1];
      expect(firstPayload).not.toHaveProperty('rconPassword');

      // External detail cache update syncs BattlEye RCON Password field
      const externalRconValue = ['external', 'rcon', 'value'].join('-');
      const externalDetail: ServerDetailDto = {
        ...mockServerDetail,
        rconPassword: externalRconValue,
      };
      queryClient.setQueryData(serverQueryKeys.detail(mockActiveServerSummary.id), externalDetail);

      await waitFor(() => {
        expect(screen.getByLabelText(/BattlEye RCON Password/i)).toHaveValue(externalRconValue);
      });

      // Clearing BattlEye RCON Password sends rconPassword: null
      vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
        ...externalDetail,
        rconPassword: null,
      });
      fireEvent.change(screen.getByLabelText(/BattlEye RCON Password/i), {
        target: { value: '' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(apiClient.servers.update).toHaveBeenNthCalledWith(
          2,
          mockActiveServerSummary.id,
          expect.objectContaining({
            rconPassword: null,
          }),
        );
      });
    });

    it('validates Server Name, BattlEye RCON Bind IP, and BattlEye RCON Password inline and clears errors on change', async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText(/BattlEye RCON Bind IP/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Server Name/i), { target: { value: 'Bad\0Name' } });
      fireEvent.change(screen.getByLabelText(/BattlEye RCON Bind IP/i), {
        target: { value: 'not-ipv4' },
      });
      fireEvent.change(screen.getByLabelText(/BattlEye RCON Password/i), {
        target: { value: 'ab' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      expect(
        screen.getByText('Control characters (CR, LF, null bytes) are forbidden'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('RCON IP must be a valid IPv4 address (e.g. 127.0.0.1)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('RCON password must be between 6 and 32 characters'),
      ).toBeInTheDocument();
      expect(apiClient.servers.update).not.toHaveBeenCalled();

      // Editing each field clears its inline validation message
      fireEvent.change(screen.getByLabelText(/Server Name/i), {
        target: { value: 'Valid Server Name' },
      });
      fireEvent.change(screen.getByLabelText(/BattlEye RCON Bind IP/i), {
        target: { value: '127.0.0.1' },
      });
      fireEvent.change(screen.getByLabelText(/BattlEye RCON Password/i), {
        target: { value: 'ValidPass!1' },
      });

      expect(
        screen.queryByText('Control characters (CR, LF, null bytes) are forbidden'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('RCON IP must be a valid IPv4 address (e.g. 127.0.0.1)'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('RCON password must be between 6 and 32 characters'),
      ).not.toBeInTheDocument();
    });

    it('renders ServerConfigCard unconditionally for authenticated operators and forwards running state', async () => {
      const { unmount } = renderView();

      const configCard = await screen.findByTestId('server-config-card');
      expect(configCard).toHaveAttribute('data-server-id', mockActiveServerSummary.id);
      expect(configCard).toHaveAttribute('data-server-name', mockActiveServerSummary.name);
      expect(configCard).toHaveAttribute('data-running', 'false');
      unmount();

      currentActiveSummary = { ...mockDefaultServerSummary, status: 'running' };
      currentDetail = {
        ...mockServerDetail,
        ...mockDefaultServerSummary,
        status: 'running',
      };
      const runningView = renderView();
      const runningConfigCard = await screen.findByTestId('server-config-card');
      expect(runningConfigCard).toHaveAttribute('data-server-id', mockDefaultServerSummary.id);
      expect(runningConfigCard).toHaveAttribute('data-server-name', mockDefaultServerSummary.name);
      expect(runningConfigCard).toHaveAttribute('data-running', 'true');
      runningView.unmount();
    });
  });

  describe('Form UX conventions (DSM-00137)', () => {
    const saveButton = () => screen.getByRole('button', { name: /Save changes/i });

    it('keeps Save changes inert while nothing changed, enables it on edit and disables it again on revert', async () => {
      renderView();
      const nameInput = await screen.findByLabelText('Server Name');

      expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(saveButton());
      fireEvent.submit(document.getElementById('server-settings-form')!);
      expect(apiClient.servers.update).not.toHaveBeenCalled();

      fireEvent.change(nameInput, { target: { value: 'Renamed' } });
      expect(saveButton()).not.toHaveAttribute('aria-disabled');

      fireEvent.change(nameInput, { target: { value: `  ${mockServerDetail.name}  ` } });
      expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
    });

    it('validates on save, focuses the first invalid field, and re-validates live afterwards', async () => {
      renderView();
      const nameInput = await screen.findByLabelText('Server Name');
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();

      fireEvent.click(saveButton());
      expect(screen.getByText('Server name is required.')).toBeInTheDocument();
      expect(nameInput).toHaveFocus();
      expect(apiClient.servers.update).not.toHaveBeenCalled();

      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();
    });

    it('focuses the field rejected by the server and returns to the unchanged state after a successful save', async () => {
      vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
        new ApiError('Conflict', 409, {
          statusCode: 409,
          error: 'Conflict',
          errorCode: 'SERVER_NAME_CONFLICT',
          message: 'Conflict',
          params: { name: 'Taken' },
          fieldErrors: {
            name: { code: 'SERVER_NAME_CONFLICT', message: 'dup', params: { name: 'Taken' } },
          },
        }),
      );
      renderView();
      const nameInput = await screen.findByLabelText('Server Name');

      fireEvent.change(nameInput, { target: { value: 'Taken' } });
      fireEvent.click(saveButton());
      expect(await screen.findByText('A server named "Taken" already exists.')).toBeInTheDocument();
      await waitFor(() => expect(nameInput).toHaveFocus());

      vi.mocked(apiClient.servers.update).mockResolvedValueOnce({
        ...mockServerDetail,
        name: 'Unique Name',
      });
      fireEvent.change(nameInput, { target: { value: 'Unique Name' } });
      expect(screen.queryByText('A server named "Taken" already exists.')).not.toBeInTheDocument();
      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(showToast.success).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });
});
