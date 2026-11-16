import type { QueryClient } from '@tanstack/react-query';

import {
  SERVER_STATUS,
  type ServerDetailDto,
  serverStatusChangedEventSchema,
  type ServerSummaryDto,
} from '@aegis/api-contracts';

import { serverQueryKeys } from '../server/server.queries';

/**
 * Applies `server.status.changed` (DSM-00162/00163) to the query cache: status in the list,
 * status and last exit in the detail (runtime cleared once the process is gone), then refetches
 * the detail for the exact runtime. Invalid payloads and caches never loaded are left alone.
 */
export function applyServerStatusChanged(queryClient: QueryClient, data: unknown): void {
  const parsed = serverStatusChangedEventSchema.safeParse(data);
  if (!parsed.success) {
    return;
  }
  const { serverId, status, lastExit } = parsed.data;
  const processGone = status === SERVER_STATUS.STOPPED || status === SERVER_STATUS.FAILED;

  queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), servers =>
    servers?.map(server => (server.id === serverId ? { ...server, status, lastExit } : server)),
  );

  const detailKey = serverQueryKeys.detail(serverId);
  queryClient.setQueryData<ServerDetailDto>(detailKey, detail =>
    detail ? { ...detail, status, lastExit, runtime: processGone ? null : detail.runtime } : detail,
  );
  void queryClient.invalidateQueries({ queryKey: detailKey, exact: true });
}
