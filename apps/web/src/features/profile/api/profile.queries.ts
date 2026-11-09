import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';

export const profileQueryKeys = {
  all: ['profile'] as const,
  current: () => [...profileQueryKeys.all, 'current'] as const,
};

export const sessionsQueryKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionsQueryKeys.all, 'list'] as const,
};

export function useProfileQuery() {
  return useQuery({
    queryKey: profileQueryKeys.current(),
    queryFn: () => apiClient.profile.get(),
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: sessionsQueryKeys.list(),
    queryFn: () => apiClient.sessions.list(),
  });
}
