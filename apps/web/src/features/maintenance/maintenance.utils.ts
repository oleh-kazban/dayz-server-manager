import {
  type LaunchCommandPreviewDto,
  SERVER_STATUS,
  type ServerPendingStopDto,
  type ServerStatus,
} from '@aegis/api-contracts';

import type { GracefulStopKind } from './graceful-stop.copy';

export interface StartReadinessInput {
  status: ServerStatus;
  /** Launch command preview with the edit lock; `undefined` while it loads. */
  preview: LaunchCommandPreviewDto | undefined;
  /** The preview request failed; the server still validates on start. */
  previewFailed: boolean;
}

/**
 * Why the server cannot be started right now (DSM-00169), or `null` when Start is allowed.
 * The server enforces the same rules; this only explains them before the click.
 */
export function getStartBlocker({
  status,
  preview,
  previewFailed,
}: StartReadinessInput): string | null {
  if (status === SERVER_STATUS.RUNNING) {
    return 'The server is already running.';
  }
  if (status === SERVER_STATUS.STARTING) {
    return 'The server is already starting.';
  }
  if (status === SERVER_STATUS.STOPPING) {
    return 'The server is stopping. Wait until it has stopped.';
  }
  if (previewFailed) {
    return null;
  }
  if (!preview) {
    return 'Checking whether the server can start…';
  }
  if (preview.editLock) {
    return `serverDZ.cfg is being edited by ${preview.editLock.holderName}. Start is available once editing ends.`;
  }
  if (!preview.command.ready) {
    const issue = preview.command.issues.find(item => item.severity === 'error');
    return issue
      ? `The launch command is not ready: ${issue.message}`
      : 'The launch command is not ready.';
  }
  return null;
}

/**
 * Why the server cannot be force-stopped (DSM-00170), or `null` when it can. Force-stop also
 * works while `stopping`: it is the way out of a graceful stop that does not finish.
 */
export function getForceStopBlocker(status: ServerStatus): string | null {
  if (status === SERVER_STATUS.STOPPED || status === SERVER_STATUS.FAILED) {
    return 'The server is not running.';
  }
  return null;
}

export interface GracefulStopState {
  kind: GracefulStopKind;
  status: ServerStatus;
  pendingStop: ServerPendingStopDto | null | undefined;
  /** The pending stop / current stop is part of a restart (DSM-00168). */
  restartRequested: boolean;
}

/**
 * Why the server cannot be stopped or restarted gracefully (DSM-00171/00172), or `null` when it
 * can. A scheduled stop or restart has to be cancelled before another one is chosen.
 */
export function getGracefulStopBlocker({
  kind,
  status,
  pendingStop,
  restartRequested,
}: GracefulStopState): string | null {
  if (status === SERVER_STATUS.STARTING) {
    return 'The server is still starting. Wait until it is running.';
  }
  if (status === SERVER_STATUS.STOPPING) {
    return restartRequested
      ? 'The server is restarting. It starts again once it has stopped.'
      : 'The server is already stopping.';
  }
  if (status !== SERVER_STATUS.RUNNING) {
    return kind === 'restart'
      ? 'The server is not running. Use Start instead.'
      : 'The server is not running.';
  }
  if (pendingStop) {
    return restartRequested
      ? 'A restart is already scheduled. Cancel it to choose another time.'
      : 'A stop is already scheduled. Cancel it to choose another time.';
  }
  return null;
}

/** Whether a pending stop belongs to this tile: a scheduled restart to Restart, else to Stop. */
export function ownsPendingStop(kind: GracefulStopKind, restartRequested: boolean): boolean {
  return (kind === 'restart') === restartRequested;
}

/** "4:05" or "1:00:00" until a scheduled stop; never negative. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** Label of a delay preset in the Stop dialog. */
export function formatDelayPreset(delaySec: number): string {
  if (delaySec === 0) {
    return 'Now';
  }
  return `${delaySec / 60} min`;
}

/** "PID 4242 · started 17 Nov 2026, 10:00" for the process summary line. */
export function formatRuntime(runtime: { pid: number; startedAt: string }): string {
  return `PID ${runtime.pid} · started ${new Date(runtime.startedAt).toLocaleString()}`;
}
