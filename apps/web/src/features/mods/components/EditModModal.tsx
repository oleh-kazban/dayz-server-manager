import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  MOD_LOAD_TARGET,
  type ModLoadTarget,
  type ServerModDto,
  type UpdateServerModDto,
} from '@aegis/api-contracts';
import { Button, Input, Select, type SelectOption } from '@aegis/ui';
import {
  extractApiFieldErrors,
  notifyApiError,
  notifySuccess,
  resolveFieldErrors,
} from '@aegis/web/core';

import { modsQueryKeys } from '../mods.queries';

export interface EditModModalProps {
  isOpen: boolean;
  mod: ServerModDto | null;
  serverId: string;
  isServerLocked: boolean;
  onClose: () => void;
}

const PHASE_1_LOAD_TARGET_OPTIONS: SelectOption<ModLoadTarget>[] = [
  { value: MOD_LOAD_TARGET.CLIENT_SERVER, label: 'Client & Server (-mod=)' },
  { value: MOD_LOAD_TARGET.SERVER_ONLY, label: 'Server Only (-serverMod=)' },
];

function validateEditModForm(name: string, folderName: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedName = name.trim();
  const trimmedFolder = folderName.trim();

  if (!trimmedName) {
    errors.name = 'Mod name is required.';
  }

  if (!trimmedFolder) {
    errors.folderName = 'Mod folder name is required.';
  } else if (!trimmedFolder.startsWith('@') || trimmedFolder.length < 2) {
    errors.folderName = 'Mod folder name must start with @ and include at least one character.';
  } else if (trimmedFolder.includes('..') || /[;/\\\0]/.test(trimmedFolder)) {
    errors.folderName = 'Mod folder name contains forbidden characters.';
  }

  return errors;
}

function EditModForm({
  mod,
  serverId,
  isServerLocked,
  onClose,
}: {
  mod: ServerModDto;
  serverId: string;
  isServerLocked: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(mod.name);
  const [folderName, setFolderName] = useState(mod.folderName);
  const [loadTarget, setLoadTarget] = useState<ModLoadTarget>(mod.loadTarget);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const targetOptions: SelectOption<ModLoadTarget>[] =
    mod.loadTarget === MOD_LOAD_TARGET.CLIENT_OPTIONAL
      ? [
          ...PHASE_1_LOAD_TARGET_OPTIONS,
          { value: MOD_LOAD_TARGET.CLIENT_OPTIONAL, label: 'Client Optional (Legacy)' },
        ]
      : PHASE_1_LOAD_TARGET_OPTIONS;

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateServerModDto) => apiClient.mods.update(serverId, mod.id, dto),
    onSuccess: updated => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MOD_UPDATED', { name: updated.name });
      onClose();
    },
    onError: (err: Error) => {
      const resolved = resolveFieldErrors(extractApiFieldErrors(err));
      if (Object.keys(resolved).length > 0) {
        setFieldErrors(resolved);
        return;
      }
      notifyApiError(err, 'Failed to Update Mod');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateEditModForm(name, folderName);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    updateMutation.mutate({
      name: name.trim(),
      folderName: folderName.trim(),
      loadTarget,
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
      <Input
        label="Mod Name"
        value={name}
        disabled={isServerLocked}
        error={fieldErrors.name}
        onChange={e => {
          setName(e.target.value);
          clearFieldError('name');
        }}
      />

      <div className="space-y-1">
        <Input
          label="@Folder Name"
          placeholder="@CF"
          value={folderName}
          disabled={isServerLocked}
          error={fieldErrors.folderName}
          onChange={e => {
            setFolderName(e.target.value);
            clearFieldError('folderName');
          }}
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Must begin with @ and match the mod directory name on disk.
        </p>
      </div>

      <Select
        label="Load Target"
        options={targetOptions}
        value={loadTarget}
        disabled={isServerLocked}
        onChange={val => {
          if (val) {
            setLoadTarget(val);
          }
        }}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isServerLocked}
          isLoading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export function EditModModal({
  isOpen,
  mod,
  serverId,
  isServerLocked,
  onClose,
}: EditModModalProps) {
  if (!isOpen || !mod) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-mod-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="edit-mod-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                Edit Mod Configuration
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Update display name, <code className="font-mono">@folderName</code>, and launch
                target
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

        <EditModForm
          key={mod.id}
          mod={mod}
          serverId={serverId}
          isServerLocked={isServerLocked}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
