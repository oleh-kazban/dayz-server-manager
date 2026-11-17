import type { QueryClient } from '@tanstack/react-query';

import { serverStopFailedEventSchema } from '@aegis/api-contracts';

import { serverQueries, type ServerStopFailure } from '../server/server.queries';

/**
 * Applies `server.stop.failed` (DSM-00167/00171): a scheduled stop came due but could not run.
 * The failure is kept per server for the Stop tile to show; no toast (background events never
 * toast, DSM-00173). Invalid payloads are ignored.
 */
export function applyServerStopFailed(queryClient: QueryClient, data: unknown): void {
  const parsed = serverStopFailedEventSchema.safeParse(data);
  if (!parsed.success) {
    return;
  }
  const { serverId, errorCode, message } = parsed.data;
  const failure: ServerStopFailure = { errorCode, message, at: new Date().toISOString() };
  queryClient.setQueryData(serverQueries.stopFailure(serverId).queryKey, failure);
}
