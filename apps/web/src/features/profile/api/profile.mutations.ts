import { useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';
import type { ChangePasswordDto, UpdateProfileDto } from '@aegis/api-contracts';

import { useAuth } from '../../auth';

import { profileQueryKeys, sessionsQueryKeys } from './profile.queries';

function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
  }, [queryClient]);
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => apiClient.profile.update(dto),
    onSuccess: updatedProfile => {
      queryClient.setQueryData(profileQueryKeys.current(), updatedProfile);
      if (updateUser && updatedProfile.displayName !== undefined) {
        updateUser({ displayName: updatedProfile.displayName });
      }
    },
  });
}

export function useChangePasswordMutation() {
  const invalidateSessions = useInvalidateSessions();

  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => apiClient.profile.changePassword(dto),
    onSuccess: () => {
      invalidateSessions();
    },
  });
}

export function useRevokeSessionMutation() {
  const invalidateSessions = useInvalidateSessions();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isCurrent }: { id: string; isCurrent?: boolean }) => {
      const res = await apiClient.sessions.revoke(id);
      return { ...res, isCurrent };
    },
    onSuccess: data => {
      if (data.isCurrent) {
        logout();
        return;
      }
      invalidateSessions();
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const invalidateSessions = useInvalidateSessions();

  return useMutation({
    mutationFn: () => apiClient.sessions.revokeOthers(),
    onSuccess: () => {
      invalidateSessions();
    },
  });
}
