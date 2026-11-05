import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@dsm/api-client';

export const serverQueryKeys = {
  all: ['servers'] as const,
  list: () => [...serverQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...serverQueryKeys.all, 'detail', id] as const,
};

export const serverQueries = {
  list: () =>
    queryOptions({
      queryKey: serverQueryKeys.list(),
      queryFn: () => apiClient.servers.list(),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: serverQueryKeys.detail(id),
      queryFn: () => apiClient.servers.get(id),
      enabled: Boolean(id),
    }),
};
