import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type { ServerModDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { UnsavedChangesScope } from '@aegis/web/core';

import { ImportModsModal, type ImportModsModalProps } from './ImportModsModal';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      mods: {
        ...actual.apiClient.mods,
        importPreset: vi.fn(),
      },
    },
  };
});

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const NOW_ISO = '2026-11-10T10:00:00.000Z';

const sampleInstalledModCF: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222221',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '1559212036',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
  folderName: '@CF',
  name: 'Community Framework',
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

const sampleInstalledOldWorkshop: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222222',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '99999',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=99999',
  folderName: '@OldMod',
  name: 'Old Workshop Mod',
  sizeBytes: 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 1,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const sampleInstalledLocalMod: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222223',
  serverId: SERVER_ID,
  sourceType: 'local',
  loadTarget: 'server_only',
  workshopId: null,
  workshopUrl: null,
  folderName: '@CustomScripts',
  name: 'Custom Server Scripts',
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

function createPresetJsonFile(content: object, filename = 'dayz_preset.json'): File {
  const jsonString = JSON.stringify(content);
  const file = new File([jsonString], filename, { type: 'application/json' });
  // Ensure text() is available in all test environments
  if (!file.text) {
    file.text = () => Promise.resolve(jsonString);
  }
  return file;
}

describe('ImportModsModal (DSM-00355)', () => {
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

  const renderModal = (props: Partial<ImportModsModalProps> = {}) =>
    render(
      <QueryClientProvider client={queryClient}>
        <UnsavedChangesScope>
          <ImportModsModal
            isOpen
            serverId={SERVER_ID}
            installedMods={[sampleInstalledModCF]}
            installedWorkshopIds={new Set(['1559212036'])}
            isServerLocked={false}
            onClose={mockOnClose}
            {...props}
          />
        </UnsavedChangesScope>
      </QueryClientProvider>,
    );

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  describe('AC-01: Valid preset file upload and diff breakdown', () => {
    it('uploads valid preset file, displays summary counts, tags duplicate as Already Installed, uninstalled as New, and enables submit', async () => {
      const { container } = renderModal({
        installedMods: [sampleInstalledModCF],
        installedWorkshopIds: new Set(['1559212036']),
      });

      expect(screen.getByRole('heading', { name: 'Import Mod Preset' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Preset' })).toBeDisabled();

      const validPreset = {
        steamWsMods: [{ workshopId: '1559212036', name: 'Community Framework' }],
        steamWsServerMods: [{ workshopId: '1565871491', name: 'Trader' }],
      };
      const file = createPresetJsonFile(validPreset);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Diff preview should appear
      await waitFor(() => {
        expect(screen.getByText('Diff Preview')).toBeInTheDocument();
      });

      // Summary counts
      expect(screen.getByText('1 Client & Server')).toBeInTheDocument();
      expect(screen.getByText('1 Server-Only')).toBeInTheDocument();
      expect(screen.getByText('To Add')).toBeInTheDocument();
      expect(screen.getByText('Installed')).toBeInTheDocument();

      // Diff items with status badges
      expect(screen.getByText('Community Framework')).toBeInTheDocument();
      expect(screen.getByText('Trader')).toBeInTheDocument();

      expect(screen.getByText('Already Installed')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();

      // Submit button should now be enabled
      const submitBtn = screen.getByRole('button', { name: 'Import Preset' });
      expect(submitBtn).toBeEnabled();

      // Clearing the selected file resets content and hides diff preview
      const removeBtn = screen.getByRole('button', { name: 'Remove file' });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByText('Diff Preview')).not.toBeInTheDocument();
      });
      expect(submitBtn).toBeDisabled();
    });

    it('falls back gracefully when file.text() read throws an error', async () => {
      const { container } = renderModal();

      const badFile = new File(['bad'], 'corrupted.json', { type: 'application/json' });
      badFile.text = () => Promise.reject(new Error('Disk read failure'));

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [badFile] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert')).toHaveTextContent(/Preset contains no mods/i);
    });
  });

  describe('AC-02: Paste JSON tab validation & error handling', () => {
    it('displays inline error alert, hides diff preview, and keeps submit disabled on invalid JSON syntax', async () => {
      renderModal();

      // Switch to Paste JSON tab
      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');

      fireEvent.change(textarea, { target: { value: '{ invalid: json syntax' } });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Invalid JSON syntax/i);

      expect(screen.queryByText('Diff Preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Preset' })).toBeDisabled();
    });

    it('displays inline error alert and disables submit when preset contains zero mods', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');

      fireEvent.change(textarea, {
        target: { value: JSON.stringify({ steamWsMods: [], steamWsServerMods: [] }) },
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Preset contains no mods/i);

      expect(screen.queryByText('Diff Preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Preset' })).toBeDisabled();
    });

    it('displays schema validation error when workshop item is malformed', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');

      fireEvent.change(textarea, {
        target: {
          value: JSON.stringify({
            steamWsMods: [{ workshopId: 'not-numeric', name: 'Bad Mod' }],
          }),
        },
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.queryByText('Diff Preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import Preset' })).toBeDisabled();
    });
  });

  describe('AC-03: Replace mode and mutation execution', () => {
    it('surfaces absent server workshop mods as "Will be removed" in replace mode and submits mode: replace', async () => {
      const mockImportPreset = vi.mocked(apiClient.mods.importPreset).mockResolvedValue({
        added: [sampleInstalledModCF],
        skippedCount: 0,
        removedCount: 1,
        mods: [sampleInstalledModCF, sampleInstalledLocalMod],
        launchPreview: {
          modFlag: '-mod=@CF',
          serverModFlag: '',
          combinedArgs: ['-mod=@CF'],
          missingFolderCount: 0,
        },
        updateAvailableCount: 0,
      });

      renderModal({
        installedMods: [sampleInstalledModCF, sampleInstalledOldWorkshop, sampleInstalledLocalMod],
        installedWorkshopIds: new Set(['1559212036', '99999']),
      });

      // Paste preset containing only CF (missing OldMod 99999)
      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');
      fireEvent.change(textarea, {
        target: {
          value: JSON.stringify({
            steamWsMods: [{ workshopId: '1559212036', name: 'Community Framework' }],
            steamWsServerMods: [],
          }),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Diff Preview')).toBeInTheDocument();
      });

      // Default strategy is merge -> OldMod is not slated for removal
      expect(screen.queryByText('Will be removed')).not.toBeInTheDocument();

      // Select "Replace all workshop mods" strategy
      const replaceRadio = screen.getByLabelText(/Replace all workshop mods/i);
      fireEvent.click(replaceRadio);

      // Now OldMod (workshopId 99999) must appear with "Will be removed" tag
      expect(screen.getByText('Will be removed')).toBeInTheDocument();
      expect(screen.getByText('Old Workshop Mod')).toBeInTheDocument();
      // Local mod must NOT be marked for removal
      expect(screen.queryByText('Custom Server Scripts')).not.toBeInTheDocument();

      // Switch back to "Merge with existing" to exercise merge radio onChange handler
      const mergeRadio = screen.getByLabelText(/Merge with existing/i);
      fireEvent.click(mergeRadio);
      expect(screen.queryByText('Will be removed')).not.toBeInTheDocument();

      // Switch back to Replace for submission
      fireEvent.click(replaceRadio);
      expect(screen.getByText('Will be removed')).toBeInTheDocument();

      // Submit preset import
      const submitBtn = screen.getByRole('button', { name: 'Import Preset' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockImportPreset).toHaveBeenCalledWith(SERVER_ID, {
          preset: {
            steamWsMods: [{ workshopId: '1559212036', name: 'Community Framework' }],
            steamWsServerMods: [],
          },
          mode: 'replace',
        });
      });

      await waitFor(() => {
        expect(showToast.success).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('handles import API failure gracefully by displaying error toast and keeping modal open', async () => {
      vi.mocked(apiClient.mods.importPreset).mockRejectedValueOnce(
        new Error('Failed to persist imported preset'),
      );

      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');
      fireEvent.change(textarea, {
        target: {
          value: JSON.stringify({
            steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
          }),
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import Preset' })).toBeEnabled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Import Preset' }));

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('derives installed workshop IDs from installedMods when installedWorkshopIds prop is omitted', async () => {
      renderModal({
        installedMods: [sampleInstalledModCF],
        installedWorkshopIds: undefined,
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');
      fireEvent.change(textarea, {
        target: {
          value: JSON.stringify({
            steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
          }),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Diff Preview')).toBeInTheDocument();
      });

      expect(screen.getByText('Already Installed')).toBeInTheDocument();
    });

    it('rejects mutation when submit is triggered without a loaded preset', async () => {
      renderModal();
      const submitBtn = screen.getByRole('button', { name: 'Import Preset' }) as HTMLButtonElement;
      expect(submitBtn).toBeDisabled();

      // Trigger onClick directly via React props to exercise the defensive guard in mutationFn
      const reactPropsKey = Object.keys(submitBtn).find(k => k.startsWith('__reactProps$'));
      expect(reactPropsKey).toBeDefined();
      (submitBtn as unknown as Record<string, { onClick?: () => void }>)[
        reactPropsKey!
      ].onClick?.();

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalled();
      });
    });
  });

  describe('AC-04: Dirty state and unsaved changes confirmation (GUARD-03)', () => {
    const getDiscardDialog = () =>
      screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });

    it('closes immediately when no file or text has been entered', () => {
      renderModal();

      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('intercepts Cancel, Escape, and backdrop click with discard dialog when text is pasted', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('tab', { name: 'Paste JSON' }));
      const textarea = screen.getByLabelText('Preset JSON Content');
      fireEvent.change(textarea, { target: { value: '{"some":"input"}' } });

      // 1. Click Cancel button
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(getDiscardDialog()).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();

      // Click "Keep editing"
      fireEvent.click(within(getDiscardDialog()).getByRole('button', { name: 'Keep editing' }));
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      // 2. Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(getDiscardDialog()).toBeInTheDocument();

      // Click "Discard changes"
      fireEvent.click(within(getDiscardDialog()).getByRole('button', { name: 'Discard changes' }));
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('intercepts close when a file is selected', async () => {
      const { container } = renderModal();

      const file = createPresetJsonFile({
        steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
      });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Diff Preview')).toBeInTheDocument();
      });

      // Click close dialog X button
      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
      expect(getDiscardDialog()).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('AC-05: Running server lock (GUARD-01)', () => {
    it('displays server locked warning banner and disables submit button when isServerLocked is true', () => {
      renderModal({
        isServerLocked: true,
        serverStatus: 'running',
      });

      expect(screen.getByText(/Server is Active — Mod Configuration Locked/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Mod configuration cannot be modified while the server process is active/i,
        ),
      ).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: 'Import Preset' });
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute('title', 'Cannot import mods while server is active');
    });
  });
});
