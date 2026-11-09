import { isServerActiveStatus, type ServerStatus } from '@aegis/api-contracts';
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
