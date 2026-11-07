import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';

import { apiClient } from '@dsm/api-client';
import {
  isServerActiveStatus,
  type ServerDetailDto,
  type ServerSummaryDto,
  type UpdateServerDto,
} from '@dsm/api-contracts';
import {
  Button,
  Card,
  Input,
  KeywordConfirmation,
  Notice,
  PasswordInput,
  StatusTag,
  Toggle,
} from '@dsm/ui';
import { EmptyServersState, PageContainer } from '@dsm/web/components';
import {
  extractApiFieldErrors,
  getServerStatusPresentation,
  notifyApiError,
  notifySuccess,
  resolveFieldErrors,
  serverQueries,
  serverQueryKeys,
  useActiveServer,
} from '@dsm/web/core';

import { CreateServerModal } from './CreateServerModal';

interface ServerSettingsValidationInput {
  name: string;
  rconPassword: string;
  isServerLocked: boolean;
  installPath: string;
  profilePath: string;
  missionPath: string;
  gamePort: number;
  queryPort: number;
  rconPort: number;
}

function validateServerSettingsForm(input: ServerSettingsValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'Server name is required.';
  }
  if (input.rconPassword && input.rconPassword.length < 6) {
    errors.rconPassword = 'RCON password must be at least 6 characters.';
  }

  if (input.isServerLocked) {
    return errors;
  }

  if (!input.installPath.trim()) {
    errors.installPath = 'Installation path is required.';
  }
  if (!input.profilePath.trim()) {
    errors.profilePath = 'Profile path is required.';
  }
  if (!input.missionPath.trim()) {
    errors.missionPath = 'Mission path is required.';
  }
  if (!input.gamePort || input.gamePort < 1024 || input.gamePort > 65535) {
    errors.gamePort = 'Port must be between 1024 and 65535.';
  }
  if (!input.queryPort || input.queryPort < 1024 || input.queryPort > 65535) {
    errors.queryPort = 'Port must be between 1024 and 65535.';
  }
  if (!input.rconPort || input.rconPort < 1024 || input.rconPort > 65535) {
    errors.rconPort = 'Port must be between 1024 and 65535.';
  }
  if (
    input.gamePort === input.queryPort ||
    input.gamePort === input.rconPort ||
    input.queryPort === input.rconPort
  ) {
    errors.gamePort = 'Game port, query port, and RCON port must all be distinct.';
  }

  return errors;
}

interface ServerSettingsFormProps {
  detail: ServerDetailDto;
  onSave: (payload: UpdateServerDto) => void;
  isSaving: boolean;
  serverFieldErrors: Record<string, string>;
  onClearServerFieldError: (field: string) => void;
}

function ServerSettingsForm({
  detail,
  onSave,
  isSaving,
  serverFieldErrors,
  onClearServerFieldError,
}: ServerSettingsFormProps) {
  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description ?? '');
  const [gamePort, setGamePort] = useState(detail.gamePort);
  const [queryPort, setQueryPort] = useState(detail.queryPort);
  const [rconPort, setRconPort] = useState(detail.rconPort);
  const [rconPassword, setRconPassword] = useState('');
  const [installPath, setInstallPath] = useState(detail.installPath);
  const [profilePath, setProfilePath] = useState(detail.profilePath);
  const [missionPath, setMissionPath] = useState(detail.missionPath);
  const [launchParameters, setLaunchParameters] = useState(detail.launchParameters ?? '');
  const [isDefault, setIsDefault] = useState(detail.isDefault);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mergedErrors = { ...serverFieldErrors, ...fieldErrors };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverFieldErrors[field]) {
      onClearServerFieldError(field);
    }
  };

  const isServerLocked = isServerActiveStatus(detail.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateServerSettingsForm({
      name,
      rconPassword,
      isServerLocked,
      installPath,
      profilePath,
      missionPath,
      gamePort,
      queryPort,
      rconPort,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const payload: UpdateServerDto = {
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
    };

    if (rconPassword.trim()) {
      payload.rconPassword = rconPassword.trim();
    }
    if (launchParameters.trim()) {
      payload.launchParameters = launchParameters.trim();
    }

    if (!isServerLocked) {
      payload.gamePort = Number(gamePort);
      payload.queryPort = Number(queryPort);
      payload.rconPort = Number(rconPort);
      payload.installPath = installPath.trim();
      payload.profilePath = profilePath.trim();
      payload.missionPath = missionPath.trim();
    }

    onSave(payload);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {isServerLocked && (
        <Notice variant="warning" title="Server is Active — Configuration Locked">
          This server is currently <strong className="uppercase">{detail.status}</strong>. Network
          ports and file storage paths are locked to prevent runtime state corruption. Stop the
          server to modify these parameters.
        </Notice>
      )}

      {/* General Information Card */}
      <Card
        title="General Information"
        subtitle="Instance name, description, and primary workspace assignment"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Server Name"
              value={name}
              error={mergedErrors.name}
              onChange={e => {
                setName(e.target.value);
                clearFieldError('name');
              }}
            />
            <Input
              label="Description"
              placeholder="Instance notes or purpose"
              value={description}
              error={mergedErrors.description}
              onChange={e => {
                setDescription(e.target.value);
                clearFieldError('description');
              }}
            />
          </div>

          <div className="pt-2">
            <Toggle
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              label="Default Server Instance"
              description="Selected automatically when visiting the console without an explicit server parameter"
            />
          </div>
        </div>
      </Card>

      {/* Network & Ports Card */}
      <Card
        title="Network & Port Assignments"
        subtitle="UDP and TCP listening ports for DayZ game engine, Steam A2S, and BattlEye RCON"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Game Port (UDP)"
              type="number"
              value={gamePort}
              disabled={isServerLocked}
              error={mergedErrors.gamePort}
              onChange={e => {
                setGamePort(Number(e.target.value));
                clearFieldError('gamePort');
              }}
            />
            <Input
              label="Steam Query Port (A2S)"
              type="number"
              value={queryPort}
              disabled={isServerLocked}
              error={mergedErrors.queryPort}
              onChange={e => {
                setQueryPort(Number(e.target.value));
                clearFieldError('queryPort');
              }}
            />
            <Input
              label="BattlEye RCON Port"
              type="number"
              value={rconPort}
              disabled={isServerLocked}
              error={mergedErrors.rconPort}
              onChange={e => {
                setRconPort(Number(e.target.value));
                clearFieldError('rconPort');
              }}
            />
          </div>
          {isServerLocked && (
            <p className="text-xs text-[var(--color-text-muted)] italic">
              Port allocation cannot be altered while the server process is active.
            </p>
          )}
        </div>
      </Card>

      {/* Security & RCON Card */}
      <Card
        title="Security & BattlEye RCON"
        subtitle="Administrative access credentials for real-time game console supervision"
      >
        <div className="p-6 space-y-4">
          <PasswordInput
            label="New RCON Password"
            placeholder="Leave blank to keep existing password"
            value={rconPassword}
            error={mergedErrors.rconPassword}
            onChange={e => {
              setRconPassword(e.target.value);
              clearFieldError('rconPassword');
            }}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            BattlEye RCON requires passwords with a minimum of 6 characters. Passwords are saved in
            the database and synchronized to <code className="font-mono text-xs">beserver.cfg</code>
            .
          </p>
        </div>
      </Card>

      {/* Storage & Paths Card */}
      <Card
        title="Storage & File System Paths"
        subtitle="Host machine directory paths for DayZ executable, profiles, and mission templates"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Installation Path"
            value={installPath}
            disabled={isServerLocked}
            error={mergedErrors.installPath}
            onChange={e => {
              setInstallPath(e.target.value);
              clearFieldError('installPath');
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Profile Path"
              value={profilePath}
              disabled={isServerLocked}
              error={mergedErrors.profilePath}
              onChange={e => {
                setProfilePath(e.target.value);
                clearFieldError('profilePath');
              }}
            />
            <Input
              label="Mission Path"
              value={missionPath}
              disabled={isServerLocked}
              error={mergedErrors.missionPath}
              onChange={e => {
                setMissionPath(e.target.value);
                clearFieldError('missionPath');
              }}
            />
          </div>
        </div>
      </Card>

      {/* Engine Launch Flags */}
      <Card
        title="Engine Launch Parameters"
        subtitle="Command-line flags passed directly to DayZServer_x64 on startup"
      >
        <div className="p-6 space-y-4">
          <Input
            label="CLI Arguments"
            value={launchParameters}
            placeholder="-cpuCount=4 -doLogs -adminLog -netLog"
            onChange={e => setLaunchParameters(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Specify system flags such as <code className="font-mono text-xs">-cpuCount=4</code>,{' '}
            <code className="font-mono text-xs">-doLogs</code>, or custom memory limit flags.
          </p>
        </div>
      </Card>

      {/* Save Bar */}
      <div className="flex justify-end pt-4">
        <Button variant="primary" type="submit" leftIcon={Save} isLoading={isSaving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function ServerSettingsView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    servers,
    activeServer,
    activeServerId,
    setActiveServerId,
    isLoading: isServersLoading,
  } = useActiveServer();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const clearServerFieldError = (field: string) => {
    setServerFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Delete Mutation declared ahead of detail query to guard active query state
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!activeServerId) throw new Error('No active server selected');
      return apiClient.servers.delete(activeServerId);
    },
    onSuccess: () => {
      const cachedDetail = activeServerId
        ? queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(activeServerId))
        : undefined;
      const deletedServerName = cachedDetail?.name ?? activeServer?.name ?? 'Server';
      setShowDeleteConfirm(false);
      const deletedId = activeServerId;
      if (deletedId) {
        queryClient.removeQueries({ queryKey: serverQueryKeys.detail(deletedId) });
      }
      queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), old =>
        old ? old.filter(s => s.id !== deletedId) : [],
      );
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.list() });
      notifySuccess('SERVER_DELETED', { name: deletedServerName });

      const nextServer = servers.find(s => s.id !== deletedId);
      if (nextServer) {
        setActiveServerId(nextServer.id);
      } else {
        navigate({
          to: '/dashboard',
          search: ((prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.serverId;
            return next;
          }) as never,
        });
      }
    },
    onError: (err: Error) => {
      setShowDeleteConfirm(false);
      notifyApiError(err, 'Delete Failed');
    },
  });

  // Detail query for active server - disabled while delete is pending or complete
  const {
    data: detail,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    ...serverQueries.detail(activeServerId ?? ''),
    enabled: Boolean(activeServerId) && !deleteMutation.isPending && !deleteMutation.isSuccess,
  });

  const isServerLocked = detail ? isServerActiveStatus(detail.status) : false;
  const isDeleteDisabled = !detail || isServerLocked;

  // Save Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateServerDto) => {
      if (!activeServerId) throw new Error('No active server selected');
      return apiClient.servers.update(activeServerId, payload);
    },
    onSuccess: updatedServer => {
      if (activeServerId) {
        queryClient.setQueryData(serverQueryKeys.detail(activeServerId), updatedServer);
      }
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.list() });
      setServerFieldErrors({});
      notifySuccess('SERVER_UPDATED', { name: updatedServer.name });
    },
    onError: (err: Error) => {
      const resolvedFields = resolveFieldErrors(extractApiFieldErrors(err));
      if (Object.keys(resolvedFields).length > 0) {
        setServerFieldErrors(resolvedFields);
        return;
      }
      notifyApiError(err, 'Update Failed');
    },
  });

  if (isServersLoading || isDetailLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-[var(--color-surface-subtle)] animate-pulse rounded" />
          <div className="h-48 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
          <div className="h-64 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (servers.length === 0) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <EmptyServersState onAddServer={() => setIsCreateModalOpen(true)} />
          <CreateServerModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </div>
      </PageContainer>
    );
  }

  if (detailError || !activeServer || !detail) {
    return (
      <PageContainer>
        <div>
          <Notice variant="error" title="Server Not Found">
            Unable to load configuration for the selected server. It may have been deleted or the ID
            is invalid.
          </Notice>
        </div>
      </PageContainer>
    );
  }

  const statusPresentation = getServerStatusPresentation(detail.status);

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
                Server Settings
              </h1>
              <StatusTag status={statusPresentation.tagStatus} label={statusPresentation.label} />
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Manage ports, execution flags, security credentials, and file paths for{' '}
              <span className="font-semibold text-[var(--color-text-main)]">{detail.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
              Add new server
            </Button>
          </div>
        </div>

        {/* Structured Configuration Form */}
        <ServerSettingsForm
          key={detail.id}
          detail={detail}
          onSave={payload => updateMutation.mutate(payload)}
          isSaving={updateMutation.isPending}
          serverFieldErrors={serverFieldErrors}
          onClearServerFieldError={clearServerFieldError}
        />

        {/* Danger Zone */}
        <div className="rounded-2xl border border-dashed border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)]/20 p-6 space-y-4">
          <div className="flex items-center gap-3 text-[var(--color-status-danger)]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-semibold">Danger Zone</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                Delete Server Instance
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Permanently deregistrates this server from DSM console. Game files and missions on
                disk remain intact.
              </p>
              {isServerLocked && (
                <p className="mt-1 text-xs text-[var(--color-status-danger)] font-medium">
                  Server must be stopped before deletion.
                </p>
              )}
            </div>
            <Button
              variant="primary"
              destructive
              leftIcon={Trash2}
              disabled={isDeleteDisabled}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete server
            </Button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showDeleteConfirm && (
          <KeywordConfirmation
            keyword={detail.name}
            title="Delete Server Instance"
            description={`Are you sure you want to delete "${detail.name}"? This action removes the server from DayZ Server Manager. Game files and missions on disk remain intact.`}
            variant="danger"
            confirmLabel="Delete server"
            cancelLabel="Cancel"
            isLoading={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {/* Create Server Modal */}
        <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </div>
    </PageContainer>
  );
}
