import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, RefreshCw, Save, Terminal, Trash2 } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type {
  SteamDiagnosticsResultDto,
  SteamSettingsDto,
  UpdateSteamSettingsDto,
} from '@aegis/api-contracts';
import {
  Button,
  Card,
  Input,
  PasswordInput,
  ProgressBar,
  type ProgressBarVariant,
  Select,
  type SelectOption,
  StatusTag,
  Tag,
  Toggle,
} from '@aegis/ui';
import { PageContainer } from '@aegis/web/components';

import {
  extractApiFieldErrors,
  notifyApiError,
  notifyInfo,
  notifySuccess,
  resolveFieldErrors,
} from '../../core';

import { SteamDiagnosticsModal } from './components/SteamDiagnosticsModal';
import { SteamGuardChallengeModal } from './components/SteamGuardChallengeModal';
import { useSteamAuthChallenge } from './hooks/useSteamAuthChallenge';

const AUTH_MODE_OPTIONS: SelectOption[] = [
  { value: 'anonymous', label: 'Anonymous (Public installations)' },
  { value: 'account', label: 'Dedicated Steam Account (Workshop & private branches)' },
];

const APP_ID_OPTIONS: SelectOption[] = [
  { value: '223350', label: '223350 (DayZ Server - Stable)' },
  { value: '1042420', label: '1042420 (DayZ Experimental Server)' },
];

function getSessionBadge(status: string) {
  switch (status) {
    case 'AUTHENTICATED':
      return <StatusTag status="online" label="Authenticated (Token Cached)" />;
    case 'CHALLENGE_REQUIRED':
      return <StatusTag status="warning" label="Steam Guard 2FA Pending" />;
    case 'EXPIRED':
      return <StatusTag status="danger" label="Session Expired" />;
    case 'UNAUTHENTICATED':
    default:
      return <StatusTag status="offline" label="Unauthenticated" />;
  }
}

function resolveAccountErrors(
  authMode: 'anonymous' | 'account',
  username: string,
  password: string,
  hasPassword: boolean,
): Record<string, string> {
  if (authMode !== 'account') return {};
  const errors: Record<string, string> = {};
  if (!username.trim()) {
    errors.steamUsername = 'Steam username is required for dedicated account mode';
  }
  if (!hasPassword && !password.trim()) {
    errors.steamPassword = 'Password is required when configuring a dedicated Steam account';
  }
  return errors;
}

function resolveBranchPassword(
  useCustomBranch: boolean,
  hasBranchPassword: boolean,
  isChangingBranchPassword: boolean,
  branchPassword: string,
): string | null | undefined {
  if (!useCustomBranch) {
    return hasBranchPassword ? null : undefined;
  }
  if (!hasBranchPassword || isChangingBranchPassword) {
    if (branchPassword.trim()) {
      return branchPassword.trim();
    }
    if (isChangingBranchPassword && hasBranchPassword) {
      return null;
    }
  }
  return undefined;
}

function resolveSteamPassword(
  authMode: 'anonymous' | 'account',
  hasPassword: boolean,
  isChangingPassword: boolean,
  steamPassword: string,
): string | undefined {
  if (authMode !== 'account') return undefined;
  if ((isChangingPassword || !hasPassword) && steamPassword.trim()) {
    return steamPassword.trim();
  }
  return undefined;
}

function resolveStorageVariant(freeGb: number): ProgressBarVariant {
  if (freeGb < 10) {
    return 'danger';
  }
  if (freeGb <= 20) {
    return 'warning';
  }
  return 'success';
}

function renderWorkshopCapacityBar(storage?: { totalBytes: number; freeBytes: number }) {
  if (!storage || storage.totalBytes <= 0) {
    return (
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Volume capacity unknown until path is created and verified
      </p>
    );
  }

  const freeGb = storage.freeBytes / 1024 ** 3;
  const totalGb = storage.totalBytes / 1024 ** 3;
  const usedPercent = Math.min(
    100,
    Math.max(0, ((storage.totalBytes - storage.freeBytes) / storage.totalBytes) * 100),
  );
  const variant = resolveStorageVariant(freeGb);

  return (
    <div className="mt-2">
      <ProgressBar
        value={usedPercent}
        variant={variant}
        size="sm"
        showValue
        valueLabel={`${freeGb.toFixed(1)} GB free of ${totalGb.toFixed(1)} GB`}
        aria-label="Workshop storage partition capacity"
      />
    </div>
  );
}

interface SteamSettingsFormProps {
  settings: SteamSettingsDto;
  onClearSession: () => void;
  isClearingSession: boolean;
  onLoginSession: () => void;
  isLoggingIn: boolean;
  onRunDiagnostics: () => void;
  isRunningDiagnostics: boolean;
}

function SteamSettingsForm({
  settings,
  onClearSession,
  isClearingSession,
  onLoginSession,
  isLoggingIn,
  onRunDiagnostics,
  isRunningDiagnostics,
}: SteamSettingsFormProps) {
  const queryClient = useQueryClient();

  const [authMode, setAuthMode] = useState<'anonymous' | 'account'>(settings.authMode);
  const [steamUsername, setSteamUsername] = useState(settings.steamUsername || '');
  const [steamPassword, setSteamPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [steamCmdPath, setSteamCmdPath] = useState(settings.steamCmdPath);
  const [steamWorkshopPath, setSteamWorkshopPath] = useState(settings.steamWorkshopPath);
  const [steamMetaPath, setSteamMetaPath] = useState(settings.steamMetaPath);

  const [gameServerAppId, setGameServerAppId] = useState(settings.gameServerAppId);
  const [workshopAppId, setWorkshopAppId] = useState(settings.workshopAppId);
  const [useCustomBranch, setUseCustomBranch] = useState(
    settings.branch !== 'public' || settings.hasBranchPassword,
  );
  const [branch, setBranch] = useState(settings.branch);
  const [branchPassword, setBranchPassword] = useState('');
  const [isChangingBranchPassword, setIsChangingBranchPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSteamSettingsDto) => apiClient.steam.updateSettings(dto),
    onSuccess: updated => {
      queryClient.setQueryData(['steam-settings'], updated);
      notifySuccess('STEAM_SETTINGS_UPDATED');
      setIsChangingPassword(false);
      setIsChangingBranchPassword(false);
      setSteamPassword('');
      setBranchPassword('');
      setFieldErrors({});
    },
    onError: (err: Error) => {
      const resolved = resolveFieldErrors(extractApiFieldErrors(err));
      setFieldErrors(resolved);
      notifyApiError(err, 'Failed to Save Steam Settings');
    },
  });

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const clientErrors = resolveAccountErrors(
      authMode,
      steamUsername,
      steamPassword,
      settings.hasPassword,
    );
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    const branchPasswordValue = resolveBranchPassword(
      useCustomBranch,
      settings.hasBranchPassword,
      isChangingBranchPassword,
      branchPassword,
    );
    const steamPasswordValue = resolveSteamPassword(
      authMode,
      settings.hasPassword,
      isChangingPassword,
      steamPassword,
    );

    const dto: UpdateSteamSettingsDto = {
      authMode,
      steamCmdPath: steamCmdPath.trim(),
      steamWorkshopPath: steamWorkshopPath.trim(),
      steamMetaPath: steamMetaPath.trim(),
      gameServerAppId,
      workshopAppId,
      branch: useCustomBranch ? branch.trim() || 'public' : 'public',
      steamUsername: authMode === 'account' ? steamUsername.trim() : null,
      ...(steamPasswordValue !== undefined && { steamPassword: steamPasswordValue }),
      ...(branchPasswordValue !== undefined && { branchPassword: branchPasswordValue }),
    };

    updateMutation.mutate(dto);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
              Steam CMD & Workshop
            </h1>
            {getSessionBadge(settings.sessionStatus)}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage SteamCMD binary pathing, workshop storage volumes, encrypted credentials, and
            branch targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={Trash2}
            onClick={onClearSession}
            isLoading={isClearingSession}
          >
            Clear Session Tokens
          </Button>
          <Button
            variant="secondary"
            leftIcon={Terminal}
            onClick={onRunDiagnostics}
            isLoading={isRunningDiagnostics}
          >
            Run Diagnostics
          </Button>
          <Button
            variant="primary"
            leftIcon={Save}
            onClick={handleSave}
            isLoading={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Session Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-main)]">
              SteamCMD Authentication Session
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Cached session tickets enable automated headless mod updates without interactive
              prompts
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {getSessionBadge(settings.sessionStatus)}
          {settings.authMode === 'account' &&
            settings.hasPassword &&
            (settings.sessionStatus === 'AUTHENTICATED' ? (
              <Button
                variant="secondary"
                leftIcon={Trash2}
                onClick={onClearSession}
                isLoading={isClearingSession}
              >
                Clear Session
              </Button>
            ) : (
              <Button
                variant="primary"
                leftIcon={KeyRound}
                onClick={onLoginSession}
                isLoading={isLoggingIn}
              >
                Authenticate Session
              </Button>
            ))}
        </div>
      </div>

      {/* Form Grid: 3 Cards */}
      <form noValidate onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Steam Authentication & Credential Vault */}
        <Card
          title="Steam Authentication & Credential Vault"
          subtitle="Configure login mode and encrypted credentials (AES-256-GCM vault) for workshop synchronization"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Authentication Mode"
                options={AUTH_MODE_OPTIONS}
                value={authMode}
                onChange={val => {
                  setAuthMode(val as 'anonymous' | 'account');
                  clearFieldError('authMode');
                }}
              />

              {authMode === 'account' && (
                <Input
                  label="Steam Username"
                  placeholder="e.g. dayz_server_operator"
                  value={steamUsername}
                  error={fieldErrors.steamUsername}
                  onChange={e => {
                    setSteamUsername(e.target.value);
                    clearFieldError('steamUsername');
                  }}
                />
              )}
            </div>

            {authMode === 'account' && (
              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text-main)]">
                      Account Password Vault
                    </span>
                  </div>
                  {settings.hasPassword && !isChangingPassword ? (
                    <Tag variant="subtle" color="success">
                      Password Stored & Encrypted
                    </Tag>
                  ) : (
                    <Tag variant="subtle" color="warning">
                      {settings.hasPassword ? 'Updating Password' : 'No Password Stored'}
                    </Tag>
                  )}
                </div>

                {settings.hasPassword && !isChangingPassword ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      ••••••••••••••••
                    </span>
                    <Button variant="ghost" onClick={() => setIsChangingPassword(true)}>
                      Change Password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PasswordInput
                      label="Steam Account Password"
                      placeholder="Enter Steam password"
                      value={steamPassword}
                      error={fieldErrors.steamPassword}
                      onChange={e => {
                        setSteamPassword(e.target.value);
                        clearFieldError('steamPassword');
                      }}
                    />
                    {settings.hasPassword && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setSteamPassword('');
                          }}
                        >
                          Keep Existing Password
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Storage & Execution Paths */}
        <Card
          title="Filesystem & Workshop Storage Paths"
          subtitle="Local filesystem directories for the SteamCMD binary, workshop downloads, and session metadata"
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Input
                label="SteamCMD Binary Path"
                placeholder="e.g. C:\steamcmd\steamcmd.exe or /usr/games/steamcmd"
                value={steamCmdPath}
                error={fieldErrors.steamCmdPath}
                onChange={e => {
                  setSteamCmdPath(e.target.value);
                  clearFieldError('steamCmdPath');
                }}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Absolute path to the executable binary or its parent directory.
              </p>
            </div>

            <div className="space-y-1">
              <Input
                label="Workshop Staging Path"
                placeholder="e.g. D:\DayZServer\steamapps\workshop"
                value={steamWorkshopPath}
                error={fieldErrors.steamWorkshopPath}
                onChange={e => {
                  setSteamWorkshopPath(e.target.value);
                  clearFieldError('steamWorkshopPath');
                }}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Directory where DayZ mods are downloaded. Needs capacity for 50GB–200GB+.
              </p>
              {renderWorkshopCapacityBar(settings.storageStats?.workshop)}
            </div>

            <div className="space-y-1">
              <Input
                label="SteamCMD Metadata & Cache Path"
                placeholder="e.g. C:\DayZServer\steamapps"
                value={steamMetaPath}
                error={fieldErrors.steamMetaPath}
                onChange={e => {
                  setSteamMetaPath(e.target.value);
                  clearFieldError('steamMetaPath');
                }}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Directory storing app manifests, Steam cache, and authentication session tokens
                (ssfn / VDF).
              </p>
            </div>
          </div>
        </Card>

        {/* Card 3: App IDs & Branch Configuration */}
        <Card
          title="DayZ Steam App IDs & Branch Targets"
          subtitle="App IDs and branch options used when updating DayZ server binaries and workshop items"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Game Server App ID"
                options={APP_ID_OPTIONS}
                value={String(gameServerAppId)}
                onChange={val => {
                  setGameServerAppId(Number(val));
                  clearFieldError('gameServerAppId');
                }}
              />

              <Input
                label="Workshop App ID"
                type="number"
                placeholder="221100"
                value={workshopAppId}
                error={fieldErrors.workshopAppId}
                onChange={e => {
                  setWorkshopAppId(Number(e.target.value));
                  clearFieldError('workshopAppId');
                }}
              />
            </div>

            <div className="pt-2 border-t border-[var(--color-border)]">
              <Toggle
                label="Custom / Pre-release Branch"
                description="Enable only to target a non-public DayZ branch or private password-protected beta."
                checked={useCustomBranch}
                onChange={e => {
                  const checked = e.target.checked;
                  setUseCustomBranch(checked);
                  if (!checked) {
                    setBranch('public');
                    setBranchPassword('');
                    setIsChangingBranchPassword(false);
                    clearFieldError('branch');
                    clearFieldError('branchPassword');
                  }
                }}
              />
            </div>

            {useCustomBranch && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Branch"
                  placeholder="public"
                  value={branch}
                  error={fieldErrors.branch}
                  onChange={e => {
                    setBranch(e.target.value);
                    clearFieldError('branch');
                  }}
                />

                {settings.hasBranchPassword && !isChangingBranchPassword ? (
                  <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                        Branch Password
                      </div>
                      <div className="text-xs font-mono text-[var(--color-text-main)]">
                        ••••••••
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => setIsChangingBranchPassword(true)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <PasswordInput
                      label="Branch Password (Optional)"
                      placeholder="Leave empty for public branch"
                      value={branchPassword}
                      error={fieldErrors.branchPassword}
                      onChange={e => {
                        setBranchPassword(e.target.value);
                        clearFieldError('branchPassword');
                      }}
                    />
                    {settings.hasBranchPassword && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsChangingBranchPassword(false);
                            setBranchPassword('');
                          }}
                        >
                          Keep Existing
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}

export function SteamSettingsView() {
  const queryClient = useQueryClient();

  const { activeChallenge, respondToChallenge, abortChallenge } = useSteamAuthChallenge();

  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const [diagResult, setDiagResult] = useState<SteamDiagnosticsResultDto | null>(null);

  const { data: settings } = useQuery<SteamSettingsDto>({
    queryKey: ['steam-settings'],
    queryFn: () => apiClient.steam.getSettings(),
  });

  const clearSessionMutation = useMutation({
    mutationFn: () => apiClient.steam.clearSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steam-settings'] });
      notifySuccess('STEAM_SESSION_CLEARED');
    },
    onError: (err: Error) => {
      notifyApiError(err, 'Failed to Clear Session Tokens');
    },
  });

  const loginSessionMutation = useMutation({
    mutationFn: () => apiClient.steam.loginSession(),
    onSuccess: () => {
      notifyInfo(
        'Authentication Initiated',
        'SteamCMD is establishing an authenticated session. Follow any Steam Guard prompts on your screen or mobile device.',
      );
    },
    onError: (err: Error) => {
      notifyApiError(err, 'Failed to Initiate Steam Login');
    },
  });

  const diagMutation = useMutation({
    mutationFn: () => apiClient.steam.runDiagnostics(),
    onMutate: () => {
      setDiagResult(null);
      setIsDiagOpen(true);
      notifyInfo(
        'Diagnostics Initiated',
        'Validating SteamCMD binary, storage volumes, and probing Valve network latency...',
      );
    },
    onSuccess: result => {
      setDiagResult(result);
      if (result.success) {
        notifySuccess('STEAM_DIAGNOSTICS_COMPLETED');
      } else {
        notifyApiError(
          new Error(
            'Diagnostics completed with issues. Review individual checks and execution logs below.',
          ),
          'Diagnostics Issues Detected',
        );
      }
    },
    onError: (err: Error) => {
      notifyApiError(err, 'Failed to Run SteamCMD Diagnostics');
    },
  });

  return (
    <PageContainer>
      {settings ? (
        <SteamSettingsForm
          key={`${settings.id}-${String(settings.updatedAt)}`}
          settings={settings}
          onClearSession={() => clearSessionMutation.mutate()}
          isClearingSession={clearSessionMutation.isPending}
          onLoginSession={() => loginSessionMutation.mutate()}
          isLoggingIn={loginSessionMutation.isPending}
          onRunDiagnostics={() => diagMutation.mutate()}
          isRunningDiagnostics={diagMutation.isPending}
        />
      ) : (
        <div className="py-12 flex justify-center text-sm text-[var(--color-text-muted)]">
          Loading Steam configuration...
        </div>
      )}

      {/* Reactive Steam Guard 2FA Modal */}
      <SteamGuardChallengeModal
        challenge={activeChallenge}
        onSubmitOtp={respondToChallenge}
        onAbort={abortChallenge}
      />

      {/* Steam Diagnostics Modal */}
      <SteamDiagnosticsModal
        isOpen={isDiagOpen}
        result={diagResult}
        isLoading={diagMutation.isPending}
        onClose={() => setIsDiagOpen(false)}
      />
    </PageContainer>
  );
}
