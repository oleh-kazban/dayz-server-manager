import { FolderSearch } from 'lucide-react';

import type {
  ServerFsCheckStatus,
  ServerFsDiagnosticIssueDto,
  ServerFsPathStatusDto,
  ServerFsPathTarget,
  ValidateServerPathsResponseDto,
} from '@aegis/api-contracts';
import {
  Button,
  Card,
  Input,
  Notice,
  Select,
  type SelectOption,
  StatusTag,
  type StatusTagSemanticStatus,
  Tag,
} from '@aegis/ui';
import { resolveServerFsIssueMessage } from '@aegis/web/core';

export interface StoragePathsCardProps {
  installPath: string;
  missionPath: string;
  isServerLocked: boolean;
  isValidating: boolean;
  installPathError?: string;
  missionPathError?: string;
  validationResult: ValidateServerPathsResponseDto | null;
  onChangeInstallPath: (value: string) => void;
  onMissionPathChange: (value: string) => void;
  onValidatePaths: () => void;
}

function trimEdgeSeparators(value: string, trimLeading: boolean): string {
  let start = 0;
  let end = value.length;
  if (trimLeading) {
    while (start < end && (value[start] === '/' || value[start] === '\\')) {
      start += 1;
    }
  }
  while (end > start && (value[end - 1] === '/' || value[end - 1] === '\\')) {
    end -= 1;
  }
  return value.slice(start, end);
}

function joinDerivedPath(basePath: string, ...relativeSegments: string[]): string {
  const trimmedBase = basePath.trim();
  const cleanSegments = relativeSegments
    .map(segment => trimEdgeSeparators(segment.trim(), true))
    .filter(Boolean);
  if (cleanSegments.length === 0) {
    return '';
  }
  const useBackslash = trimmedBase.includes('\\') && !trimmedBase.includes('/');
  const separator = useBackslash ? '\\' : '/';
  const normalizedRelative = cleanSegments
    .join('/')
    .replaceAll('\\', '/')
    .replaceAll('/', separator);
  if (!trimmedBase) {
    return normalizedRelative;
  }
  const cleanBase = trimEdgeSeparators(trimmedBase, false);
  const prefix = cleanBase === '' && trimmedBase.startsWith('/') ? '' : cleanBase;
  return `${prefix}${separator}${normalizedRelative}`;
}

const STATUS_TAG_PRESENTATION: Record<
  ServerFsCheckStatus,
  { status: StatusTagSemanticStatus; label: string }
> = {
  valid: { status: 'success', label: 'Valid' },
  warning: { status: 'warning', label: 'Warning' },
  error: { status: 'danger', label: 'Error' },
  skipped: { status: 'neutral', label: 'Skipped' },
};

function groupIssuesByTarget(
  issues: ServerFsDiagnosticIssueDto[],
): Record<ServerFsPathTarget, ServerFsDiagnosticIssueDto[]> {
  const grouped: Record<ServerFsPathTarget, ServerFsDiagnosticIssueDto[]> = {
    installPath: [],
    profilePath: [],
    battleyePath: [],
    missionPath: [],
  };
  for (const issue of issues) {
    grouped[issue.target].push(issue);
  }
  return grouped;
}

function renderOverallNotice(result: ValidateServerPathsResponseDto) {
  if (!result.valid) {
    return (
      <Notice variant="error" title="Issues Detected">
        One or more configured DayZ paths failed host validation ({result.issues.length} diagnostic
        item{result.issues.length === 1 ? '' : 's'}). Review the highlighted diagnostics below.
      </Notice>
    );
  }

  if (result.issues.length > 0) {
    return (
      <Notice variant="warning" title="Verified with Warnings">
        Required DayZ paths passed validation on{' '}
        <code className="font-mono">{result.platform}</code>, with {result.issues.length}{' '}
        non-blocking warning
        {result.issues.length === 1 ? '' : 's'} to review.
      </Notice>
    );
  }

  return (
    <Notice variant="success" title="Verified">
      Installation, executable, profile, and mission paths are verified on{' '}
      <code className="font-mono">{result.platform}</code>.
    </Notice>
  );
}

/**
 * Compact validation status rendered directly under the field it describes.
 * The field itself already shows the path, so only the status and any extra
 * facts (executable, mission contents, issues) are rendered here.
 */
function PathDiagnostics({
  status,
  issues,
}: {
  status: ServerFsPathStatusDto;
  issues: ServerFsDiagnosticIssueDto[];
}) {
  const presentation = STATUS_TAG_PRESENTATION[status.status];
  const showMissionContents =
    status.target === 'missionPath' &&
    status.exists &&
    status.isDirectory &&
    typeof status.hasInitScript === 'boolean' &&
    typeof status.hasEconomyDb === 'boolean';

  return (
    <div data-testid={`path-diagnostics-${status.target}`} className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusTag status={presentation.status} label={presentation.label} />

        {status.target === 'installPath' && status.executablePath && (
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] break-all">
            Executable: {status.executablePath}
          </span>
        )}

        {showMissionContents && (
          <>
            <Tag variant="subtle" color={status.hasInitScript ? 'success' : 'danger'} mono>
              init.c {status.hasInitScript ? 'present' : 'missing'}
            </Tag>
            <Tag variant="subtle" color={status.hasEconomyDb ? 'success' : 'warning'} mono>
              db/ {status.hasEconomyDb ? 'present' : 'missing'}
            </Tag>
          </>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1">
          {issues.map((issue, idx) => (
            <li
              key={`${issue.code}-${idx}`}
              className={`text-xs leading-snug ${
                issue.severity === 'error'
                  ? 'text-[var(--color-status-danger)]'
                  : 'text-[var(--color-status-warning)]'
              }`}
            >
              {resolveServerFsIssueMessage(issue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoragePathsCard({
  installPath,
  missionPath,
  isServerLocked,
  isValidating,
  installPathError,
  missionPathError,
  validationResult,
  onChangeInstallPath,
  onMissionPathChange,
  onValidatePaths,
}: StoragePathsCardProps) {
  const issuesByTarget = validationResult
    ? groupIssuesByTarget(validationResult.issues)
    : undefined;
  const isValidationCurrent =
    validationResult !== null &&
    validationResult.paths.installPath.configuredPath === installPath.trim();

  const resolvedProfile =
    (isValidationCurrent ? validationResult.paths.profilePath.resolvedPath : null) ??
    (joinDerivedPath(installPath, 'profiles') || '—');
  const resolvedBattleye =
    (isValidationCurrent ? validationResult.paths.battleyePath.resolvedPath : null) ??
    (joinDerivedPath(installPath, 'profiles', 'BattlEye') || '—');

  const normalizedMissionPath = missionPath.trim().replaceAll('\\', '/');
  const discoveredMissions = validationResult?.discoveredMissions ?? [];
  const missionOptions: SelectOption<string>[] = discoveredMissions.map(mission => ({
    value: mission.relativePath,
    label: joinDerivedPath(installPath, mission.relativePath),
  }));
  if (
    normalizedMissionPath &&
    !missionOptions.some(option => option.value === normalizedMissionPath)
  ) {
    missionOptions.unshift({
      value: normalizedMissionPath,
      label: joinDerivedPath(installPath, normalizedMissionPath),
    });
  }

  return (
    <Card
      title="Storage & File System Paths"
      subtitle="Host machine installation directory and derived server data paths"
      actions={
        <Button
          type="button"
          variant="secondary"
          leftIcon={FolderSearch}
          isLoading={isValidating}
          disabled={isValidating}
          onClick={onValidatePaths}
        >
          Validate Paths
        </Button>
      }
    >
      <div className="p-1 sm:p-2 space-y-4">
        {validationResult && renderOverallNotice(validationResult)}

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Input
              id="server-install-path"
              label="Installation Path"
              placeholder="e.g. C:\DayZServer"
              value={installPath}
              disabled={isServerLocked}
              error={installPathError}
              onChange={e => onChangeInstallPath(e.target.value)}
            />
            {validationResult && issuesByTarget && (
              <PathDiagnostics
                status={validationResult.paths.installPath}
                issues={issuesByTarget.installPath}
              />
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--color-text-secondary)]">
              Profile Directory
            </span>
            <p
              data-testid="derived-profile-path"
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 font-mono text-xs text-[var(--color-text-main)] break-all"
            >
              {resolvedProfile}
            </p>
            {validationResult && issuesByTarget && (
              <PathDiagnostics
                status={validationResult.paths.profilePath}
                issues={issuesByTarget.profilePath}
              />
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--color-text-secondary)]">
              BattlEye Directory
            </span>
            <p
              data-testid="derived-battleye-path"
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 font-mono text-xs text-[var(--color-text-main)] break-all"
            >
              {resolvedBattleye}
            </p>
            {validationResult && issuesByTarget && (
              <PathDiagnostics
                status={validationResult.paths.battleyePath}
                issues={issuesByTarget.battleyePath}
              />
            )}
          </div>

          <div className="space-y-2">
            <Select
              id="missionPath"
              name="missionPath"
              label="Active Mission"
              placeholder="Select a mission..."
              emptyText="No missions discovered under mpmissions/"
              disabled={isServerLocked}
              error={missionPathError}
              options={missionOptions}
              value={normalizedMissionPath}
              onChange={value => {
                if (value) {
                  onMissionPathChange(value);
                }
              }}
            />
            {validationResult && issuesByTarget && (
              <PathDiagnostics
                status={validationResult.paths.missionPath}
                issues={issuesByTarget.missionPath}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
