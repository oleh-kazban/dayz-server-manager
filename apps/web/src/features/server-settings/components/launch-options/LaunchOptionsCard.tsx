import { useQuery } from '@tanstack/react-query';

import { compileLaunchCommand } from '@aegis/dayz-config';
import { Card, Input, Notice, Skeleton, Toggle } from '@aegis/ui';
import { serverQueries } from '@aegis/web/core';

import { CompiledCommandPanel } from './CompiledCommandPanel';
import {
  LAUNCH_BOOLEAN_OPTIONS,
  LAUNCH_OPTION_FIELD_ERROR_KEYS,
  type LaunchOptionsFormState,
  toLaunchOptionsDto,
} from './launch-options.utils';

export interface LaunchOptionsCardProps {
  serverId: string;
  /** Current (possibly unsaved) form values the preview is compiled from. */
  installPath: string;
  profilePath: string;
  gamePort: number;
  value: LaunchOptionsFormState;
  onChange: (next: LaunchOptionsFormState) => void;
  errors: Partial<Record<string, string>>;
  disabled: boolean;
  /** True while the settings form differs from the saved server. */
  hasUnsavedChanges: boolean;
}

export function LaunchOptionsCard({
  serverId,
  installPath,
  profilePath,
  gamePort,
  value,
  onChange,
  errors,
  disabled,
  hasUnsavedChanges,
}: LaunchOptionsCardProps) {
  // Platform and mod folders come from the server; everything else is compiled locally with the
  // same shared compiler the backend and process supervisor use, so the preview tracks edits.
  const contextQuery = useQuery(serverQueries.launchCommand(serverId));
  const context = contextQuery.data;

  const command = context
    ? compileLaunchCommand({
        platform: context.platform,
        installPath,
        profilePath,
        gamePort,
        launchOptions: toLaunchOptionsDto(value),
        mods: context.mods,
      })
    : null;

  const update = (patch: Partial<LaunchOptionsFormState>) => onChange({ ...value, ...patch });

  return (
    <Card
      title="Engine Launch Parameters"
      subtitle="Options passed to the DayZ server executable on startup"
    >
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="launch-cpu-count"
            label="CPU Count"
            type="number"
            inputMode="numeric"
            value={value.cpuCount}
            placeholder="Engine default"
            disabled={disabled}
            error={errors[LAUNCH_OPTION_FIELD_ERROR_KEYS.cpuCount]}
            onChange={e => update({ cpuCount: e.target.value })}
          />
          <Input
            id="launch-limit-fps"
            label="FPS Limit"
            type="number"
            inputMode="numeric"
            value={value.limitFPS}
            placeholder="Engine default"
            disabled={disabled}
            error={errors[LAUNCH_OPTION_FIELD_ERROR_KEYS.limitFPS]}
            onChange={e => update({ limitFPS: e.target.value })}
          />
        </div>

        <p className="-mt-3 text-xs text-[var(--color-text-muted)]">
          <code className="font-mono">-cpuCount</code> limits the CPU cores the server uses (1–64);{' '}
          <code className="font-mono">-limitFPS</code> caps the server simulation rate (1–200).
          Leave empty for the engine default.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {LAUNCH_BOOLEAN_OPTIONS.map(option => (
            <Toggle
              key={option.key}
              id={`launch-${option.key}`}
              checked={value[option.key]}
              disabled={disabled}
              color={option.key === 'filePatching' ? 'danger' : 'primary'}
              label={
                <span>
                  {option.label} <code className="font-mono text-xs">{option.flag}</code>
                </span>
              }
              description={option.description}
              onChange={e => update({ [option.key]: e.target.checked })}
            />
          ))}
        </div>

        {contextQuery.isPending && (
          <div aria-label="Loading compiled command" className="space-y-2">
            <Skeleton width={160} height={16} />
            <Skeleton height={96} />
          </div>
        )}
        {contextQuery.isError && (
          <Notice variant="error" title="Compiled command unavailable">
            The launch command preview could not be loaded. Saving launch options still works.
          </Notice>
        )}
        {command && <CompiledCommandPanel command={command} isUnsaved={hasUnsavedChanges} />}
      </div>
    </Card>
  );
}
