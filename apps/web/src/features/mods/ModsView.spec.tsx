import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type {
  ServerModDto,
  ServerModsListResponseDto,
  ServerSummaryDto,
} from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { formatModTimestamp, MOD_COLUMNS_STORAGE_KEY } from './mods.columns';
import { ModsView } from './ModsView';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const NOW_ISO = '2026-11-10T10:00:00.000Z';

const baseServer: ServerSummaryDto = {
  id: SERVER_ID,
  name: 'DayZ Chernarus',
  description: 'Main server',
  status: 'stopped',
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: true,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modCF: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222221',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '1559212036',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
  folderName: '@CF',
  name: 'CF',
  sizeBytes: 5 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 0,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modCOT: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222222',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '1564026768',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1564026768',
  folderName: '@COT',
  name: 'Community Online Tools',
  sizeBytes: 12 * 1024 * 1024,
  remoteUpdatedAt: '2026-11-10T12:00:00.000Z',
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'update_available',
  enabled: true,
  loadOrder: 1,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modLocal: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222223',
  serverId: SERVER_ID,
  sourceType: 'local',
  loadTarget: 'server_only',
  workshopId: null,
  workshopUrl: null,
  folderName: '@ServerScripts',
  name: 'Server Scripts',
  sizeBytes: null,
  remoteUpdatedAt: null,
  syncedWorkshopUpdatedAt: null,
  lastSyncedAt: null,
  syncStatus: 'local',
  enabled: true,
  loadOrder: 2,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modNotSynced: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222224',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '2545327648',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2545327648',
  folderName: '',
  name: 'Dabs Framework',
  sizeBytes: 2 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: null,
  lastSyncedAt: null,
  syncStatus: 'not_synced',
  enabled: true,
  loadOrder: 3,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const sampleListResponse: ServerModsListResponseDto = {
  mods: [modCF, modCOT, modLocal, modNotSynced],
  launchPreview: {
    modFlag: '-mod=@CF;@COT',
    serverModFlag: '-serverMod=@ServerScripts',
    combinedArgs: ['-mod=@CF;@COT', '-serverMod=@ServerScripts'],
    missingFolderCount: 1,
  },
  updateAvailableCount: 1,
};

let mockUserRole: 'admin' | 'viewer' = 'admin';
let mockServersList: ServerSummaryDto[] = [baseServer];
let mockActiveServer: ServerSummaryDto | null = baseServer;
let mockServersLoading = false;

vi.mock('../auth', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      username: mockUserRole,
      email: `${mockUserRole}@dayz.local`,
      role: mockUserRole,
      roles: [mockUserRole],
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@aegis/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/web/core')>();
  return {
    ...actual,
    useActiveServer: () => ({
      servers: mockServersList,
      activeServer: mockActiveServer,
      activeServerId: mockActiveServer?.id ?? null,
      setActiveServerId: vi.fn(),
      isLoading: mockServersLoading,
      error: null,
    }),
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: ReactNode;
    to: string;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick} {...props}>
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
      mods: {
        ...actual.apiClient.mods,
        list: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        reorder: vi.fn(),
        checkUpdates: vi.fn(),
      },
    },
  };
});

describe('ModsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-ok');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-err');
    mockUserRole = 'admin';
    mockServersList = [baseServer];
    mockActiveServer = { ...baseServer };
    mockServersLoading = false;

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });

    vi.mocked(apiClient.mods.list).mockResolvedValue(structuredClone(sampleListResponse));
    vi.mocked(apiClient.mods.update).mockResolvedValue(modCF);
    vi.mocked(apiClient.mods.delete).mockResolvedValue({ success: true });
    vi.mocked(apiClient.mods.reorder).mockResolvedValue(structuredClone(sampleListResponse));
    vi.mocked(apiClient.mods.checkUpdates).mockResolvedValue(structuredClone(sampleListResponse));
  });

  const renderView = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ModsView />
      </QueryClientProvider>,
    );

  it('renders EmptyServersState when no servers are configured and error notice when mods query fails', async () => {
    mockServersList = [];
    mockActiveServer = null;
    const { unmount } = renderView();
    expect(screen.getByText('No DayZ Servers Registered')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add DayZ Server' }));
    expect(screen.getByRole('heading', { name: 'Create DayZ Server' })).toBeInTheDocument();
    unmount();

    mockServersList = [baseServer];
    mockActiveServer = baseServer;
    vi.mocked(apiClient.mods.list).mockRejectedValueOnce(new Error('Network error'));
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Unable to Load Server Mods')).toBeInTheDocument();
    });
  });

  it('renders mod rows with sync badges, update notice, missing @folder indicator, and launch preview', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mods Management' })).toBeInTheDocument();
    });

    expect(screen.getByText('Workshop Updates Available')).toBeInTheDocument();
    expect(screen.getByText(/1 update\(s\) available on Steam Workshop/i)).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Server mods inventory' });
    expect(within(table).getByText('CF')).toBeInTheDocument();
    expect(within(table).getByText('Community Online Tools')).toBeInTheDocument();
    expect(within(table).getByText('Server Scripts')).toBeInTheDocument();
    expect(within(table).getByText('Dabs Framework')).toBeInTheDocument();

    expect(within(table).getByText('Up to date')).toBeInTheDocument();
    expect(within(table).getByText('Update available')).toBeInTheDocument();
    expect(within(table).getByText('Local')).toBeInTheDocument();
    expect(within(table).getByText('Not synced')).toBeInTheDocument();
    expect(within(table).getByText('Missing @folder')).toBeInTheDocument();

    expect(screen.getByText('-mod=@CF;@COT')).toBeInTheDocument();
    expect(screen.getByText('-serverMod=@ServerScripts')).toBeInTheDocument();
  });

  it('filters mods by search/status/target and disables drag-and-drop & keyboard reorder while filtered', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    // Unfiltered: reorder handles are enabled
    expect(screen.getByRole('button', { name: 'Reorder CF' })).not.toBeDisabled();

    // Filter by search query
    fireEvent.change(screen.getByLabelText('Filter mods'), { target: { value: 'Server Scripts' } });

    expect(screen.getByText('Server Scripts')).toBeInTheDocument();
    expect(screen.queryByText('CF')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Load order drag-and-drop and move controls are disabled while search or status filters are active/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder Server Scripts' })).toBeDisabled();

    // Clear search and filter by sync status
    fireEvent.change(screen.getByLabelText('Filter mods'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Filter by sync status'));
    fireEvent.click(await screen.findByRole('option', { name: 'Update available' }));

    expect(screen.getByText('Community Online Tools')).toBeInTheDocument();
    expect(screen.queryByText('CF')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder Community Online Tools' })).toBeDisabled();
  });

  it('locks mutations when server is running while keeping Check for updates active', async () => {
    mockActiveServer = { ...baseServer, status: 'running' };
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Server is Active — Mod Configuration Locked')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Add Mod' })).toBeDisabled();
    expect(screen.getByLabelText('Enable CF')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reorder CF' })).toBeDisabled();

    const checkBtn = screen.getByRole('button', { name: 'Check for updates' });
    expect(checkBtn).not.toBeDisabled();
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(apiClient.mods.checkUpdates).toHaveBeenCalledWith(SERVER_ID);
    });
  });

  it('handles toggle enabled, keyboard ArrowDown reorder, mark synced, edit modal, and delete confirmation', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    // Toggle disabled -> fires MOD_DISABLED toast and refetches disabled state
    vi.mocked(apiClient.mods.update).mockResolvedValueOnce({ ...modCF, enabled: false });
    vi.mocked(apiClient.mods.list).mockResolvedValueOnce({
      ...sampleListResponse,
      mods: [{ ...modCF, enabled: false }, modCOT, modLocal, modNotSynced],
    });
    fireEvent.click(screen.getByLabelText('Enable CF'));
    await waitFor(() => {
      expect(apiClient.mods.update).toHaveBeenCalledWith(SERVER_ID, modCF.id, { enabled: false });
      expect(showToast.success).toHaveBeenCalledWith(
        'Mod Disabled',
        '"CF" has been disabled.',
        undefined,
      );
      expect(screen.getByLabelText('Enable CF')).not.toBeChecked();
    });

    // Toggle enabled -> fires MOD_ENABLED toast
    vi.mocked(apiClient.mods.update).mockResolvedValueOnce({ ...modCF, enabled: true });
    fireEvent.click(screen.getByLabelText('Enable CF'));
    await waitFor(() => {
      expect(apiClient.mods.update).toHaveBeenCalledWith(SERVER_ID, modCF.id, { enabled: true });
      expect(showToast.success).toHaveBeenCalledWith(
        'Mod Enabled',
        '"CF" is now enabled for server launch.',
        undefined,
      );
    });

    // Keyboard ArrowDown reorder on CF handle -> moves CF after COT
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder CF' }), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(apiClient.mods.reorder).toHaveBeenCalledWith(SERVER_ID, {
        modIds: [modCOT.id, modCF.id, modLocal.id, modNotSynced.id],
      });
    });

    // Row menu -> Mark as synced on COT
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Community Online Tools' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mark as synced' }));
    await waitFor(() => {
      expect(apiClient.mods.update).toHaveBeenCalledWith(SERVER_ID, modCOT.id, {
        markSynced: true,
      });
    });

    // Row menu -> Edit -> opens EditModModal
    fireEvent.click(screen.getByRole('button', { name: 'Actions for CF' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(
      await screen.findByRole('heading', { name: 'Edit Mod Configuration' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    // Row menu -> Delete -> Confirmation -> confirms deletion
    fireEvent.click(screen.getByRole('button', { name: 'Actions for CF' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Remove Mod from Server')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Mod' }));

    await waitFor(() => {
      expect(apiClient.mods.delete).toHaveBeenCalledWith(SERVER_ID, modCF.id);
    });
  });

  it('does not call reorder or trigger Load Order Saved toast on adjacent no-op drag-and-drop', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    const cfRow = screen.getByText('CF').closest('tr')!;
    const cotRow = screen.getByText('Community Online Tools').closest('tr')!;

    vi.spyOn(cfRow, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      height: 40,
      bottom: 140,
      left: 0,
      right: 500,
      width: 500,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      effectAllowed: 'none',
      dropEffect: 'none',
    };

    fireEvent.dragStart(cotRow, { dataTransfer });
    fireEvent.dragOver(cfRow, { clientY: 130, dataTransfer });
    fireEvent.drop(cfRow, { dataTransfer });

    expect(apiClient.mods.reorder).not.toHaveBeenCalled();
    expect(showToast.success).not.toHaveBeenCalledWith(
      'Load Order Saved',
      expect.anything(),
      expect.anything(),
    );
  });

  it('hides admin actions and disables toggles for viewer role', async () => {
    mockUserRole = 'viewer';
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Add Mod' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check for updates' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions for CF' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Enable CF')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reorder CF' })).toBeDisabled();

    const table = screen.getByRole('table', { name: 'Server mods inventory' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map(th => th.textContent?.trim());
    expect(headers).toEqual([
      'Order',
      'Mod',
      '@Folder',
      'Target',
      'Size',
      'Sync Status',
      'Enabled',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Columns/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Toggle column visibility' });
    expect(within(dialog).queryByRole('checkbox', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('renders default column order with compact Enabled width and hidden date columns, and supports toggling Workshop Updated with persistence', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    const table = screen.getByRole('table', { name: 'Server mods inventory' });
    const getHeaderTexts = () =>
      within(table)
        .getAllByRole('columnheader')
        .map(th => th.textContent?.trim());

    expect(getHeaderTexts()).toEqual([
      'Order',
      'Mod',
      '@Folder',
      'Target',
      'Size',
      'Sync Status',
      'Enabled',
      'Actions',
    ]);
    expect(getHeaderTexts().slice(-3)).toEqual(['Sync Status', 'Enabled', 'Actions']);

    const enabledHeader = within(table).getByRole('columnheader', { name: 'Enabled' });
    expect(enabledHeader.className).toContain('w-20');

    expect(
      within(table).queryByRole('columnheader', { name: 'Workshop Updated' }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole('columnheader', { name: 'Last Synced' }),
    ).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Added' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Columns/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Toggle column visibility' });

    for (const lockedLabel of ['Order', 'Mod', 'Enabled', 'Actions']) {
      expect(within(dialog).getByRole('checkbox', { name: lockedLabel })).toBeDisabled();
    }
    for (const toggleableLabel of [
      '@Folder',
      'Target',
      'Size',
      'Sync Status',
      'Workshop Updated',
      'Last Synced',
      'Added',
    ]) {
      expect(within(dialog).getByRole('checkbox', { name: toggleableLabel })).not.toBeDisabled();
    }

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Workshop Updated' }));

    const updatedHeaders = getHeaderTexts();
    const workshopIdx = updatedHeaders.indexOf('Workshop Updated');
    const enabledIdx = updatedHeaders.indexOf('Enabled');
    expect(workshopIdx).toBeGreaterThan(-1);
    expect(workshopIdx).toBeLessThan(enabledIdx);

    const cfRow = within(table).getByText('CF').closest('tr')!;
    const localRow = within(table).getByText('Server Scripts').closest('tr')!;
    expect(within(cfRow).getAllByRole('cell')[workshopIdx]).toHaveTextContent(
      formatModTimestamp(modCF.remoteUpdatedAt),
    );
    expect(within(localRow).getAllByRole('cell')[workshopIdx]).toHaveTextContent('—');

    const persisted = JSON.parse(window.localStorage.getItem(MOD_COLUMNS_STORAGE_KEY) ?? '[]') as {
      id: string;
      isVisible: boolean;
    }[];
    expect(persisted.find(c => c.id === 'remoteUpdatedAt')?.isVisible).toBe(true);

    // Reorder Size column up via keyboard handle -> moves Size before Target
    fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Reorder Size column' }), {
      key: 'ArrowUp',
    });
    const reorderedHeaders = getHeaderTexts();
    expect(reorderedHeaders.indexOf('Size')).toBeLessThan(reorderedHeaders.indexOf('Target'));

    // Show all makes Last Synced and Added visible as well
    fireEvent.click(within(dialog).getByRole('button', { name: 'Show all' }));
    expect(within(table).getByRole('columnheader', { name: 'Last Synced' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Added' })).toBeInTheDocument();

    // Reset to default restores hidden date columns and default order
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset to default' }));
    expect(getHeaderTexts()).toEqual([
      'Order',
      'Mod',
      '@Folder',
      'Target',
      'Size',
      'Sync Status',
      'Enabled',
      'Actions',
    ]);
  });

  it('sorts rows by Size (asc -> desc), locks reorder handle, and restores Load Order via Reset to Load Order', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('CF')).toBeInTheDocument();
    });

    const table = screen.getByRole('table', { name: 'Server mods inventory' });
    const getRowModNames = () => {
      const rows = within(table).getAllByRole('row').slice(1);
      return rows.map(row => within(row).getAllByRole('cell')[1]?.textContent ?? '');
    };

    expect(getRowModNames().map(t => t.startsWith('CF'))).toEqual([true, false, false, false]);
    expect(screen.getByRole('button', { name: 'Reorder CF' })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reset to Load Order' })).not.toBeInTheDocument();

    const sizeHeader = within(table).getByRole('columnheader', { name: 'Size' });

    // Click 1: Size ascending (2MB Dabs -> 5MB CF -> 12MB COT -> null Server Scripts)
    fireEvent.click(sizeHeader);
    expect(sizeHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(getRowModNames()).toEqual([
      expect.stringContaining('Dabs Framework'),
      expect.stringContaining('CF'),
      expect.stringContaining('Community Online Tools'),
      expect.stringContaining('Server Scripts'),
    ]);
    expect(screen.getByRole('button', { name: 'Reorder CF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset to Load Order' })).toBeInTheDocument();

    // Combining filter + custom sort displays combined paused message
    fireEvent.change(screen.getByLabelText('Filter mods'), { target: { value: 'CF' } });
    expect(
      screen.getByText(/disabled while search, status filters, or custom sorting are active/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter mods'), { target: { value: '' } });

    // Click 2: Size descending (12MB COT -> 5MB CF -> 2MB Dabs -> null Server Scripts)
    fireEvent.click(sizeHeader);
    expect(sizeHeader).toHaveAttribute('aria-sort', 'descending');
    expect(getRowModNames()).toEqual([
      expect.stringContaining('Community Online Tools'),
      expect.stringContaining('CF'),
      expect.stringContaining('Dabs Framework'),
      expect.stringContaining('Server Scripts'),
    ]);
    expect(screen.getByRole('button', { name: 'Reorder CF' })).toBeDisabled();

    // Reset to Load Order restores default order ascending and re-enables drag handle
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Load Order' }));
    const orderHeader = within(table).getByRole('columnheader', { name: 'Order' });
    expect(orderHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(getRowModNames()).toEqual([
      expect.stringContaining('CF'),
      expect.stringContaining('Community Online Tools'),
      expect.stringContaining('Server Scripts'),
      expect.stringContaining('Dabs Framework'),
    ]);
    expect(screen.getByRole('button', { name: 'Reorder CF' })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reset to Load Order' })).not.toBeInTheDocument();

    // Clicking Order header toggles Order descending and locks drag reorder
    fireEvent.click(orderHeader);
    expect(orderHeader).toHaveAttribute('aria-sort', 'descending');
    expect(getRowModNames()).toEqual([
      expect.stringContaining('Dabs Framework'),
      expect.stringContaining('Server Scripts'),
      expect.stringContaining('Community Online Tools'),
      expect.stringContaining('CF'),
    ]);
    expect(screen.getByRole('button', { name: 'Reorder CF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset to Load Order' })).toBeInTheDocument();
  });
});
