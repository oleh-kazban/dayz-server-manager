import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, X } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  type CreateServerDto,
  rconPasswordSchema,
  serverNameSchema,
  type ServerSummaryDto,
} from '@aegis/api-contracts';
import { Button, Input, PasswordInput, Toggle } from '@aegis/ui';
import {
  notifyApiError,
  notifySuccess,
  serverQueryKeys,
  useActiveServer,
  useEditableForm,
  useModalDialog,
} from '@aegis/web/core';

export interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateServerValidationInput {
  name: string;
  installPath: string;
  gamePort: number;
  rconPort: number;
  rconPassword: string;
}

function validateCreateServerPaths(
  input: CreateServerValidationInput,
  errors: Record<string, string>,
): void {
  if (!input.installPath.trim()) {
    errors.installPath = 'Installation path is required.';
  }
}

function validateCreateServerPorts(
  input: CreateServerValidationInput,
  errors: Record<string, string>,
): void {
  if (!input.gamePort || input.gamePort < 1024 || input.gamePort > 65535) {
    errors.gamePort = 'Port must be between 1024 and 65535.';
  }
  if (!input.rconPort || input.rconPort < 1024 || input.rconPort > 65535) {
    errors.rconPort = 'Port must be between 1024 and 65535.';
  }
  if (input.gamePort === input.rconPort) {
    errors.gamePort = 'Game port and RCON port must be distinct.';
  }
}

function validateCreateServerForm(input: CreateServerValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'Server name is required.';
  } else {
    const nameResult = serverNameSchema.safeParse(input.name.trim());
    if (!nameResult.success) {
      errors.name = nameResult.error.issues[0].message;
    }
  }

  validateCreateServerPaths(input, errors);
  validateCreateServerPorts(input, errors);

  if (input.rconPassword) {
    const rconResult = rconPasswordSchema.safeParse(input.rconPassword);
    if (!rconResult.success) {
      errors.rconPassword = rconResult.error.issues[0].message;
    }
  }

  return errors;
}

function CreateServerDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setActiveServerId } = useActiveServer();
  const inFlightRef = useRef(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gamePort, setGamePort] = useState(2302);
  const [rconPort, setRconPort] = useState(2310);
  const [rconPassword, setRconPassword] = useState('');
  const [installPath, setInstallPath] = useState('C:\\DayZServer');
  const [isDefault, setIsDefault] = useState(false);

  const createMutation = useMutation({
    mutationFn: (dto: CreateServerDto) => apiClient.servers.create(dto),
    onSuccess: newServer => {
      queryClient.setQueryData(serverQueryKeys.detail(newServer.id), newServer);
      // Seed the list before switching: otherwise useActiveServer's URL sync sees an unknown
      // serverId and redirects back to the default server until the refetch lands.
      queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), old =>
        old ? [...old.filter(s => s.id !== newServer.id), newServer] : [newServer],
      );
      void queryClient.invalidateQueries({ queryKey: serverQueryKeys.list() });
      releaseUnsavedChanges();
      setActiveServerId(newServer.id);
      notifySuccess('SERVER_CREATED', { name: newServer.name });
      onClose();
    },
    onError: (err: Error) => {
      reportServerErrors(err);
      notifyApiError(err, 'Failed to create server');
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const {
    registerForm,
    errors: fieldErrors,
    handleSubmit,
    reportServerErrors,
    confirmDiscard,
    releaseUnsavedChanges,
  } = useEditableForm({
    values: {
      name,
      description,
      installPath,
      gamePort,
      rconPort,
      rconPassword,
      isDefault,
    },
    baseline: null,
    validate: validateCreateServerForm,
    isPending: createMutation.isPending,
  });

  const requestClose = () => confirmDiscard(onClose);

  const { dialogRef, handleBackdropClick } = useModalDialog({
    onClose: requestClose,
    isBusy: createMutation.isPending,
  });

  const submitValidForm = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      installPath: installPath.trim(),
      gamePort: Number(gamePort),
      rconPort: Number(rconPort),
      rconPassword: rconPassword || undefined,
      isDefault,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-server-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
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
            onClick={requestClose}
          />
        </div>

        <form
          ref={registerForm}
          noValidate
          onSubmit={e => handleSubmit(e, submitValidForm)}
          className="mt-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Server Name"
              placeholder="e.g. DayZ Namalsk Hardcore"
              value={name}
              error={fieldErrors.name}
              onChange={e => {
                setName(e.target.value);
              }}
            />
            <Input
              label="Description"
              placeholder="Optional summary or notes"
              value={description}
              error={fieldErrors.description}
              onChange={e => {
                setDescription(e.target.value);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Game Port"
              type="number"
              value={gamePort}
              error={fieldErrors.gamePort}
              onChange={e => {
                setGamePort(Number(e.target.value));
              }}
            />
            <Input
              label="RCON Port"
              type="number"
              value={rconPort}
              error={fieldErrors.rconPort}
              onChange={e => {
                setRconPort(Number(e.target.value));
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
              }}
            />
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            New servers start with the default engine launch options (
            <code className="font-mono">-cpuCount=4 -doLogs -adminLog -netLog</code>). Adjust them
            in Server Settings after creation.
          </p>

          <div className="pt-2">
            <Toggle
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              label="Default Instance"
              description="Make this server the primary default instance for the workspace"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button variant="secondary" type="button" onClick={requestClose}>
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

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  if (!isOpen) return null;
  return <CreateServerDialog onClose={onClose} />;
}
