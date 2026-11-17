import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerModDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { ExportPresetModal, type ExportPresetModalProps } from './ExportPresetModal';
import { formatExportTimestamp, sanitizePresetFilename } from './ExportPresetModal.utils';

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

  beforeEach(() => {
    vi.clearAllMocks();
    createdBlob = null;
    capturedAnchor.download = '';
    capturedAnchor.href = '';
    capturedAnchor.clicked = false;

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

  const renderModal = (props: Partial<ExportPresetModalProps> = {}) =>
    render(
      <ExportPresetModal
        isOpen
        serverId={SERVER_ID}
        serverName="DayZ Chernarus"
        mods={[modCF, modCOT, modServerOnly, modDisabled, modLocal]}
        onClose={mockOnClose}
        {...props}
      />,
    );

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('AC-01 & AC-02: renders breakdown counts and lists eligible mods, strictly excluding local mods', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Export Mod Preset' })).toBeInTheDocument();
    expect(screen.getByText('Export Mod Preset')).toBeInTheDocument();

    // Breakdown counts: Total = 3 (enabled workshop only), Client & Server = 2, Server-Only = 1
    const totalCount = screen.getByText('Total to Export').nextElementSibling;
    expect(totalCount).toHaveTextContent('3');

    const breakdownCards = screen.getAllByText('Client & Server');
    expect(breakdownCards[0].nextElementSibling).toHaveTextContent('2');

    const serverOnlyCards = screen.getAllByText('Server-Only');
    expect(serverOnlyCards[0].nextElementSibling).toHaveTextContent('1');

    // List items check
    expect(screen.getByText('CF')).toBeInTheDocument();
    expect(screen.getByText('Community Online Tools')).toBeInTheDocument();
    expect(screen.getByText('Admin Logs')).toBeInTheDocument();

    // AC-02: Local mods strictly excluded from preview
    expect(screen.queryByText('Custom Scripts')).not.toBeInTheDocument();
    // Disabled mods excluded by default
    expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
  });

  it('AC-01: downloads preset payload, sanitizes filename, revokes URL, toasts, and closes modal', async () => {
    renderModal();

    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    expect(downloadBtn).toBeEnabled();

    fireEvent.click(downloadBtn);

    // Verify blob payload was generated and passed to createObjectURL
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(createdBlob).not.toBeNull();
    const blobText = await createdBlob!.text();
    const payload = JSON.parse(blobText);

    expect(payload).toEqual({
      steamWsMods: [
        { workshopId: '1559212036', name: 'CF' },
        { workshopId: '1564026768', name: 'Community Online Tools' },
      ],
      steamWsServerMods: [{ workshopId: '2545327648', name: 'Admin Logs' }],
    });

    // Verify anchor download attributes and click trigger
    const filenamePattern =
      /^mods-preset-dayz-chernarus-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;
    expect(capturedAnchor.clicked).toBe(true);
    expect(capturedAnchor.download).toMatch(filenamePattern);
    expect(capturedAnchor.href).toBe('blob:mock-preset-url');

    // Verify cleanup and feedback
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preset-url');
    expect(showToast.success).toHaveBeenCalledWith(
      'Preset Exported',
      expect.stringContaining(capturedAnchor.download),
      undefined,
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('AC-03: toggles "Include disabled mods" to include disabled mods with warning badges and updates payload', async () => {
    renderModal();

    const checkbox = screen.getByLabelText('Include disabled mods');
    expect(checkbox).not.toBeChecked();

    // Initially disabled mod is omitted
    expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();

    // Toggle include disabled mods
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Counts update: 4 total, 3 client & server, 1 server-only
    const totalCount = screen.getByText('Total to Export').nextElementSibling;
    expect(totalCount).toHaveTextContent('4');
    const breakdownCards = screen.getAllByText('Client & Server');
    expect(breakdownCards[0].nextElementSibling).toHaveTextContent('3');

    // Disabled mod is now rendered with badge
    expect(screen.getByText('Disabled Mod')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    // Download with disabled mods
    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    fireEvent.click(downloadBtn);

    expect(createdBlob).not.toBeNull();
    const payload = JSON.parse(await createdBlob!.text());

    // Preserves loadOrder ascending (CF: 0, COT: 1, Disabled: 2)
    expect(payload.steamWsMods).toEqual([
      { workshopId: '1559212036', name: 'CF' },
      { workshopId: '1564026768', name: 'Community Online Tools' },
      { workshopId: '3333333333', name: 'Disabled Mod' },
    ]);
    expect(payload.steamWsServerMods).toEqual([{ workshopId: '2545327648', name: 'Admin Logs' }]);
  });

  it('AC-05: displays empty state notice and disables Download button when no exportable mods exist', () => {
    // Only local mods
    renderModal({ mods: [modLocal] });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    expect(
      screen.getByText(/No enabled workshop mods are available to export/i),
    ).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    expect(downloadBtn).toBeDisabled();
  });

  it('AC-05: displays empty notice when all workshop mods are disabled and toggle is off, but restores on toggle', () => {
    renderModal({ mods: [modDisabled] });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    expect(downloadBtn).toBeDisabled();

    // Toggle include disabled mods
    const checkbox = screen.getByLabelText('Include disabled mods');
    fireEvent.click(checkbox);

    expect(screen.queryByText('No Exportable Mods')).not.toBeInTheDocument();
    expect(downloadBtn).toBeEnabled();
  });

  it('handles omitted mods prop gracefully defaulting to empty array', () => {
    renderModal({ mods: undefined });

    expect(screen.getByText('No Exportable Mods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Preset' })).toBeDisabled();
  });

  it('exercises defensive guard returning early if handleDownload is called when no eligible mods exist', () => {
    renderModal({ mods: [] });
    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    expect(downloadBtn).toBeDisabled();

    const reactPropsKey = Object.keys(downloadBtn).find(k => k.startsWith('__reactProps$'));
    expect(reactPropsKey).toBeDefined();
    (downloadBtn as unknown as Record<string, { onClick?: () => void }>)[
      reactPropsKey!
    ].onClick?.();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles download failure by displaying error toast and keeping dialog open', () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('Disk quota exceeded');
    });

    renderModal();

    const downloadBtn = screen.getByRole('button', { name: 'Download Preset' });
    fireEvent.click(downloadBtn);

    expect(showToast.error).toHaveBeenCalledWith(
      'Failed to Export Mod Preset',
      expect.stringContaining('Disk quota exceeded'),
      undefined,
    );
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes dialog on Cancel button click', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes dialog on X button click', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes dialog on backdrop click', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Export Mod Preset' });
    fireEvent.click(dialog);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
