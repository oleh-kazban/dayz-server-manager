import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@dsm/api-client';
import type { ServerDetailDto, ServerSummaryDto } from '@dsm/api-contracts';
import { showToast } from '@dsm/ui';

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

vi.mock('@dsm/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dsm/web/core')>();
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

vi.mock('@dsm/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@dsm/api-client')>();
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

  it('renders empty zero-state notice when zero servers exist in DSM console', async () => {
    mockServers = [];
    currentActiveSummary = null;
    currentDetail = null;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/No DayZ Servers Registered/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add DayZ Server/i })).toBeInTheDocument();
    });
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
});
