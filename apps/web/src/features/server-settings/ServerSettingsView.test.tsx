import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type {
  ServerDetailDto,
  ServerSummaryDto,
  ValidateServerPathsResponseDto,
} from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { enUSTranslations } from '@aegis/web/core';

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockServerDetail: ServerDetailDto = {
  ...mockActiveServerSummary,
  installPath: 'C:\\DayZServer\\Namalsk',
  profilePath: 'C:\\DayZServer\\Namalsk\\profiles',
  missionPath: 'mpmissions\\dayzOffline.namalsk',
  launchParameters: '-cpuCount=4 -doLogs',
};

let mockServers: ServerSummaryDto[] = [mockDefaultServerSummary, mockActiveServerSummary];
let currentActiveSummary: ServerSummaryDto | null = mockActiveServerSummary;
let currentDetail: ServerDetailDto | null = mockServerDetail;

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
    vi.mocked(apiClient.servers.delete).mockImplementation(async () => ({ success: true }));
    vi.mocked(apiClient.servers.create).mockImplementation(async dto => ({
      ...mockServerDetail,
      ...dto,
      id: '33333333-3333-4333-8333-333333333333',
      description: dto.description ?? null,
      launchParameters: dto.launchParameters ?? null,
      status: 'stopped',
      isDefault: dto.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    vi.mocked(apiClient.servers.validatePaths).mockImplementation(async (serverId, dto) =>
      buildValidationResult(serverId, {
        paths: {
          installPath: {
            target: 'installPath',
            configuredPath: dto?.installPath ?? mockServerDetail.installPath,
            resolvedPath: dto?.installPath ?? mockServerDetail.installPath,
            status: 'valid',
            exists: true,
            isDirectory: true,
            executablePath: `${dto?.installPath ?? mockServerDetail.installPath}\\DayZServer_x64.exe`,
            executablePresent: true,
            executableRunnable: true,
          },
          profilePath: {
            target: 'profilePath',
            configuredPath: dto?.profilePath ?? mockServerDetail.profilePath,
            resolvedPath: dto?.profilePath ?? mockServerDetail.profilePath,
            status: 'valid',
            exists: true,
            isDirectory: true,
            writable: true,
          },
          battleyePath: {
            target: 'battleyePath',
            configuredPath: `${dto?.profilePath ?? mockServerDetail.profilePath}\\BattlEye`,
            resolvedPath: `${dto?.profilePath ?? mockServerDetail.profilePath}\\BattlEye`,
            status: 'valid',
            exists: true,
            isDirectory: true,
            writable: true,
          },
          missionPath: {
            target: 'missionPath',
            configuredPath: dto?.missionPath ?? mockServerDetail.missionPath,
            resolvedPath: `${dto?.installPath ?? mockServerDetail.installPath}\\mpmissions\\dayzOffline.namalsk`,
            status: 'valid',
            exists: true,
            isDirectory: true,
            hasInitScript: true,
            hasEconomyDb: true,
          },
        },
      }),
    );
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
        configuredPath: 'C:\\DayZServer\\Namalsk\\profiles',
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
    expect(screen.getByDisplayValue('27018')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2410')).toBeInTheDocument();
    expect(screen.getByDisplayValue('C:\\DayZServer\\Namalsk')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-cpuCount=4 -doLogs')).toBeInTheDocument();
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

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Configuration Locked',
        'Cannot modify network ports or file paths while "DayZ Namalsk" is running.',
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
      expect(mockSetActiveServerId).toHaveBeenCalledWith(mockDefaultServerSummary.id);
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
          queryPort: 27016,
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

    // Update Query Port
    const queryPortInput = screen.getByDisplayValue(String(mockServerDetail.queryPort));
    fireEvent.change(queryPortInput, { target: { value: '27018' } });

    // Update RCON Port
    const rconPortInput = screen.getByDisplayValue(String(mockServerDetail.rconPort));
    fireEvent.change(rconPortInput, { target: { value: '2312' } });

    // Update RCON Password
    const rconPassInput = screen.getByLabelText(/RCON Password/i);
    fireEvent.change(rconPassInput, { target: { value: 'newpassword123' } });

    // Update Paths
    const installInput = screen.getByDisplayValue(mockServerDetail.installPath);
    fireEvent.change(installInput, { target: { value: 'D:\\DayZServer' } });

    const profileInput = screen.getByDisplayValue(mockServerDetail.profilePath);
    fireEvent.change(profileInput, { target: { value: 'D:\\DayZServer\\profiles' } });

    const missionInput = screen.getByDisplayValue(mockServerDetail.missionPath);
    fireEvent.change(missionInput, { target: { value: 'mpmissions\\dayzOffline.livonia' } });

    // Update CLI args
    const cliInput = screen.getByDisplayValue(mockServerDetail.launchParameters!);
    fireEvent.change(cliInput, { target: { value: '-cpuCount=8' } });

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
          queryPort: 27018,
          rconPort: 2312,
          rconPassword: 'newpassword123',
          installPath: 'D:\\DayZServer',
          profilePath: 'D:\\DayZServer\\profiles',
          missionPath: 'mpmissions\\dayzOffline.livonia',
          launchParameters: '-cpuCount=8',
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

  it('highlights all conflicting/invalid form fields inline simultaneously without firing an error toast when saving server settings fails with 409 or 400 fieldErrors (REQ-03)', async () => {
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
    expect(showToast.error).not.toHaveBeenCalled();

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

    // 1. Clear paths and set invalid ports and short password
    const installInput = screen.getByDisplayValue(mockServerDetail.installPath);
    fireEvent.change(installInput, { target: { value: '   ' } });

    const profileInput = screen.getByDisplayValue(mockServerDetail.profilePath);
    fireEvent.change(profileInput, { target: { value: '   ' } });

    const missionInput = screen.getByDisplayValue(mockServerDetail.missionPath);
    fireEvent.change(missionInput, { target: { value: '   ' } });

    const gamePortInput = screen.getByDisplayValue(String(mockServerDetail.gamePort));
    fireEvent.change(gamePortInput, { target: { value: '500' } });

    const queryPortInput = screen.getByDisplayValue(String(mockServerDetail.queryPort));
    fireEvent.change(queryPortInput, { target: { value: '70000' } });

    const rconPortInput = screen.getByDisplayValue(String(mockServerDetail.rconPort));
    fireEvent.change(rconPortInput, { target: { value: '0' } });

    const rconPassInput = screen.getByLabelText(/RCON Password/i);
    fireEvent.change(rconPassInput, { target: { value: '123' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Installation path is required.')).toBeInTheDocument();
    expect(screen.getByText('Profile path is required.')).toBeInTheDocument();
    expect(screen.getByText('Mission path is required.')).toBeInTheDocument();
    expect(screen.getAllByText('Port must be between 1024 and 65535.')).toHaveLength(3);
    expect(screen.getByText('RCON password must be at least 6 characters.')).toBeInTheDocument();
    expect(apiClient.servers.update).not.toHaveBeenCalled();

    // 2. Test port collision when ports are equal
    fireEvent.change(installInput, { target: { value: 'C:\\DayZServer\\Namalsk' } });
    fireEvent.change(profileInput, { target: { value: 'C:\\DayZServer\\Namalsk\\profiles' } });
    fireEvent.change(missionInput, { target: { value: 'mpmissions\\dayzOffline.namalsk' } });
    fireEvent.change(rconPassInput, { target: { value: 'secretpass' } });

    fireEvent.change(gamePortInput, { target: { value: '2302' } });
    fireEvent.change(queryPortInput, { target: { value: '2302' } });
    fireEvent.change(rconPortInput, { target: { value: '2310' } });

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

    // Changing rconPort and queryPort exercises their onChange and clearFieldError
    fireEvent.change(queryPortInput, { target: { value: '27016' } });
    fireEvent.change(rconPortInput, { target: { value: '2315' } });
  });

  it('allows saving general settings without validating locked paths/ports when server is locked', async () => {
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

    const nameInput = screen.getByDisplayValue(mockDefaultServerSummary.name);
    fireEvent.change(nameInput, { target: { value: 'Running Server Renamed' } });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.servers.update).toHaveBeenCalledWith(
        mockDefaultServerSummary.id,
        expect.objectContaining({
          name: 'Running Server Renamed',
        }),
      );
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

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    const form = saveButton.closest('form')!;

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
    it('submits trimmed draft paths on Validate Paths click and renders Verified notice, path summaries, and discovered missions', async () => {
      vi.mocked(apiClient.servers.validatePaths).mockResolvedValueOnce(
        buildValidationResult(mockActiveServerSummary.id),
      );

      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText('Installation Path')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: '  D:\\Servers\\DayZ  ' },
      });
      fireEvent.change(screen.getByLabelText('Profile Path'), {
        target: { value: '  profiles  ' },
      });
      fireEvent.change(screen.getByLabelText('Mission Path'), {
        target: { value: '  dayzOffline.namalsk  ' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledWith(mockActiveServerSummary.id, {
          installPath: 'D:\\Servers\\DayZ',
          profilePath: 'profiles',
          missionPath: 'dayzOffline.namalsk',
        });
      });

      expect(await screen.findByText('Verified')).toBeInTheDocument();
      expect(
        screen.getByText(/Installation, executable, profile, and mission paths are verified on/i),
      ).toBeInTheDocument();
      expect(screen.getAllByText('Valid')).toHaveLength(4);
      expect(
        screen.getByText('Executable: C:\\DayZServer\\Namalsk\\DayZServer_x64.exe'),
      ).toBeInTheDocument();
      expect(screen.getByText('init.c present')).toBeInTheDocument();
      expect(screen.getByText('db/ present')).toBeInTheDocument();

      expect(screen.getByText('Discovered Missions')).toBeInTheDocument();
      expect(screen.getByText('2 found')).toBeInTheDocument();

      const chernarusBtn = screen.getByRole('button', { name: /dayzOffline\.chernarusplus/i });
      const namalskBtn = screen.getByRole('button', { name: /dayzOffline\.namalsk/i });
      expect(chernarusBtn).toHaveAttribute('aria-pressed', 'false');
      expect(namalskBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders Verified with Warnings for non-blocking issues (singular and plural) and empty missions hint', async () => {
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

      renderView();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate Paths/i })).toBeInTheDocument();
      });

      // 1 warning + empty missions
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      expect(await screen.findByText('Verified with Warnings')).toBeInTheDocument();
      expect(screen.getByText(/with 1 non-blocking warning to review\./i)).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.BATTLEYE_DIR_MISSING),
      ).toBeInTheDocument();
      expect(screen.getByText('0 found')).toBeInTheDocument();
      expect(screen.getByText(/No missions discovered under/i)).toBeInTheDocument();

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
      const base = buildValidationResult(mockActiveServerSummary.id);
      vi.mocked(apiClient.servers.validatePaths)
        .mockResolvedValueOnce({
          ...base,
          valid: false,
          discoveredMissions: [],
          paths: {
            installPath: {
              target: 'installPath',
              configuredPath: 'C:\\MissingInstall',
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

      renderView();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate Paths/i })).toBeInTheDocument();
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
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.EXECUTABLE_MISSING),
      ).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.MISSION_INIT_SCRIPT_MISSING),
      ).toBeInTheDocument();
    });

    it('renders MISSION_SYMLINK_ESCAPE message without rendering init.c missing or db/ missing tags when artifact flags are null', async () => {
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

      renderView();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate Paths/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      expect(await screen.findByText('Issues Detected')).toBeInTheDocument();
      expect(
        screen.getByText(enUSTranslations.serverFsIssues.MISSION_SYMLINK_ESCAPE),
      ).toBeInTheDocument();
      expect(screen.queryByText('init.c missing')).not.toBeInTheDocument();
      expect(screen.queryByText('db/ missing')).not.toBeInTheDocument();
    });

    it('updates Mission Path and clears missionPath error when selecting a discovered mission on a stopped server', async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText('Mission Path')).toBeInTheDocument();
      });

      // Trigger client-side missionPath error first, then validate and select discovered mission
      const missionInput = screen.getByLabelText('Mission Path');
      fireEvent.change(missionInput, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
      expect(screen.getByText('Mission path is required.')).toBeInTheDocument();

      fireEvent.change(missionInput, { target: { value: 'mpmissions\\dayzOffline.namalsk' } });
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      const chernarusBtn = await screen.findByRole('button', {
        name: /dayzOffline\.chernarusplus/i,
      });
      const namalskBtn = screen.getByRole('button', { name: /dayzOffline\.namalsk/i });
      // Backslash mpmissions\dayzOffline.namalsk normalizes to match mpmissions/dayzOffline.namalsk
      expect(namalskBtn).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(chernarusBtn);

      expect(screen.getByLabelText('Mission Path')).toHaveValue(
        'mpmissions/dayzOffline.chernarusplus',
      );
      expect(chernarusBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Mission path is required.')).not.toBeInTheDocument();
    });

    it('allows path validation when server is running while keeping discovered mission selection disabled', async () => {
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
      fireEvent.click(validateBtn);

      const chernarusBtn = await screen.findByRole('button', {
        name: /dayzOffline\.chernarusplus/i,
      });
      expect(chernarusBtn).toBeDisabled();
      fireEvent.click(chernarusBtn);

      expect(screen.getByLabelText('Mission Path')).toHaveValue('mpmissions\\dayzOffline.namalsk');
    });

    it('attaches inline 400 fieldErrors without toast, preserves draft input, and clears errors on subsequent success', async () => {
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
              profilePath: {
                code: 'PATH_NULL_BYTES_FORBIDDEN',
                message: 'Null bytes are forbidden',
              },
            },
          }),
        )
        .mockResolvedValueOnce(buildValidationResult(mockActiveServerSummary.id));

      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText('Installation Path')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: 'C:\\DayZ\\..\\bad' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));

      await waitFor(() => {
        expect(screen.getByText('Path traversal (..) is not permitted.')).toBeInTheDocument();
        expect(screen.getByText('Null bytes are forbidden in paths.')).toBeInTheDocument();
      });
      expect(showToast.error).not.toHaveBeenCalled();
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
      vi.mocked(apiClient.servers.validatePaths).mockRejectedValueOnce(
        new ApiError('Forbidden', 403, {
          statusCode: 403,
          error: 'Forbidden',
          errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
          message: 'Admin role required',
        }),
      );

      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText('Installation Path')).toBeInTheDocument();
      });

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
      let resolveValidation!: (value: ValidateServerPathsResponseDto) => void;
      vi.mocked(apiClient.servers.validatePaths).mockReturnValueOnce(
        new Promise(resolve => {
          resolveValidation = resolve;
        }),
      );

      renderView();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate Paths/i })).toBeInTheDocument();
      });

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

      vi.mocked(apiClient.servers.validatePaths)
        .mockResolvedValueOnce(buildValidationResult(mockActiveServerSummary.id))
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

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ServerSettingsView />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate Paths/i })).toBeInTheDocument();
      });

      // 1. Validate Server A -> displays Verified + Discovered Missions
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      expect(await screen.findByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Discovered Missions')).toBeInTheDocument();

      // 2. Start pending validation on Server A, then switch activeServerId to Server B
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(2);
      });

      const serverBDetail: ServerDetailDto = {
        ...mockServerDetail,
        ...mockDefaultServerSummary,
        status: 'stopped',
        installPath: 'C:\\DayZServer\\Chernarus',
        profilePath: 'C:\\DayZServer\\Chernarus\\profiles',
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
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('Discovered Missions')).not.toBeInTheDocument();

      // Late resolution from Server A must be ignored on Server B
      resolveLateSuccess(buildValidationResult(mockActiveServerSummary.id));
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();

      // 3. Start pending validation on Server B that rejects after switching back to Server A
      fireEvent.click(screen.getByRole('button', { name: /Validate Paths/i }));
      await waitFor(() => {
        expect(apiClient.servers.validatePaths).toHaveBeenCalledTimes(3);
      });

      currentActiveSummary = { ...mockActiveServerSummary };
      currentDetail = { ...mockServerDetail };

      rerender(
        <QueryClientProvider client={queryClient}>
          <ServerSettingsView />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
      });

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
    });

    it('clears serverFieldErrors on path input edit when update fails with path fieldErrors', async () => {
      vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
        new ApiError('Invalid path', 400, {
          statusCode: 400,
          error: 'Bad Request',
          errorCode: 'VALIDATION_FAILED',
          message: 'Path traversal (..) is not permitted',
          fieldErrors: {
            installPath: {
              code: 'PATH_TRAVERSAL_FORBIDDEN',
              message: 'Path traversal (..) is not permitted',
            },
            profilePath: {
              code: 'PATH_INVALID_CHARS',
              message: 'Path contains invalid filesystem characters',
            },
            missionPath: {
              code: 'PATH_INVALID_COLON',
              message: 'Colons are only permitted in Windows drive letter prefixes',
            },
          },
        }),
      );

      renderView();

      await waitFor(() => {
        expect(screen.getByLabelText('Installation Path')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Path traversal (..) is not permitted.')).toBeInTheDocument();
        expect(
          screen.getByText('Path contains invalid filesystem characters.'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Colons are only permitted in Windows drive letter prefixes.'),
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Installation Path'), {
        target: { value: 'C:\\DayZServer\\Clean' },
      });
      expect(screen.queryByText('Path traversal (..) is not permitted.')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Profile Path'), {
        target: { value: 'C:\\DayZServer\\Clean\\profiles' },
      });
      expect(
        screen.queryByText('Path contains invalid filesystem characters.'),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Mission Path'), {
        target: { value: 'mpmissions\\dayzOffline.chernarusplus' },
      });
      expect(
        screen.queryByText('Colons are only permitted in Windows drive letter prefixes.'),
      ).not.toBeInTheDocument();
    });
  });
});
