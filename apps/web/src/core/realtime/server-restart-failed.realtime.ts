import type { QueryClient } from '@tanstack/react-query';

import { serverRestartFailedEventSchema } from '@aegis/api-contracts';

import { serverQueries, type ServerRestartFailure } from '../server/server.queries';

/**
 * Applies `server.restart.failed` (DSM-00168/00172): a restart failed in its stop or start phase.
 * Kept per server for the Restart tile; no toast (background events never toast, DSM-00173).
 * Invalid payloads are ignored.
 */
export function applyServerRestartFailed(queryClient: QueryClient, data: unknown): void {
  const parsed = serverRestartFailedEventSchema.safeParse(data);
  if (!parsed.success) {
    return;
  }
  const { serverId, phase, errorCode, message } = parsed.data;
  const failure: ServerRestartFailure = {
    phase,
    errorCode,
    message,
    at: new Date().toISOString(),
  };
  queryClient.setQueryData(serverQueries.restartFailure(serverId).queryKey, failure);
}
