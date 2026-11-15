import { ApiError } from '@aegis/api-client';
import type {
  ApiErrorCode,
  ConfigDiagnosticDto,
  ConfigRevisionSource,
  ServerDzConfigResponseDto,
} from '@aegis/api-contracts';

import type { ConfigEditorMode, ConfigEditSession } from './server-config.types';

export const CONFIG_LOCK_HEARTBEAT_MS = 30_000;
export const LIVE_DIAGNOSTICS_DEBOUNCE_MS = 250;

export function isApiErrorCode(error: unknown, code: ApiErrorCode): boolean {
  return error instanceof ApiError && error.errorCode === code;
}

export function deriveEditorMode(
  config: ServerDzConfigResponseDto,
  session: ConfigEditSession,
  isServerRunning: boolean,
): ConfigEditorMode {
  if (session.status === 'editing') {
    return { kind: 'editing' };
  }
  if (session.status === 'lost') {
    return { kind: 'lock-lost' };
  }
  const serverRunning = isServerRunning || config.serverRunning;
  if (!config.exists) {
    return { kind: 'missing', serverRunning };
  }
  if (serverRunning) {
    return { kind: 'running' };
  }
  if (config.lock && !config.lock.heldByYou) {
    return {
      kind: 'locked-by-other',
      holderName: config.lock.holderName,
      acquiredAt: config.lock.acquiredAt,
    };
  }
  return { kind: 'viewing' };
}

export function isSessionDirty(session: ConfigEditSession): boolean {
  return session.status === 'editing' && session.draft !== session.baseContent;
}

export function countDiagnostics(diagnostics: readonly ConfigDiagnosticDto[]): {
  errors: number;
  warnings: number;
} {
  const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error').length;
  return { errors, warnings: diagnostics.length - errors };
}

export function formatConfigTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

const REVISION_SOURCE_LABELS: Record<ConfigRevisionSource, string> = {
  editor: 'Saved in editor',
  restore: 'Restored revision',
  template: 'Created from template',
  external: 'Modified outside DSM',
};

export function revisionSourceLabel(source: ConfigRevisionSource): string {
  return REVISION_SOURCE_LABELS[source];
}
