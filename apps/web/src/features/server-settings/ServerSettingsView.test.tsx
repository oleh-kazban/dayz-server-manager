import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@dsm/api-client';
import type { ServerDetailDto, ServerSummaryDto } from '@dsm/api-contracts';

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

vi.mock('@dsm/api-client', () => ({
  apiClient: {
    servers: {
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('ServerSettingsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('submits updated settings and renders success notification', async () => {
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
      expect(screen.getByText(/Settings Saved/i)).toBeInTheDocument();
    });
  });

  it('displays error notification when update mutation fails', async () => {
    vi.mocked(apiClient.servers.update).mockRejectedValueOnce(
      new Error('Port collision detected with server EU-01'),
    );

    renderView();

    await waitFor(() => {
      expect(screen.getByDisplayValue('DayZ Namalsk')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Update Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Port collision detected with server EU-01/i)).toBeInTheDocument();
    });
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
      expect(screen.getByText(/No Servers Registered/i)).toBeInTheDocument();
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
      expect(mockSetActiveServerId).toHaveBeenCalledWith(mockDefaultServerSummary.id);
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
});
