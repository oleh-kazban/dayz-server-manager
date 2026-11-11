import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';

export const modsQueryKeys = {
  all: ['mods'] as const,
  list: (serverId: string) => [...modsQueryKeys.all, 'list', serverId] as const,
};

export const modsQueries = {
  list: (serverId: string) =>
    queryOptions({
      queryKey: modsQueryKeys.list(serverId),
      queryFn: () => apiClient.mods.list(serverId),
      enabled: Boolean(serverId),
    }),
};
