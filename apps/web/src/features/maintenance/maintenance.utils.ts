import {
  type LaunchCommandPreviewDto,
  SERVER_STATUS,
  type ServerStatus,
} from '@aegis/api-contracts';

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

/** "PID 4242 · started 17 Nov 2026, 10:00" for the process summary line. */
export function formatRuntime(runtime: { pid: number; startedAt: string }): string {
  return `PID ${runtime.pid} · started ${new Date(runtime.startedAt).toLocaleString()}`;
}
