import {
  isServerActiveStatus,
  SERVER_STATUS,
  type ServerLastExitDto,
  type ServerStatus,
} from '@aegis/api-contracts';
import type { StatusTagStatus } from '@aegis/ui';

import { i18n } from '../i18n';

interface ServerStatusVisualMeta {
  tagStatus: StatusTagStatus;
  dotClass: string;
  textClass: string;
}

export interface ServerStatusPresentation extends ServerStatusVisualMeta {
  label: string;
  isActive: boolean;
}

export const SERVER_STATUS_VISUAL_META: Record<ServerStatus, ServerStatusVisualMeta> = {
  running: {
    tagStatus: 'online',
    dotClass: 'bg-[var(--color-success)]',
    textClass: 'text-[var(--color-success)]',
  },
  starting: {
    tagStatus: 'restarting',
    dotClass: 'bg-[var(--color-warning)] animate-pulse',
    textClass: 'text-[var(--color-warning)]',
  },
  stopping: {
    tagStatus: 'restarting',
    dotClass: 'bg-[var(--color-warning)]',
    textClass: 'text-[var(--color-warning)]',
  },
  failed: {
    tagStatus: 'danger',
    dotClass: 'bg-[var(--color-danger)]',
    textClass: 'text-[var(--color-danger)]',
  },
  stopped: {
    tagStatus: 'stopped',
    dotClass: 'bg-[var(--color-text-muted)]',
    textClass: 'text-[var(--color-text-muted)]',
  },
};

export function getServerStatusPresentation(status: ServerStatus): ServerStatusPresentation {
  return {
    ...SERVER_STATUS_VISUAL_META[status],
    label: i18n.t(`serverStatus.${status}`),
    isActive: isServerActiveStatus(status),
  };
}

export interface ServerExitPresentation {
  /** Short label, e.g. "Crashed (exit 1)". */
  label: string;
  /** Full sentence for tooltips and screen readers, including the time. */
  description: string;
}

function exitDetail(lastExit: ServerLastExitDto): string | null {
  if (lastExit.signal) {
    return lastExit.signal;
  }
  return lastExit.exitCode === null ? null : `exit ${lastExit.exitCode}`;
}

/**
 * Why the server is `failed` (DSM-00164): only unexpected exits are explained in the shell, so
 * this returns `null` for any other status or when no exit was recorded.
 */
export function getServerExitPresentation(
  status: ServerStatus,
  lastExit: ServerLastExitDto | null,
): ServerExitPresentation | null {
  if (status !== SERVER_STATUS.FAILED || !lastExit) {
    return null;
  }
  const reason = i18n.t(`serverExitReason.${lastExit.reason}`);
  const detail = exitDetail(lastExit);
  const label = detail ? `${reason} (${detail})` : reason;
  const at = new Date(lastExit.at).toLocaleString();
  return { label, description: `${label} at ${at}` };
}
