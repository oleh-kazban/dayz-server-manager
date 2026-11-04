import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';

import { apiClient } from '@dsm/api-client';
import type { ServerDetailDto, ServerStatus, UpdateServerDto } from '@dsm/api-contracts';
import {
  Button,
  Card,
  Input,
  KeywordConfirmation,
  Notice,
  PasswordInput,
  StatusTag,
  type StatusTagStatus,
  Toggle,
} from '@dsm/ui';
import { serverQueries, serverQueryKeys, useActiveServer } from '@dsm/web/core';

import { CreateServerModal } from './CreateServerModal';

function mapServerStatusToTag(status: ServerStatus): { status: StatusTagStatus; label: string } {
  switch (status) {
    case 'running':
      return { status: 'online', label: 'Running' };
    case 'starting':
      return { status: 'restarting', label: 'Starting' };
    case 'stopping':
      return { status: 'restarting', label: 'Stopping' };
    case 'failed':
      return { status: 'danger', label: 'Failed' };
    case 'stopped':
    default:
      return { status: 'stopped', label: 'Stopped' };
  }
}

interface ServerSettingsFormProps {
  detail: ServerDetailDto;
  onSave: (payload: UpdateServerDto) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
}

function ServerSettingsForm({
  detail,
  onSave,
  isSaving,
  saveSuccess,
  saveError,
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

  const isServerLocked = detail.status !== 'stopped';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <Notice variant="success" title="Settings Saved">
          Server configuration updated successfully.
        </Notice>
      )}

      {saveError && (
        <Notice variant="error" title="Update Failed">
          {saveError}
        </Notice>
      )}

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
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Description"
              placeholder="Instance notes or purpose"
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              onChange={e => setGamePort(Number(e.target.value))}
              required
            />
            <Input
              label="Steam Query Port (A2S)"
              type="number"
              value={queryPort}
              disabled={isServerLocked}
              onChange={e => setQueryPort(Number(e.target.value))}
              required
            />
            <Input
              label="BattlEye RCON Port"
              type="number"
              value={rconPort}
              disabled={isServerLocked}
              onChange={e => setRconPort(Number(e.target.value))}
              required
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
            onChange={e => setRconPassword(e.target.value)}
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
            onChange={e => setInstallPath(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Profile Path"
              value={profilePath}
              disabled={isServerLocked}
              onChange={e => setProfilePath(e.target.value)}
              required
            />
            <Input
              label="Mission Path"
              value={missionPath}
              disabled={isServerLocked}
              onChange={e => setMissionPath(e.target.value)}
              required
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Detail query for active server
  const {
    data: detail,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery(serverQueries.detail(activeServerId ?? ''));

  const isServerLocked = detail ? detail.status !== 'stopped' : false;
  const isDeleteDisabled = !detail || isServerLocked;

  // Save Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateServerDto) => {
      if (!activeServerId) throw new Error('No active server selected');
      return apiClient.servers.update(activeServerId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.all });
      setSaveSuccess(true);
      setSaveError(null);
    },
    onError: (err: Error) => {
      setSaveSuccess(false);
      setSaveError(err.message || 'Failed to update server settings');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!activeServerId) throw new Error('No active server selected');
      return apiClient.servers.delete(activeServerId);
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.all });
      const nextServer = servers.find(s => s.id !== activeServerId);
      if (nextServer) {
        setActiveServerId(nextServer.id);
      } else {
        navigate({ to: '/dashboard' });
      }
    },
    onError: (err: Error) => {
      setShowDeleteConfirm(false);
      setSaveError(err.message || 'Failed to delete server');
    },
  });

  if (isServersLoading || isDetailLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[var(--color-surface-subtle)] animate-pulse rounded" />
        <div className="h-48 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
        <div className="h-64 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Notice variant="info" title="No Servers Registered">
          There are currently no DayZ servers registered in DayZ Server Manager. Create your first
          server instance to manage its settings.
        </Notice>
        <div className="pt-2">
          <Button variant="primary" leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
            Add DayZ Server
          </Button>
        </div>
        <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </div>
    );
  }

  if (detailError || !activeServer || !detail) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Notice variant="error" title="Server Not Found">
          Unable to load configuration for the selected server. It may have been deleted or the ID
          is invalid.
        </Notice>
      </div>
    );
  }

  const statusTagInfo = mapServerStatusToTag(detail.status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
              Server Settings
            </h1>
            <StatusTag status={statusTagInfo.status} label={statusTagInfo.label} />
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
        saveSuccess={saveSuccess}
        saveError={saveError}
      />

      {/* Danger Zone */}
      <div className="rounded-2xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/5 p-6 space-y-4">
        <div className="flex items-center gap-3 text-[var(--color-error)]">
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
              <p className="mt-1 text-xs text-[var(--color-error)] font-medium">
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
  );
}
