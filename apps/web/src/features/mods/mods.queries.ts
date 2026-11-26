import { useCallback } from 'react';

import { queryOptions, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';

export const modsQueryKeys = {
  all: ['mods'] as const,
  list: (serverId: string) => [...modsQueryKeys.all, 'list', serverId] as const,
};

export function useInvalidateMods(serverId: string) {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
  }, [queryClient, serverId]);
}

export const modsQueries = {
  list: (serverId: string) =>
    queryOptions({
      queryKey: modsQueryKeys.list(serverId),
      queryFn: () => apiClient.mods.list(serverId),
      enabled: Boolean(serverId),
    }),
};
