import { FolderSearch } from 'lucide-react';

import type {
  DiscoveredMissionDto,
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
  StatusTag,
  type StatusTagSemanticStatus,
  Tag,
} from '@aegis/ui';
import { resolveServerFsIssueMessage } from '@aegis/web/core';

export interface StoragePathsCardProps {
  installPath: string;
  profilePath: string;
  missionPath: string;
  isServerLocked: boolean;
  isValidating: boolean;
  installPathError?: string;
  profilePathError?: string;
  missionPathError?: string;
  validationResult: ValidateServerPathsResponseDto | null;
  onChangeInstallPath: (value: string) => void;
  onChangeProfilePath: (value: string) => void;
  onChangeMissionPath: (value: string) => void;
  onSelectMission: (relativePath: string) => void;
  onValidatePaths: () => void;
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

function PathDiagnosticSummary({
  label,
  status,
  issues,
}: {
  label: string;
  status: ServerFsPathStatusDto;
  issues: ServerFsDiagnosticIssueDto[];
}) {
  const presentation = STATUS_TAG_PRESENTATION[status.status];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text-main)]">{label}</span>
        <StatusTag status={presentation.status} label={presentation.label} />
      </div>

      {status.resolvedPath && (
        <p className="text-[11px] font-mono text-[var(--color-text-muted)] break-all">
          {status.resolvedPath}
        </p>
      )}

      {status.target === 'installPath' && status.executablePath && (
        <p className="text-[11px] font-mono text-[var(--color-text-secondary)] break-all">
          Executable: {status.executablePath}
        </p>
      )}

      {status.target === 'missionPath' &&
        status.exists &&
        status.isDirectory &&
        typeof status.hasInitScript === 'boolean' &&
        typeof status.hasEconomyDb === 'boolean' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag variant="subtle" color={status.hasInitScript ? 'success' : 'danger'} mono>
              init.c {status.hasInitScript ? 'present' : 'missing'}
            </Tag>
            <Tag variant="subtle" color={status.hasEconomyDb ? 'success' : 'warning'} mono>
              db/ {status.hasEconomyDb ? 'present' : 'missing'}
            </Tag>
          </div>
        )}

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

function DiscoveredMissionsSection({
  missions,
  currentMissionPath,
  isServerLocked,
  onSelectMission,
}: {
  missions: DiscoveredMissionDto[];
  currentMissionPath: string;
  isServerLocked: boolean;
  onSelectMission: (relativePath: string) => void;
}) {
  const normalizedCurrent = currentMissionPath.trim().replaceAll('\\', '/');

  return (
    <div className="pt-2 border-t border-[var(--color-border)] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">
          Discovered Missions
        </span>
        <Tag variant="subtle" color="default">
          {missions.length} found
        </Tag>
      </div>

      {missions.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          No missions discovered under <code className="font-mono">mpmissions/</code>. You can still
          enter a mission path manually above.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {missions.map(mission => {
            const isSelected =
              normalizedCurrent === mission.relativePath || normalizedCurrent === mission.name;
            return (
              <button
                key={mission.relativePath}
                type="button"
                disabled={isServerLocked}
                aria-pressed={isSelected}
                onClick={() => onSelectMission(mission.relativePath)}
                className={`flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isSelected
                    ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                    {mission.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tag variant="subtle" color={mission.hasInitScript ? 'success' : 'danger'} mono>
                      init.c {mission.hasInitScript ? '✓' : '✗'}
                    </Tag>
                    <Tag variant="subtle" color={mission.hasEconomyDb ? 'success' : 'warning'} mono>
                      db/ {mission.hasEconomyDb ? '✓' : '✗'}
                    </Tag>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] break-all">
                  {mission.relativePath}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StoragePathsCard({
  installPath,
  profilePath,
  missionPath,
  isServerLocked,
  isValidating,
  installPathError,
  profilePathError,
  missionPathError,
  validationResult,
  onChangeInstallPath,
  onChangeProfilePath,
  onChangeMissionPath,
  onSelectMission,
  onValidatePaths,
}: StoragePathsCardProps) {
  const issuesByTarget = validationResult
    ? groupIssuesByTarget(validationResult.issues)
    : undefined;

  return (
    <Card
      title="Storage & File System Paths"
      subtitle="Host machine directory paths for DayZ executable, profiles, and mission templates"
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
            <PathDiagnosticSummary
              label="Installation & Executable"
              status={validationResult.paths.installPath}
              issues={issuesByTarget.installPath}
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              id="server-profile-path"
              label="Profile Path"
              placeholder="e.g. profiles"
              value={profilePath}
              disabled={isServerLocked}
              error={profilePathError}
              onChange={e => onChangeProfilePath(e.target.value)}
            />
            {validationResult && issuesByTarget && (
              <>
                <PathDiagnosticSummary
                  label="Profile Directory"
                  status={validationResult.paths.profilePath}
                  issues={issuesByTarget.profilePath}
                />
                <PathDiagnosticSummary
                  label="BattlEye Directory"
                  status={validationResult.paths.battleyePath}
                  issues={issuesByTarget.battleyePath}
                />
              </>
            )}
          </div>

          <div className="space-y-2">
            <Input
              id="server-mission-path"
              label="Mission Path"
              placeholder="e.g. mpmissions\dayzOffline.chernarusplus"
              value={missionPath}
              disabled={isServerLocked}
              error={missionPathError}
              onChange={e => onChangeMissionPath(e.target.value)}
            />
            {validationResult && issuesByTarget && (
              <PathDiagnosticSummary
                label="Mission Directory"
                status={validationResult.paths.missionPath}
                issues={issuesByTarget.missionPath}
              />
            )}
          </div>
        </div>

        {validationResult && (
          <DiscoveredMissionsSection
            missions={validationResult.discoveredMissions}
            currentMissionPath={missionPath}
            isServerLocked={isServerLocked}
            onSelectMission={onSelectMission}
          />
        )}
      </div>
    </Card>
  );
}
