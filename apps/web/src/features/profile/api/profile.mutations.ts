import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@dsm/api-client';
import type { ChangePasswordDto, UpdateProfileDto } from '@dsm/api-contracts';

import { useAuth } from '../../auth';

import { profileQueryKeys, sessionsQueryKeys } from './profile.queries';

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => apiClient.profile.changePassword(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
    },
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isCurrent }: { id: string; isCurrent?: boolean }) => {
      const res = await apiClient.sessions.revoke(id);
      return { ...res, isCurrent };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
      if (data.isCurrent) {
        logout();
      }
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.sessions.revokeOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
    },
  });
}
