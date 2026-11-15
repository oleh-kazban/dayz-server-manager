import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';

export const serverConfigQueryKeys = {
  all: ['server-config'] as const,
  server: (serverId: string) => [...serverConfigQueryKeys.all, serverId] as const,
  serverDz: (serverId: string) => [...serverConfigQueryKeys.server(serverId), 'server-dz'] as const,
  revisions: (serverId: string) =>
    [...serverConfigQueryKeys.server(serverId), 'revisions'] as const,
  revision: (serverId: string, revisionId: string) =>
    [...serverConfigQueryKeys.server(serverId), 'revision', revisionId] as const,
};

export const serverConfigQueries = {
  serverDz: (serverId: string, getSessionToken: () => string) =>
    queryOptions({
      queryKey: serverConfigQueryKeys.serverDz(serverId),
      queryFn: () => apiClient.serverConfig.getServerDzConfig(serverId, getSessionToken()),
      refetchOnWindowFocus: false,
    }),
  revisions: (serverId: string) =>
    queryOptions({
      queryKey: serverConfigQueryKeys.revisions(serverId),
      queryFn: () => apiClient.serverConfig.listConfigRevisions(serverId),
    }),
  revision: (serverId: string, revisionId: string) =>
    queryOptions({
      queryKey: serverConfigQueryKeys.revision(serverId, revisionId),
      queryFn: () => apiClient.serverConfig.getConfigRevision(serverId, revisionId),
      staleTime: Infinity,
    }),
};
