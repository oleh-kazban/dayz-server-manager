import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, X } from 'lucide-react';

import { apiClient } from '@dsm/api-client';
import type { CreateServerDto } from '@dsm/api-contracts';
import { Button, Input, Notice, PasswordInput, Toggle } from '@dsm/ui';
import { serverQueryKeys, useActiveServer } from '@dsm/web/core';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (dto: CreateServerDto) => apiClient.servers.create(dto),
    onSuccess: newServer => {
      queryClient.invalidateQueries({ queryKey: serverQueryKeys.all });
      setActiveServerId(newServer.id);
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to create server instance.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Server name is required.');
      return;
    }
    if (!installPath.trim() || !profilePath.trim() || !missionPath.trim()) {
      setErrorMessage('All file storage paths are required.');
      return;
    }
    if (gamePort === queryPort || gamePort === rconPort || queryPort === rconPort) {
      setErrorMessage('Game port, query port, and RCON port must all be distinct.');
      return;
    }

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

        {errorMessage && (
          <div className="mt-4">
            <Notice variant="error" title="Creation Error">
              {errorMessage}
            </Notice>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Server Name"
              placeholder="e.g. DayZ Namalsk Hardcore"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Description"
              placeholder="Optional summary or notes"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Game Port"
              type="number"
              value={gamePort}
              onChange={e => setGamePort(Number(e.target.value))}
              required
            />
            <Input
              label="Query Port (A2S)"
              type="number"
              value={queryPort}
              onChange={e => setQueryPort(Number(e.target.value))}
              required
            />
            <Input
              label="RCON Port"
              type="number"
              value={rconPort}
              onChange={e => setRconPort(Number(e.target.value))}
              required
            />
          </div>

          <PasswordInput
            label="RCON Password"
            placeholder="Min 6 characters"
            value={rconPassword}
            onChange={e => setRconPassword(e.target.value)}
          />

          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Storage & Paths
            </h3>
            <Input
              label="Installation Path"
              placeholder="e.g. C:\DayZServer"
              value={installPath}
              onChange={e => setInstallPath(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Profile Path"
                placeholder="e.g. C:\DayZServer\profiles"
                value={profilePath}
                onChange={e => setProfilePath(e.target.value)}
                required
              />
              <Input
                label="Mission Path"
                placeholder="e.g. mpmissions\dayzOffline.chernarusplus"
                value={missionPath}
                onChange={e => setMissionPath(e.target.value)}
                required
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
