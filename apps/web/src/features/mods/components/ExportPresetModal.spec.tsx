import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type { ModPresetDto, ServerModDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { ExportPresetModal, type ExportPresetModalProps } from './ExportPresetModal';
import { formatExportTimestamp, sanitizePresetFilename } from './ExportPresetModal.utils';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      mods: {
        ...actual.apiClient.mods,
        exportPreset: vi.fn(),
      },
    },
  };
});

const mockExportPreset = vi.mocked(apiClient.mods.exportPreset);

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const NOW_ISO = '2026-11-10T10:00:00.000Z';

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
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 1,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modServerOnly: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222223',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'server_only',
  workshopId: '2545327648',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2545327648',
  folderName: '@AdminLogs',
  name: 'Admin Logs',
  sizeBytes: 2 * 1024 * 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 3,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modDisabled: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222224',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '3333333333',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3333333333',
  folderName: '@DisabledMod',
  name: 'Disabled Mod',
  sizeBytes: 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: false,
  loadOrder: 2,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const modLocal: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222225',
  serverId: SERVER_ID,
  sourceType: 'local',
  loadTarget: 'server_only',
  workshopId: null,
  workshopUrl: null,
  folderName: '@CustomScripts',
  name: 'Custom Scripts',
  sizeBytes: null,
  remoteUpdatedAt: null,
  syncedWorkshopUpdatedAt: null,
  lastSyncedAt: null,
  syncStatus: 'local',
  enabled: true,
  loadOrder: 4,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

describe('formatExportTimestamp (DSM-00356)', () => {
  it('returns string timestamp unchanged when passed string', () => {
    expect(formatExportTimestamp('2026-11-18-00-04-15')).toBe('2026-11-18-00-04-15');
  });

  it('formats Date instance with local components padded to two digits', () => {
    // 2026-11-18 00:04:15 local time (month 10 = November)
    const sampleDate = new Date(2026, 10, 18, 0, 4, 15);
    expect(formatExportTimestamp(sampleDate)).toBe('2026-11-18-00-04-15');
  });

  it('formats with current date-time matching regex pattern when argument is omitted', () => {
    expect(formatExportTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
  });
});

describe('sanitizePresetFilename (DSM-00356)', () => {
  const fixedTimestampStr = '2026-11-18-00-04-15';
  const fixedDate = new Date(2026, 10, 18, 0, 4, 15);

  it('converts standard names to kebab-case with prefix and timestamp suffix using default date', () => {
    expect(sanitizePresetFilename('DayZ Chernarus')).toMatch(
      /^mods-preset-dayz-chernarus-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
    );
  });

  it('formats filename with string exportDate parameter', () => {
    expect(sanitizePresetFilename('DayZ Chernarus', fixedTimestampStr)).toBe(
      'mods-preset-dayz-chernarus-2026-11-18-00-04-15.json',
    );
  });

  it('formats filename with Date instance exportDate parameter', () => {
    expect(sanitizePresetFilename('DayZ Chernarus', fixedDate)).toBe(
      'mods-preset-dayz-chernarus-2026-11-18-00-04-15.json',
    );
  });

  it('strips special characters and collapses consecutive punctuation', () => {
    expect(sanitizePresetFilename('Server #1 [PVP/1PP] -- Chernarus!', fixedTimestampStr)).toBe(
      'mods-preset-server-1-pvp-1pp-chernarus-2026-11-18-00-04-15.json',
    );
  });

  it('trims leading and trailing non-alphanumeric characters', () => {
    expect(sanitizePresetFilename('   ---Namalsk Hardcore---   ', fixedTimestampStr)).toBe(
      'mods-preset-namalsk-hardcore-2026-11-18-00-04-15.json',
    );
  });

  it('falls back to "server" base for empty strings', () => {
    expect(sanitizePresetFilename('', fixedTimestampStr)).toBe(
      'mods-preset-server-2026-11-18-00-04-15.json',
    );
    expect(sanitizePresetFilename('   ', fixedTimestampStr)).toBe(
      'mods-preset-server-2026-11-18-00-04-15.json',
    );
  });

  it('falls back to "server" base for strings with only symbols', () => {
    expect(sanitizePresetFilename('!@#$%^&*()_+=-~`', fixedTimestampStr)).toBe(
      'mods-preset-server-2026-11-18-00-04-15.json',
    );
  });

  it('preserves numbers and lowercases characters', () => {
    expect(sanitizePresetFilename('DayZ 1.26 Experimental Server', fixedTimestampStr)).toBe(
      'mods-preset-dayz-1-26-experimental-server-2026-11-18-00-04-15.json',
    );
  });
});

describe('ExportPresetModal (DSM-00356)', () => {
  const mockOnClose = vi.fn();
  let createdBlob: Blob | null = null;
  const capturedAnchor = { download: '', href: '', clicked: false };

  const enabledPreset: ModPresetDto = {
    steamWsMods: [
      { workshopId: '1559212036', name: 'CF' },
      { workshopId: '1564026768', name: 'Community Online Tools' },
    ],
    steamWsServerMods: [{ workshopId: '2545327648', name: 'Admin Logs' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createdBlob = null;
    capturedAnchor.download = '';
    capturedAnchor.href = '';
    capturedAnchor.clicked = false;

    mockExportPreset.mockResolvedValue(enabledPreset);
    vi.spyOn(showToast, 'success').mockReturnValue('toast-ok');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-err');

    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn();
    }
    if (typeof URL.revokeObjectURL === 'undefined') {
      URL.revokeObjectURL = vi.fn();
    }

    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      createdBlob = blob as Blob;
      return 'blob:mock-preset-url';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedAnchor.download = this.download;
      capturedAnchor.href = this.href;
      capturedAnchor.clicked = true;
    });
  });

  const renderModal = (props: Partial<ExportPresetModalProps> = {}) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <ExportPresetModal
          isOpen
          serverId={SERVER_ID}
          serverName="DayZ Chernarus"
          mods={[modCF, modCOT, modServerOnly, modDisabled, modLocal]}
          onClose={mockOnClose}
          {...props}
        />
      </QueryClientProvider>,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('AC-01 & AC-02: renders breakdown counts and lists eligible mods, strictly excluding local mods', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Export Mod Preset' })).toBeInTheDocument();

    // Breakdown counts: Total = 3 (enabled workshop only), Client & Server = 2, Server-Only = 1
    const totalCount = screen.getByText('Total to Export').nextElementSibling;
    expect(totalCount).toHaveTextContent('3');

    const breakdownCards = screen.getAllByText('Client & Server');
    expect(breakdownCards[0].nextElementSibling).toHaveTextContent('2');

    const serverOnlyCards = screen.getAllByText('Server-Only');
    expect(serverOnlyCards[0].nextElementSibling).toHaveTextContent('1');

    expect(screen.getByText('CF')).toBeInTheDocument();
    expect(screen.getByText('Community Online Tools')).toBeInTheDocument();
    expect(screen.getByText('Admin Logs')).toBeInTheDocument();

    // AC-02: Local mods strictly excluded from preview; disabled mods excluded by default
    expect(screen.queryByText('Custom Scripts')).not.toBeInTheDocument();
    expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
    expect(screen.getByText(/disabled mods are imported as enabled/i)).toBeInTheDocument();
  });

  it('AC-01: downloads the server-built preset, schedules delayed URL revocation, notifies, and closes', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Download Preset' }));

    await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1));
    expect(mockExportPreset).toHaveBeenCalledWith(SERVER_ID, { includeDisabled: false });

    // The file contains exactly what the server returned
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await createdBlob!.text())).toEqual(enabledPreset);

    expect(capturedAnchor.clicked).toBe(true);
    expect(capturedAnchor.download).toMatch(
      /^mods-preset-dayz-chernarus-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
    );
    expect(capturedAnchor.href).toBe('blob:mock-preset-url');

    // Delayed revocation: not revoked immediately while a Save dialog may be open
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    const revokeCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 60_000);
    expect(revokeCall).toBeDefined();
    (revokeCall![0] as () => void)();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preset-url');

    // Green toast through the notification contract
    expect(showToast.success).toHaveBeenCalledWith(
      'Preset Exported',
      `Exported 3 mod(s) to ${capturedAnchor.download}.`,
      undefined,
    );
  });

  it('AC-03: toggles "Include disabled mods", updates the preview, and requests disabled mods', async () => {
    renderModal();

    const checkbox = screen.getByLabelText('Include disabled mods');
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Counts update: 4 total, 3 client & server
    expect(screen.getByText('Total to Export').nextElementSibling).toHaveTextContent('4');
    expect(screen.getAllByText('Client & Server')[0].nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Disabled Mod')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download Preset' }));

    await waitFor(() =>
      expect(mockExportPreset).toHaveBeenCalledWith(SERVER_ID, { includeDisabled: true }),
    );
  });

  it('AC-05: displays empty state notice and disables Download button when no exportable mods exist', () => {
    renderModal({ mods: [modLocal] });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    expect(
      screen.getByText(/No enabled workshop mods are available to export/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Preset' })).toBeDisabled();
  });

  it('AC-05: displays empty notice when all workshop mods are disabled and toggle is off, but restores on toggle', () => {
    renderModal({ mods: [modDisabled] });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    expect(downloadBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Include disabled mods'));

    expect(screen.queryByText('No Exportable Mods')).not.toBeInTheDocument();
    expect(downloadBtn).toBeEnabled();
  });

  it('handles omitted mods prop gracefully defaulting to empty array', () => {
    renderModal({ mods: undefined });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Preset' })).toBeDisabled();
  });

  it('shows an error toast and keeps the dialog open when the export request fails', async () => {
    mockExportPreset.mockRejectedValueOnce(new Error('Server unreachable'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Download Preset' }));

    await waitFor(() =>
      expect(showToast.error).toHaveBeenCalledWith(
        'Failed to Export Mod Preset',
        expect.stringContaining('Server unreachable'),
        undefined,
      ),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows an error toast and keeps the dialog open when the browser download fails', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('Disk quota exceeded');
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Download Preset' }));

    await waitFor(() =>
      expect(showToast.error).toHaveBeenCalledWith(
        'Failed to Export Mod Preset',
        expect.stringContaining('Disk quota exceeded'),
        undefined,
      ),
    );
    expect(showToast.success).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it.each([
    ['Cancel button', () => screen.getByRole('button', { name: 'Cancel' })],
    ['X button', () => screen.getByRole('button', { name: 'Close dialog' })],
    ['backdrop', () => screen.getByRole('dialog', { name: 'Export Mod Preset' })],
  ])('closes dialog on %s click', (_label, getTarget) => {
    renderModal();

    fireEvent.click(getTarget());
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
