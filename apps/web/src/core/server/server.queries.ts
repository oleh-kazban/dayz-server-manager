import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';

export const serverQueryKeys = {
  all: ['servers'] as const,
  list: () => [...serverQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...serverQueryKeys.all, 'detail', id] as const,
  launchCommand: (id: string) => [...serverQueryKeys.all, 'launch-command', id] as const,
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
  /** Launch context (platform, mod folders) and the saved compiled command (DSM-00125). */
  launchCommand: (id: string) =>
    queryOptions({
      queryKey: serverQueryKeys.launchCommand(id),
      queryFn: () => apiClient.servers.getLaunchCommand(id),
      enabled: Boolean(id),
      // Mod changes on /mods alter the command; always refetch when the settings page mounts.
      staleTime: 0,
    }),
};
