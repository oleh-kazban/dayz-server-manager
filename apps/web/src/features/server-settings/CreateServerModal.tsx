import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, X } from 'lucide-react';

import { apiClient, ApiError } from '@dsm/api-client';
import type { ApiFieldErrorsMap, CreateServerDto } from '@dsm/api-contracts';
import { Button, Input, PasswordInput, Toggle } from '@dsm/ui';
import {
  notifyApiError,
  notifySuccess,
  resolveFieldErrors,
  serverQueryKeys,
  useActiveServer,
} from '@dsm/web/core';

export interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const queryClient = useQueryClient();
  const { setActiveServerId } = useActiveServer();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gamePort, setGamePort] = useState(2302);
  const [queryPort, setQueryPort] = useState(27016);
  const [rconPort, setRconPort] = useState(2310);
  const [rconPassword, setRconPassword] = useState('');
  const [installPath, setInstallPath] = useState('C:\\DayZServer');
  const [profilePath, setProfilePath] = useState('C:\\DayZServer\\profiles');
  const [missionPath, setMissionPath] = useState('mpmissions\\dayzOffline.chernarusplus');
  const [launchParameters, setLaunchParameters] = useState('-cpuCount=4 -doLogs -adminLog -netLog');
  const [isDefault, setIsDefault] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateServerDto) => apiClient.servers.create(dto),
    onSuccess: newServer => {
      queryClient.setQueryData(serverQueryKeys.detail(newServer.id), newServer);
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.list() });
      setActiveServerId(newServer.id);
      notifySuccess('SERVER_CREATED', { name: newServer.name });
      onClose();
    },
    onError: (err: Error) => {
      const rawFieldErrors =
        (typeof ApiError === 'function' && err instanceof ApiError ? err.fieldErrors : undefined) ??
        (err && typeof err === 'object' && 'fieldErrors' in err
          ? (err as { fieldErrors?: ApiFieldErrorsMap }).fieldErrors
          : undefined);

      if (rawFieldErrors) {
        setFieldErrors(resolveFieldErrors(rawFieldErrors));
      }
      notifyApiError(err, 'Failed to create server');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Server name is required.';
    }
    if (!installPath.trim()) {
      errors.installPath = 'Installation path is required.';
    }
    if (!profilePath.trim()) {
      errors.profilePath = 'Profile path is required.';
    }
    if (!missionPath.trim()) {
      errors.missionPath = 'Mission path is required.';
    }
    if (!gamePort || gamePort < 1024 || gamePort > 65535) {
      errors.gamePort = 'Port must be between 1024 and 65535.';
    }
    if (!queryPort || queryPort < 1024 || queryPort > 65535) {
      errors.queryPort = 'Port must be between 1024 and 65535.';
    }
    if (!rconPort || rconPort < 1024 || rconPort > 65535) {
      errors.rconPort = 'Port must be between 1024 and 65535.';
    }
    if (gamePort === queryPort || gamePort === rconPort || queryPort === rconPort) {
      errors.gamePort = 'Game port, query port, and RCON port must all be distinct.';
    }
    if (rconPassword && rconPassword.length < 6) {
      errors.rconPassword = 'RCON password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      installPath: installPath.trim(),
      profilePath: profilePath.trim(),
      missionPath: missionPath.trim(),
      gamePort: Number(gamePort),
      queryPort: Number(queryPort),
      rconPort: Number(rconPort),
      rconPassword: rconPassword || undefined,
      launchParameters: launchParameters.trim() || undefined,
      isDefault,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-server-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="create-server-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                Create DayZ Server
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Register a new managed DayZ Dedicated Server instance
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            onClick={onClose}
          />
        </div>

        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Server Name"
              placeholder="e.g. DayZ Namalsk Hardcore"
              value={name}
              error={fieldErrors.name}
              onChange={e => {
                setName(e.target.value);
                clearFieldError('name');
              }}
            />
            <Input
              label="Description"
              placeholder="Optional summary or notes"
              value={description}
              error={fieldErrors.description}
              onChange={e => {
                setDescription(e.target.value);
                clearFieldError('description');
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Game Port"
              type="number"
              value={gamePort}
              error={fieldErrors.gamePort}
              onChange={e => {
                setGamePort(Number(e.target.value));
                clearFieldError('gamePort');
              }}
            />
            <Input
              label="Query Port (A2S)"
              type="number"
              value={queryPort}
              error={fieldErrors.queryPort}
              onChange={e => {
                setQueryPort(Number(e.target.value));
                clearFieldError('queryPort');
              }}
            />
            <Input
              label="RCON Port"
              type="number"
              value={rconPort}
              error={fieldErrors.rconPort}
              onChange={e => {
                setRconPort(Number(e.target.value));
                clearFieldError('rconPort');
              }}
            />
          </div>

          <PasswordInput
            label="RCON Password"
            placeholder="Min 6 characters"
            value={rconPassword}
            error={fieldErrors.rconPassword}
            onChange={e => {
              setRconPassword(e.target.value);
              clearFieldError('rconPassword');
            }}
          />

          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Storage & Paths
            </h3>
            <Input
              label="Installation Path"
              placeholder="e.g. C:\DayZServer"
              value={installPath}
              error={fieldErrors.installPath}
              onChange={e => {
                setInstallPath(e.target.value);
                clearFieldError('installPath');
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Profile Path"
                placeholder="e.g. C:\DayZServer\profiles"
                value={profilePath}
                error={fieldErrors.profilePath}
                onChange={e => {
                  setProfilePath(e.target.value);
                  clearFieldError('profilePath');
                }}
              />
              <Input
                label="Mission Path"
                placeholder="e.g. mpmissions\dayzOffline.chernarusplus"
                value={missionPath}
                error={fieldErrors.missionPath}
                onChange={e => {
                  setMissionPath(e.target.value);
                  clearFieldError('missionPath');
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]">
            <Input
              label="Launch Parameters"
              placeholder="-cpuCount=4 -doLogs -adminLog -netLog"
              value={launchParameters}
              onChange={e => setLaunchParameters(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Toggle
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              label="Default Instance"
              description="Make this server the primary default instance for the workspace"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Server
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
