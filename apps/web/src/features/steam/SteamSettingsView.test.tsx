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
  hasSteamWebApiKey: false,
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
        loginSession: vi.fn(),
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
      hasSteamWebApiKey:
        dto.steamWebApiKey === null
          ? false
          : Boolean(dto.steamWebApiKey ?? mockDefaultSettings.hasSteamWebApiKey),
      updatedAt: new Date().toISOString(),
    }));
    vi.mocked(apiClient.steam.clearSession).mockResolvedValue({
      success: true,
      message: 'Cleared',
    });
    vi.mocked(apiClient.steam.loginSession).mockResolvedValue({
      success: true,
      message: 'Initiated',
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

    // 20GB Warning Threshold tag is removed (REQ-13)
    expect(screen.queryByText('20GB Free Warning Threshold')).not.toBeInTheDocument();
    // Default fallback when storageStats is absent
    expect(
      screen.getByText('Volume capacity unknown until path is created and verified'),
    ).toBeInTheDocument();
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

  it('submits updated settings when clicking Save Changes with custom branch enabled', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Steam CMD & Workshop')).toBeInTheDocument();
    });

    // Branch input is initially hidden behind the toggle
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();

    // Enable custom branch toggle
    const branchToggle = screen.getByLabelText(/Custom \/ Pre-release Branch/i);
    fireEvent.click(branchToggle);

    // Branch input becomes visible
    const branchInput = await screen.findByLabelText('Branch');
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

  it('reverts branch to public when custom branch toggle is turned off (REQ-09)', async () => {
    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
      ...mockDefaultSettings,
      branch: 'experimental',
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByLabelText('Branch')).toHaveValue('experimental');
    });

    // Toggle custom branch OFF
    const branchToggle = screen.getByLabelText(/Custom \/ Pre-release Branch/i);
    fireEvent.click(branchToggle);

    // Branch input should disappear
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();

    // Click Save Changes
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.steam.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'public',
        }),
      );
    });

    expect(showToast.success).toHaveBeenCalled();
  });

  it('submits newly entered password for dedicated Steam account when hasPassword is false', async () => {
    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
      ...mockDefaultSettings,
      authMode: 'account',
      steamUsername: 'dayz_operator',
      hasPassword: false,
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Account Password Vault')).toBeInTheDocument();
    });

    // Verify "No Password Stored" tag is rendered
    expect(screen.getByText('No Password Stored')).toBeInTheDocument();

    // Directly fill password input
    const passwordInput = screen.getByLabelText('Steam Account Password');
    fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!' } });

    // Save
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.steam.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          authMode: 'account',
          steamUsername: 'dayz_operator',
          steamPassword: 'SuperSecret123!',
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

  it('provides immediate onMutate diagnostics feedback opening modal in loading state and dispatching toast (REQ-10)', async () => {
    let resolveDiagPromise!: (value: SteamDiagnosticsResultDto) => void;
    const diagPromise = new Promise<SteamDiagnosticsResultDto>(resolve => {
      resolveDiagPromise = resolve;
    });

    vi.mocked(apiClient.steam.runDiagnostics).mockReturnValue(diagPromise);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Run Diagnostics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Diagnostics' }));

    // Assert immediate onMutate feedback before promise resolution
    expect(showToast.info).toHaveBeenCalledWith(
      'Diagnostics Initiated',
      'Validating SteamCMD binary, storage volumes, and probing Valve network latency...',
      undefined,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Running SteamCMD diagnostic probe...')).toBeInTheDocument();

    // Resolve the probe promise
    resolveDiagPromise(mockDiagnosticsResult);

    await waitFor(() => {
      expect(screen.getByText('Diagnostics Passed')).toBeInTheDocument();
      expect(screen.getByText('[INFO] Probe test log entry')).toBeInTheDocument();
    });

    expect(showToast.success).toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('fires error toast with "Diagnostics Issues Detected" and no success toast when diagnostics fails (REQ-10 Refinement)', async () => {
    vi.mocked(apiClient.steam.runDiagnostics).mockResolvedValue({
      ...mockDiagnosticsResult,
      success: false,
      connectionSuccess: false,
      logs: ['[ERROR] Network probe failed'],
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Run Diagnostics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Diagnostics' }));

    await waitFor(() => {
      expect(screen.getByText('Issues Detected')).toBeInTheDocument();
    });

    expect(showToast.error).toHaveBeenCalledWith(
      'Diagnostics Issues Detected',
      'Diagnostics completed with issues. Review individual checks and execution logs below.',
      undefined,
    );
    expect(showToast.success).not.toHaveBeenCalled();
  });

  it('triggers login session mutation when clicking Authenticate Session button (REQ-08)', async () => {
    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
      ...mockDefaultSettings,
      authMode: 'account',
      steamUsername: 'dayz_operator',
      hasPassword: true,
      sessionStatus: 'UNAUTHENTICATED',
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Authenticate Session' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Authenticate Session' }));

    await waitFor(() => {
      expect(apiClient.steam.loginSession).toHaveBeenCalled();
    });

    expect(showToast.info).toHaveBeenCalled();
  });

  it('renders Clear Session button when authenticated and invokes clearSession (REQ-08)', async () => {
    vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
      ...mockDefaultSettings,
      authMode: 'account',
      steamUsername: 'dayz_operator',
      hasPassword: true,
      sessionStatus: 'AUTHENTICATED',
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear Session' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Authenticate Session' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Session' }));

    await waitFor(() => {
      expect(apiClient.steam.clearSession).toHaveBeenCalled();
    });

    expect(showToast.success).toHaveBeenCalled();
  });

  describe('Dynamic Workshop Storage Capacity Progress Bar (REQ-13)', () => {
    it('renders healthy storage progress bar (>20GB free) with success styling and free space label', async () => {
      vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
        ...mockDefaultSettings,
        storageStats: {
          workshop: {
            totalBytes: 100 * 1024 ** 3,
            freeBytes: 50 * 1024 ** 3,
          },
        },
      });

      renderView();

      await waitFor(() => {
        expect(screen.getByText('50.0 GB free of 100.0 GB')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', {
        name: 'Workshop storage partition capacity',
      });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');

      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-[var(--color-status-success)]');
    });

    it('renders warning storage progress bar (10-20GB free) with warning styling', async () => {
      vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
        ...mockDefaultSettings,
        storageStats: {
          workshop: {
            totalBytes: 100 * 1024 ** 3,
            freeBytes: 15 * 1024 ** 3,
          },
        },
      });

      renderView();

      await waitFor(() => {
        expect(screen.getByText('15.0 GB free of 100.0 GB')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', {
        name: 'Workshop storage partition capacity',
      });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');

      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-[var(--color-status-warning)]');
    });

    it('renders danger storage progress bar (<10GB free) with danger styling', async () => {
      vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
        ...mockDefaultSettings,
        storageStats: {
          workshop: {
            totalBytes: 100 * 1024 ** 3,
            freeBytes: 5 * 1024 ** 3,
          },
        },
      });

      renderView();

      await waitFor(() => {
        expect(screen.getByText('5.0 GB free of 100.0 GB')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar', {
        name: 'Workshop storage partition capacity',
      });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '95');

      const innerBar = progressBar.querySelector('div');
      expect(innerBar).toHaveClass('bg-[var(--color-status-danger)]');
    });

    it('renders fallback notice without progressbar when storageStats is absent or totalBytes <= 0', async () => {
      vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
        ...mockDefaultSettings,
        storageStats: undefined,
      });

      renderView();

      await waitFor(() => {
        expect(
          screen.getByText('Volume capacity unknown until path is created and verified'),
        ).toBeInTheDocument();
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Steam Web API Key Vault Controls (REQ-03)', () => {
    it('renders Not Configured badge, helper link to steamcommunity.com/dev/apikey, and submits entered key', async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByText('Steam Web API Key (Workshop Search)')).toBeInTheDocument();
      });

      expect(screen.getByText('Not Configured')).toBeInTheDocument();
      const apiKeyLink = screen.getByRole('link', { name: 'steamcommunity.com/dev/apikey' });
      expect(apiKeyLink).toHaveAttribute('href', 'https://steamcommunity.com/dev/apikey');

      const keyInput = screen.getByLabelText('Steam Web API Key');
      fireEvent.change(keyInput, { target: { value: '  MY_API_KEY_123  ' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(apiClient.steam.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            steamWebApiKey: 'MY_API_KEY_123',
          }),
        );
      });
    });

    it('supports Change Key, Keep Existing Key, and Clear Key flows when hasSteamWebApiKey is true', async () => {
      vi.mocked(apiClient.steam.getSettings).mockResolvedValue({
        ...mockDefaultSettings,
        hasSteamWebApiKey: true,
      });

      renderView();

      await waitFor(() => {
        expect(screen.getByText('API Key Stored & Encrypted')).toBeInTheDocument();
      });

      // Toggle Change Key -> Keep Existing Key
      fireEvent.click(screen.getByRole('button', { name: 'Change Key' }));
      expect(screen.getByLabelText('Steam Web API Key')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Keep Existing Key' }));
      expect(screen.queryByLabelText('Steam Web API Key')).not.toBeInTheDocument();

      // Mark for clearing -> undo -> mark again and save
      fireEvent.click(screen.getByRole('button', { name: 'Clear Key' }));
      expect(screen.getByText('Will Clear on Save')).toBeInTheDocument();
      expect(
        screen.getByText(/Stored Steam Web API key will be removed when you save changes/i),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Keep Existing Key' }));
      expect(screen.getByText('API Key Stored & Encrypted')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Clear Key' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(apiClient.steam.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            steamWebApiKey: null,
          }),
        );
      });
    });
  });
});
