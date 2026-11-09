import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type { SteamDiagnosticsResultDto, SteamSettingsDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { SteamSettingsView } from './SteamSettingsView';

const mockDefaultSettings: SteamSettingsDto = {
  id: 'default',
  steamCmdPath: 'C:\\steamcmd\\steamcmd.exe',
  steamWorkshopPath: 'C:\\DayZServer\\steamapps\\workshop',
  steamMetaPath: 'C:\\DayZServer\\steamapps',
  authMode: 'anonymous',
  steamUsername: null,
  hasPassword: false,
  gameServerAppId: 223350,
  workshopAppId: 221100,
  branch: 'public',
  hasBranchPassword: false,
  sessionStatus: 'UNAUTHENTICATED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockDiagnosticsResult: SteamDiagnosticsResultDto = {
  success: true,
  steamCmdValid: true,
  steamCmdVersion: '1730000000',
  workshopPathWritable: true,
  workshopFreeBytes: 150000000000,
  metaPathWritable: true,
  metaFreeBytes: 80000000000,
  connectionSuccess: true,
  latencyMs: 88,
  logs: ['[INFO] Probe test log entry'],
  timestamp: new Date().toISOString(),
};

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      steam: {
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
        clearSession: vi.fn(),
        respondChallenge: vi.fn(),
        abortChallenge: vi.fn(),
        runDiagnostics: vi.fn(),
      },
    },
  };
});

describe('SteamSettingsView (REQ-01, REQ-02, REQ-03, REQ-04, REQ-07)', () => {
  let queryClient: QueryClient;

  function renderView() {
    return render(
      <QueryClientProvider client={queryClient}>
        <SteamSettingsView />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    vi.spyOn(showToast, 'info').mockReturnValue('toast-info-id');

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({ ...mockDefaultSettings });
    vi.mocked(apiClient.steam.updateSettings).mockImplementation(async dto => ({
      ...mockDefaultSettings,
      ...dto,
      hasPassword: Boolean(dto.steamPassword ?? mockDefaultSettings.hasPassword),
      updatedAt: new Date().toISOString(),
    }));
    vi.mocked(apiClient.steam.clearSession).mockResolvedValue({
      success: true,
      message: 'Cleared',
    });
    vi.mocked(apiClient.steam.runDiagnostics).mockResolvedValue({ ...mockDiagnosticsResult });
  });

  it('renders loading state initially then displays the 3 configuration cards', async () => {
    renderView();

    expect(screen.getByText('Loading Steam configuration...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Steam CMD & Workshop')).toBeInTheDocument();
    });

    // 3 Cards
    expect(screen.getByText('Steam Authentication & Credential Vault')).toBeInTheDocument();
    expect(screen.getByText('Filesystem & Workshop Storage Paths')).toBeInTheDocument();
    expect(screen.getByText('DayZ Steam App IDs & Branch Targets')).toBeInTheDocument();

    // 20GB Warning Threshold tag
    expect(screen.getByText('20GB Free Warning Threshold')).toBeInTheDocument();
  });

  it('toggles between anonymous and account authentication modes', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Steam CMD & Workshop')).toBeInTheDocument();
    });

    // In anonymous mode, username and password input are not visible
    expect(screen.queryByLabelText('Steam Username')).not.toBeInTheDocument();

    // Select dedicated account mode via custom Select combobox
    const modeSelect = screen.getByLabelText('Authentication Mode');
    fireEvent.click(modeSelect);

    const accountOption = await screen.findByRole('option', {
      name: /Dedicated Steam Account/i,
    });
    fireEvent.click(accountOption);

    // Reveals username input and password section
    expect(await screen.findByLabelText('Steam Username')).toBeInTheDocument();
    expect(screen.getByText('Account Password Vault')).toBeInTheDocument();
  });

  it('displays password masked bullets and allows revealing password change input', async () => {
    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
      ...mockDefaultSettings,
      authMode: 'account',
      steamUsername: 'dayz_admin',
      hasPassword: true,
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Password Stored & Encrypted')).toBeInTheDocument();
    });

    expect(screen.getByText('••••••••••••••••')).toBeInTheDocument();
    expect(screen.queryByLabelText('Steam Account Password')).not.toBeInTheDocument();

    // Click "Change Password"
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    expect(screen.getByLabelText('Steam Account Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Existing Password' })).toBeInTheDocument();

    // Cancel changing password
    fireEvent.click(screen.getByRole('button', { name: 'Keep Existing Password' }));
    expect(screen.getByText('Password Stored & Encrypted')).toBeInTheDocument();
  });

  it('submits updated settings when clicking Save Changes', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Steam CMD & Workshop')).toBeInTheDocument();
    });

    // Change branch
    const branchInput = screen.getByLabelText('Branch');
    fireEvent.change(branchInput, { target: { value: 'experimental' } });

    // Click Save Changes
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.steam.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'experimental',
          authMode: 'anonymous',
        }),
      );
    });

    expect(showToast.success).toHaveBeenCalled();
  });

  it('triggers clear session mutation when clicking Clear Session Tokens', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Clear Session Tokens')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Session Tokens' }));

    await waitFor(() => {
      expect(apiClient.steam.clearSession).toHaveBeenCalled();
    });

    expect(showToast.success).toHaveBeenCalled();
  });

  it('runs diagnostics probe and opens diagnostics modal when clicking Run Diagnostics', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Run Diagnostics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Diagnostics' }));

    await waitFor(() => {
      expect(apiClient.steam.runDiagnostics).toHaveBeenCalled();
      expect(screen.getByText('SteamCMD Diagnostics & Connectivity')).toBeInTheDocument();
    });

    expect(screen.getByText('[INFO] Probe test log entry')).toBeInTheDocument();
  });
});
