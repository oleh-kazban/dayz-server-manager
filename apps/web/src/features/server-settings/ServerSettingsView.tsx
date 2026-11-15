import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  isServerActiveStatus,
  rconIpSchema,
  rconPasswordSchema,
  type ServerDetailDto,
  serverNameSchema,
  type ServerSummaryDto,
  type UpdateServerDto,
  type ValidateServerPathsRequestDto,
  type ValidateServerPathsResponseDto,
} from '@aegis/api-contracts';
import {
  Button,
  Card,
  Input,
  KeywordConfirmation,
  Notice,
  PasswordInput,
  StatusTag,
  Toggle,
} from '@aegis/ui';
import { EmptyServersState, PageContainer, SaveButton } from '@aegis/web/components';
import {
  getServerStatusPresentation,
  notifyApiError,
  notifySuccess,
  serverQueries,
  serverQueryKeys,
  useActiveServer,
  useEditableForm,
} from '@aegis/web/core';

import { ServerConfigCard } from './components/server-config/ServerConfigCard';
import { StoragePathsCard } from './components/StoragePathsCard';
import { CreateServerModal } from './CreateServerModal';

interface ServerSettingsValidationInput {
  name: string;
  rconPassword: string;
  isServerLocked: boolean;
  installPath: string;
  gamePort: number;
  queryPort: number;
  rconPort: number;
  rconIp: string;
}

function validateNetworkAndPaths(
  input: ServerSettingsValidationInput,
  errors: Record<string, string>,
): void {
  if (!input.installPath.trim()) {
    errors.installPath = 'Installation path is required.';
  }
  if (!input.gamePort || input.gamePort < 1024 || input.gamePort > 65535) {
    errors.gamePort = 'Port must be between 1024 and 65535.';
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
  const rconIpResult = rconIpSchema.safeParse(input.rconIp.trim());
  if (!rconIpResult.success) {
    errors.rconIp = rconIpResult.error.issues[0].message;
  }
}

function validateServerSettingsForm(input: ServerSettingsValidationInput): Record<string, string> {
  if (input.isServerLocked) {
    return {};
  }

  const errors: Record<string, string> = {};
  if (!input.name.trim()) {
    errors.name = 'Server name is required.';
  } else {
    const nameResult = serverNameSchema.safeParse(input.name.trim());
    if (!nameResult.success) {
      errors.name = nameResult.error.issues[0].message;
    }
  }

  validateNetworkAndPaths(input, errors);

  if (input.rconPassword.length > 0) {
    const rconResult = rconPasswordSchema.safeParse(input.rconPassword);
    if (!rconResult.success) {
      errors.rconPassword = rconResult.error.issues[0].message;
    }
  }

  return errors;
}

interface ServerSettingsValues extends Record<string, unknown> {
  name: string;
  description: string;
  gamePort: number;
  rconPort: number;
  rconIp: string;
  rconPassword: string;
  installPath: string;
  missionPath: string;
  launchParameters: string;
  isDefault: boolean;
}

function toServerSettingsValues(detail: ServerDetailDto): ServerSettingsValues {
  return {
    name: detail.name,
    description: detail.description ?? '',
    gamePort: detail.gamePort,
    rconPort: detail.rconPort,
    rconIp: detail.rconIp,
    rconPassword: detail.rconPassword ?? '',
    installPath: detail.installPath,
    missionPath: detail.missionPath,
    launchParameters: detail.launchParameters ?? '',
    isDefault: detail.isDefault,
  };
}

/** Normalisation applied on save; also the basis for change detection. */
function normalizeServerSettings(values: ServerSettingsValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    gamePort: Number(values.gamePort),
    rconPort: Number(values.rconPort),
    rconIp: values.rconIp.trim(),
    rconPassword: values.rconPassword || null,
    installPath: values.installPath.trim(),
    missionPath: values.missionPath.trim().replaceAll('\\', '/'),
    launchParameters: values.launchParameters.trim() || null,
    isDefault: values.isDefault,
  };
}

interface ServerSaveCallbacks {
  onSaved: (saved: ServerDetailDto) => void;
  onError: (err: unknown) => void;
}

interface ServerSettingsFormProps {
  detail: ServerDetailDto;
  onSave: (payload: UpdateServerDto, callbacks: ServerSaveCallbacks) => void;
  isSaving: boolean;
  onHasChangesChange: (hasChanges: boolean) => void;
}

function ServerSettingsForm({
  detail,
  onSave,
  isSaving,
  onHasChangesChange,
}: ServerSettingsFormProps) {
  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description ?? '');
  const [gamePort, setGamePort] = useState(detail.gamePort);
  const [rconPort, setRconPort] = useState(detail.rconPort);
  const [rconIp, setRconIp] = useState(detail.rconIp);
  const [rconPassword, setRconPassword] = useState(detail.rconPassword ?? '');
  const [installPath, setInstallPath] = useState(detail.installPath);
  const [missionPath, setMissionPath] = useState(detail.missionPath);
  const [launchParameters, setLaunchParameters] = useState(detail.launchParameters ?? '');
  const [isDefault, setIsDefault] = useState(detail.isDefault);
  const [validationResult, setValidationResult] = useState<ValidateServerPathsResponseDto | null>(
    null,
  );
  const validateInFlightRef = useRef(false);
  const mountedServerIdRef = useRef(detail.id);
  const prevDetailRconRef = useRef(detail.rconPassword ?? '');
  const prevDetailMissionRef = useRef(detail.missionPath);

  const isServerLocked = isServerActiveStatus(detail.status);
  const values: ServerSettingsValues = {
    name,
    description,
    gamePort,
    rconPort,
    rconIp,
    rconPassword,
    installPath,
    missionPath,
    launchParameters,
    isDefault,
  };
  const {
    registerForm,
    hasChanges,
    errors,
    handleSubmit,
    reportServerErrors,
    clearServerErrors,
    markSaved,
  } = useEditableForm({
    values,
    baseline: toServerSettingsValues(detail),
    toPayload: normalizeServerSettings,
    validate: v =>
      validateServerSettingsForm({ ...v, isServerLocked, queryPort: detail.queryPort }),
    isPending: isSaving,
  });

  useEffect(() => {
    onHasChangesChange(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  useEffect(() => {
    const incoming = detail.rconPassword ?? '';
    if (incoming !== prevDetailRconRef.current) {
      setRconPassword(incoming);
      prevDetailRconRef.current = incoming;
    }
  }, [detail.rconPassword]);

  useEffect(() => {
    if (detail.missionPath !== prevDetailMissionRef.current) {
      setMissionPath(detail.missionPath);
      prevDetailMissionRef.current = detail.missionPath;
    }
  }, [detail.missionPath]);

  useEffect(() => {
    mountedServerIdRef.current = detail.id;
    return () => {
      mountedServerIdRef.current = '';
    };
  }, [detail.id]);

  interface ValidatePathsMutationVars {
    serverId: string;
    dto: ValidateServerPathsRequestDto;
    sentValues: ServerSettingsValues;
  }

  const validatePathsMutation = useMutation({
    mutationFn: ({ serverId, dto }: ValidatePathsMutationVars) =>
      apiClient.servers.validatePaths(serverId, dto),
    onSuccess: (result, variables) => {
      if (mountedServerIdRef.current !== variables.serverId) {
        return;
      }
      setValidationResult(result);
      clearServerErrors(['installPath', 'missionPath']);
    },
    onError: (err: Error, variables) => {
      if (mountedServerIdRef.current !== variables.serverId) {
        return;
      }
      setValidationResult(null);
      reportServerErrors(err, variables.sentValues);
      notifyApiError(err, 'Path Validation Failed');
    },
    onSettled: () => {
      validateInFlightRef.current = false;
    },
  });

  // Path validation is user-initiated only (Validate Paths button); nothing runs on mount.
  const handleValidatePaths = () => {
    if (validatePathsMutation.isPending || validateInFlightRef.current) {
      return;
    }
    validateInFlightRef.current = true;
    const trimmedMission = missionPath.trim();
    validatePathsMutation.mutate({
      serverId: detail.id,
      sentValues: values,
      dto: {
        installPath: installPath.trim(),
        profilePath: 'profiles',
        ...(trimmedMission ? { missionPath: trimmedMission } : {}),
      },
    });
  };

  const submitValidForm = () => {
    const normalized = normalizeServerSettings(values);
    const payload: UpdateServerDto = {
      description: normalized.description,
      isDefault,
    };

    if (!isServerLocked) {
      payload.name = normalized.name;
      payload.gamePort = normalized.gamePort;
      payload.rconPort = normalized.rconPort;
      payload.rconIp = normalized.rconIp;
      payload.installPath = normalized.installPath;
      const trimmedMission = missionPath.trim();
      if (trimmedMission) {
        payload.missionPath = trimmedMission;
      }
      payload.launchParameters = normalized.launchParameters;

      if (normalized.rconPassword !== (detail.rconPassword ?? null)) {
        payload.rconPassword = normalized.rconPassword;
      }
    }

    onSave(payload, {
      onSaved: saved => {
        markSaved();
        const nextRcon = saved.rconPassword ?? '';
        prevDetailRconRef.current = nextRcon;
        setRconPassword(nextRcon);
        prevDetailMissionRef.current = saved.missionPath;
        setMissionPath(saved.missionPath);
      },
      onError: reportServerErrors,
    });
  };

  return (
    <form
      id="server-settings-form"
      ref={registerForm}
      noValidate
      onSubmit={e => handleSubmit(e, submitValidForm)}
      className="space-y-6"
    >
      {isServerLocked && (
        <Notice variant="warning" title="Server is Active — Configuration Locked">
          This server is currently <strong className="uppercase">{detail.status}</strong>. Server
          identity, network settings, credentials, file paths, and launch parameters are locked to
          prevent runtime state corruption. Only description and default instance assignment may be
          changed while active.
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
              disabled={isServerLocked}
              error={errors.name}
              onChange={e => {
                setName(e.target.value);
              }}
            />
            <Input
              label="Description"
              placeholder="Instance notes or purpose"
              value={description}
              error={errors.description}
              onChange={e => {
                setDescription(e.target.value);
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

      {/* Network & BattlEye RCON Card */}
      <Card
        title="Network & BattlEye RCON"
        subtitle="UDP listening port for DayZ game engine and BattlEye RCON configuration"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Game Port (UDP)"
              type="number"
              value={gamePort}
              disabled={isServerLocked}
              error={errors.gamePort}
              onChange={e => {
                setGamePort(Number(e.target.value));
              }}
            />
            <Input
              label="BattlEye RCON Port"
              type="number"
              value={rconPort}
              disabled={isServerLocked}
              error={errors.rconPort}
              onChange={e => {
                setRconPort(Number(e.target.value));
              }}
            />
            <Input
              label="BattlEye RCON Bind IP"
              type="text"
              placeholder="127.0.0.1"
              value={rconIp}
              disabled={isServerLocked}
              error={errors.rconIp}
              onChange={e => {
                setRconIp(e.target.value);
              }}
            />
            <PasswordInput
              id="server-rcon-password"
              label="BattlEye RCON Password"
              placeholder="Min 6 characters"
              value={rconPassword}
              disabled={isServerLocked}
              error={errors.rconPassword}
              onChange={e => {
                setRconPassword(e.target.value);
              }}
            />
          </div>
          {isServerLocked && (
            <p className="text-xs text-[var(--color-text-muted)] italic">
              Network ports, RCON bind IP, and RCON password cannot be altered while the server
              process is active.
            </p>
          )}
        </div>
      </Card>

      {/* Storage & Paths Card */}
      <StoragePathsCard
        installPath={installPath}
        missionPath={missionPath}
        isServerLocked={isServerLocked}
        isValidating={validatePathsMutation.isPending}
        installPathError={errors.installPath}
        missionPathError={errors.missionPath}
        validationResult={validationResult}
        onChangeInstallPath={value => {
          setInstallPath(value);
        }}
        onMissionPathChange={value => {
          setMissionPath(value);
        }}
        onValidatePaths={handleValidatePaths}
      />

      {/* Engine Launch Flags */}
      <Card
        title="Engine Launch Parameters"
        subtitle="Command-line flags passed directly to DayZServer_x64 on startup"
      >
        <div className="p-6 space-y-4">
          <Input
            label="CLI Arguments"
            value={launchParameters}
            disabled={isServerLocked}
            placeholder="-cpuCount=4 -doLogs -adminLog -netLog"
            onChange={e => setLaunchParameters(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Specify system flags such as <code className="font-mono text-xs">-cpuCount=4</code>,{' '}
            <code className="font-mono text-xs">-doLogs</code>, or custom memory limit flags.
          </p>
        </div>
      </Card>
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
  const [formHasChanges, setFormHasChanges] = useState(false);
  const updateInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);

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

      // Edits to a deleted server cannot be saved anymore; leave without the discard prompt.
      const nextServer = servers.find(s => s.id !== deletedId);
      if (nextServer) {
        setActiveServerId(nextServer.id, { ignoreBlocker: true });
      } else {
        navigate({
          to: '/dashboard',
          ignoreBlocker: true,
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
    onSettled: () => {
      deleteInFlightRef.current = false;
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
      notifySuccess('SERVER_UPDATED', { name: updatedServer.name });
    },
    onError: (err: Error) => {
      notifyApiError(err, 'Update Failed');
    },
    onSettled: () => {
      updateInFlightRef.current = false;
    },
  });

  const handleSave = (payload: UpdateServerDto, callbacks: ServerSaveCallbacks) => {
    if (updateMutation.isPending || updateInFlightRef.current) return;
    updateInFlightRef.current = true;
    updateMutation.mutate(payload, { onSuccess: callbacks.onSaved, onError: callbacks.onError });
  };

  const handleConfirmDelete = () => {
    if (deleteMutation.isPending || deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    deleteMutation.mutate();
  };

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
              Manage ports, execution flags, BattlEye RCON, file paths, and serverDZ.cfg for{' '}
              <span className="font-semibold text-[var(--color-text-main)]">{detail.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
              Add new server
            </Button>
            <SaveButton
              type="submit"
              form="server-settings-form"
              leftIcon={Save}
              hasChanges={formHasChanges}
              isPending={updateMutation.isPending}
            >
              Save changes
            </SaveButton>
          </div>
        </div>

        {/* Structured Configuration Form */}
        <ServerSettingsForm
          key={`form-${detail.id}`}
          detail={detail}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
          onHasChangesChange={setFormHasChanges}
        />

        <ServerConfigCard
          key={`config-${detail.id}`}
          serverId={detail.id}
          serverName={detail.name}
          isServerRunning={isServerLocked}
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
            onConfirm={handleConfirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {/* Create Server Modal */}
        <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </div>
    </PageContainer>
  );
}
