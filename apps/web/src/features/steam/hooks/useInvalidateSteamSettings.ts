import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateSteamSettings() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['steam-settings'] });
  }, [queryClient]);
}
