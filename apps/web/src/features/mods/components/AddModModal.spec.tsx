import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { ServerModDto, WorkshopResolvedItemDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { AddModModal } from './AddModModal';

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
        lookupWorkshop: vi.fn(),
        searchWorkshop: vi.fn(),
        add: vi.fn(),
        batchAdd: vi.fn(),
      },
    },
  };
});

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const NOW_ISO = '2026-11-10T10:00:00.000Z';

const itemCF: WorkshopResolvedItemDto = {
  workshopId: '1559212036',
  name: 'CF',
  suggestedFolderName: '@CF',
  shortDescription: 'Community Framework',
  previewUrl: null,
  sizeBytes: 5 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
};

const itemCOT: WorkshopResolvedItemDto = {
  workshopId: '1564026768',
  name: 'Community Online Tools',
  suggestedFolderName: '@Community-Online-Tools',
  shortDescription: 'Admin tools',
  previewUrl: null,
  sizeBytes: 12 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
};

const itemVPP: WorkshopResolvedItemDto = {
  workshopId: '1828439124',
  name: 'VPPAdminTools',
  suggestedFolderName: '@VPPAdminTools',
  shortDescription: 'Admin tools',
  previewUrl: null,
  sizeBytes: 8 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
};

const createdMod: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222222',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: itemCF.workshopId,
  workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${itemCF.workshopId}`,
  folderName: '@CF',
  name: 'CF',
  sizeBytes: itemCF.sizeBytes,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 0,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

describe('AddModModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-ok');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-err');
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderModal = (installedWorkshopIds = new Set<string>(), isOpen = true) =>
    render(
      <QueryClientProvider client={queryClient}>
        <AddModModal
          isOpen={isOpen}
          serverId={SERVER_ID}
          installedWorkshopIds={installedWorkshopIds}
          onClose={mockOnClose}
        />
      </QueryClientProvider>,
    );

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(new Set(), false);
    expect(container).toBeEmptyDOMElement();
  });

  it('derives modal heading dynamically from active tab and selected Load Target', async () => {
    renderModal();

    // Tab 1 (URL / ID / Collection) defaults to client_server
    expect(screen.getByRole('heading', { name: 'Add Client & Server Mod' })).toBeInTheDocument();

    // Tab 3 (Local Mod) defaults to server_only
    fireEvent.click(screen.getByRole('tab', { name: /Local Mod/i }));
    expect(screen.getByRole('heading', { name: 'Add Server-Only Mod' })).toBeInTheDocument();

    // Changing Load Target in Tab 3 updates heading dynamically
    fireEvent.click(screen.getByLabelText('Load Target'));
    fireEvent.click(await screen.findByRole('option', { name: /Client & Server/i }));
    expect(screen.getByRole('heading', { name: 'Add Client & Server Mod' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Load Target'));
    fireEvent.click(await screen.findByRole('option', { name: /Server Only/i }));
    expect(screen.getByRole('heading', { name: 'Add Server-Only Mod' })).toBeInTheDocument();

    // Switching back to Tab 2 (Search Workshop) reflects its client_server default
    fireEvent.click(screen.getByRole('tab', { name: /Search Workshop/i }));
    expect(screen.getByRole('heading', { name: 'Add Client & Server Mod' })).toBeInTheDocument();

    // Switching back to Tab 3 preserves Tab 3's selected server_only target
    fireEvent.click(screen.getByRole('tab', { name: /Local Mod/i }));
    expect(screen.getByRole('heading', { name: 'Add Server-Only Mod' })).toBeInTheDocument();
  });

  describe('Tab 1: URL / ID / Collection', () => {
    it('validates empty input and surfaces STEAM_WORKSHOP_INVALID_INPUT inline', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));
      expect(
        screen.getByText('Enter a Steam Workshop URL or PublishedFileId.'),
      ).toBeInTheDocument();
      expect(apiClient.mods.lookupWorkshop).not.toHaveBeenCalled();

      vi.mocked(apiClient.mods.lookupWorkshop).mockRejectedValueOnce(
        new ApiError('Invalid input', 400, {
          statusCode: 400,
          error: 'Bad Request',
          errorCode: 'STEAM_WORKSHOP_INVALID_INPUT',
          message: 'Bad URL',
        }),
      );

      fireEvent.change(screen.getByLabelText('Steam Workshop URL or PublishedFileId'), {
        target: { value: 'https://evil.com/?id=123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

      await waitFor(() => {
        expect(
          screen.getByText('Enter a numeric Workshop ID or a steamcommunity.com Workshop URL.'),
        ).toBeInTheDocument();
      });
    });

    it('resolves a single Workshop item and submits via apiClient.mods.add with markAsInstalled', async () => {
      vi.mocked(apiClient.mods.lookupWorkshop).mockResolvedValueOnce({
        kind: 'item',
        collectionTitle: null,
        items: [itemCF],
        skippedCount: 0,
      });
      vi.mocked(apiClient.mods.add).mockResolvedValueOnce(createdMod);

      renderModal();

      fireEvent.change(screen.getByLabelText('Steam Workshop URL or PublishedFileId'), {
        target: { value: '1559212036' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

      await waitFor(() => {
        expect(screen.getByText('CF')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/Mark as already installed/i));
      fireEvent.click(screen.getByRole('button', { name: 'Add Selected Mod' }));

      await waitFor(() => {
        expect(apiClient.mods.add).toHaveBeenCalledWith(SERVER_ID, {
          sourceType: 'workshop',
          workshopId: '1559212036',
          name: 'CF',
          folderName: '@CF',
          loadTarget: 'client_server',
          enabled: true,
          sizeBytes: itemCF.sizeBytes,
          remoteUpdatedAt: NOW_ISO,
          markAsInstalled: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('resolves a collection with non-DayZ skipped notice, disables already-installed items, and batch-adds new selections', async () => {
      vi.mocked(apiClient.mods.lookupWorkshop).mockResolvedValueOnce({
        kind: 'collection',
        collectionTitle: 'Essential Pack',
        items: [itemCF, itemCOT, itemVPP],
        skippedCount: 2,
      });
      vi.mocked(apiClient.mods.batchAdd).mockResolvedValueOnce({
        added: [createdMod],
        skippedCount: 0,
        mods: [createdMod],
        launchPreview: {
          modFlag: '-mod=@CF',
          serverModFlag: '',
          combinedArgs: ['-mod=@CF'],
          missingFolderCount: 0,
        },
        updateAvailableCount: 0,
      });

      renderModal(new Set([itemCF.workshopId]));

      fireEvent.change(screen.getByLabelText('Steam Workshop URL or PublishedFileId'), {
        target: { value: 'https://steamcommunity.com/sharedfiles/filedetails/?id=999999999' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

      await waitFor(() => {
        expect(screen.getByText('Essential Pack')).toBeInTheDocument();
      });

      expect(screen.getByText('Non-DayZ Items Filtered')).toBeInTheDocument();
      expect(screen.getByText('Already added')).toBeInTheDocument();
      expect(screen.getByLabelText('Select CF')).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Add 2 Mods' }));

      await waitFor(() => {
        expect(apiClient.mods.batchAdd).toHaveBeenCalledWith(SERVER_ID, {
          mods: [
            expect.objectContaining({ workshopId: itemCOT.workshopId }),
            expect.objectContaining({ workshopId: itemVPP.workshopId }),
          ],
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Tab 2: Search Workshop', () => {
    it('renders STEAM_WEB_API_KEY_REQUIRED notice with link to /settings/steam when API key is not configured', async () => {
      vi.mocked(apiClient.mods.searchWorkshop).mockRejectedValueOnce(
        new ApiError('API key missing', 400, {
          statusCode: 400,
          error: 'Bad Request',
          errorCode: 'STEAM_WEB_API_KEY_REQUIRED',
          message: 'API key required',
        }),
      );

      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: /Search Workshop/i }));
      fireEvent.change(screen.getByLabelText('Search DayZ Steam Workshop'), {
        target: { value: 'Trader' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        expect(screen.getByText('Steam Web API Key Required')).toBeInTheDocument();
      });

      const settingsLink = screen.getByRole('link', {
        name: /Configure Steam Web API Key in Steam Settings/i,
      });
      expect(settingsLink).toHaveAttribute('href', '/settings/steam');
      fireEvent.click(settingsLink);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('paginates search results and batch-adds selected Workshop mods', async () => {
      vi.mocked(apiClient.mods.searchWorkshop)
        .mockResolvedValueOnce({
          items: [itemCF],
          total: 15,
          page: 1,
          pageSize: 10,
        })
        .mockResolvedValueOnce({
          items: [itemCOT],
          total: 15,
          page: 2,
          pageSize: 10,
        });
      vi.mocked(apiClient.mods.batchAdd).mockResolvedValueOnce({
        added: [createdMod],
        skippedCount: 0,
        mods: [createdMod],
        launchPreview: {
          modFlag: '-mod=@Community-Online-Tools',
          serverModFlag: '',
          combinedArgs: ['-mod=@Community-Online-Tools'],
          missingFolderCount: 0,
        },
        updateAvailableCount: 0,
      });

      renderModal();
      fireEvent.click(screen.getByRole('tab', { name: /Search Workshop/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 10 of 15 items')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
      await waitFor(() => {
        expect(apiClient.mods.searchWorkshop).toHaveBeenLastCalledWith({
          q: '',
          page: 2,
          pageSize: 10,
        });
        expect(screen.getByText('Community Online Tools')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Select Community Online Tools'));
      fireEvent.click(screen.getByRole('button', { name: 'Add 1 Mod(s)' }));

      await waitFor(() => {
        expect(apiClient.mods.batchAdd).toHaveBeenCalledWith(SERVER_ID, {
          mods: [expect.objectContaining({ workshopId: itemCOT.workshopId })],
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Tab 3: Local Mod', () => {
    it('validates local mod fields client-side and submits local mod DTO', async () => {
      vi.mocked(apiClient.mods.add).mockResolvedValueOnce({
        ...createdMod,
        sourceType: 'local',
        workshopId: null,
        workshopUrl: null,
        folderName: '@ServerScripts',
        name: 'Server Scripts',
        loadTarget: 'server_only',
        syncStatus: 'local',
      });

      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: /Local Mod/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Add Local Mod' }));

      expect(screen.getByText('Mod name is required.')).toBeInTheDocument();
      expect(screen.getByText('Mod folder name is required.')).toBeInTheDocument();
      expect(apiClient.mods.add).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('Mod Name'), {
        target: { value: 'Server Scripts' },
      });
      fireEvent.change(screen.getByLabelText('@Folder Name'), {
        target: { value: '@ServerScripts' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Local Mod' }));

      await waitFor(() => {
        expect(apiClient.mods.add).toHaveBeenCalledWith(SERVER_ID, {
          sourceType: 'local',
          name: 'Server Scripts',
          folderName: '@ServerScripts',
          loadTarget: 'server_only',
          enabled: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
