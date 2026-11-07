import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@dsm/api-client';

import * as authModule from '../../auth';

import {
  useChangePasswordMutation,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useUpdateProfileMutation,
} from './profile.mutations';
import {
  profileQueryKeys,
  sessionsQueryKeys,
  useProfileQuery,
  useSessionsQuery,
} from './profile.queries';

describe('Profile Queries & Mutations', () => {
  let queryClient: QueryClient;
  const mockUpdateUser = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      updateUser: mockUpdateUser,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('queries', () => {
    it('useProfileQuery calls apiClient.profile.get', async () => {
      const mockProfile = {
        id: 'u1',
        username: 'admin',
        role: 'admin' as const,
        timezone: 'UTC',
        timeFormat: '24h' as const,
        createdAt: '2026-11-01T00:00:00.000Z',
      };
      vi.spyOn(apiClient.profile, 'get').mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfileQuery(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProfile);
      expect(apiClient.profile.get).toHaveBeenCalled();
    });

    it('useSessionsQuery calls apiClient.sessions.list', async () => {
      const mockSessions = { sessions: [], totalCount: 0 };
      vi.spyOn(apiClient.sessions, 'list').mockResolvedValue(mockSessions);

      const { result } = renderHook(() => useSessionsQuery(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSessions);
      expect(apiClient.sessions.list).toHaveBeenCalled();
    });
  });

  describe('mutations', () => {
    it('useUpdateProfileMutation updates cache and syncs auth context displayName', async () => {
      const updated = {
        id: 'u1',
        username: 'admin',
        displayName: 'Hero',
        role: 'admin' as const,
        timezone: 'UTC',
        timeFormat: '24h' as const,
        createdAt: '2026-11-01T00:00:00.000Z',
      };
      vi.spyOn(apiClient.profile, 'update').mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ displayName: 'Hero' });
      });

      expect(apiClient.profile.update).toHaveBeenCalledWith({ displayName: 'Hero' });
      expect(queryClient.getQueryData(profileQueryKeys.current())).toEqual(updated);
      expect(mockUpdateUser).toHaveBeenCalledWith({ displayName: 'Hero' });
    });

    it('useUpdateProfileMutation skips updateUser if displayName is undefined', async () => {
      const updatedWithoutDisplayName = {
        id: 'u1',
        username: 'admin',
        role: 'admin' as const,
        timezone: 'UTC',
        timeFormat: '24h' as const,
        createdAt: '2026-11-01T00:00:00.000Z',
      };
      vi.spyOn(apiClient.profile, 'update').mockResolvedValue(updatedWithoutDisplayName);

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ timezone: 'UTC' });
      });

      expect(queryClient.getQueryData(profileQueryKeys.current())).toEqual(
        updatedWithoutDisplayName,
      );
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('useUpdateProfileMutation handles missing updateUser gracefully', async () => {
      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: mockLogout,
        updateUser: undefined as unknown as () => void,
      });

      const updated = {
        id: 'u1',
        username: 'admin',
        displayName: 'Hero',
        role: 'admin' as const,
        timezone: 'UTC',
        timeFormat: '24h' as const,
        createdAt: '2026-11-01T00:00:00.000Z',
      };
      vi.spyOn(apiClient.profile, 'update').mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ displayName: 'Hero' });
      });

      expect(queryClient.getQueryData(profileQueryKeys.current())).toEqual(updated);
    });

    it('useChangePasswordMutation calls changePassword and invalidates sessions cache', async () => {
      vi.spyOn(apiClient.profile, 'changePassword').mockResolvedValue({
        success: true,
        message: 'ok',
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          currentPassword: 'old',
          newPassword: 'newPassword1!',
          confirmPassword: 'newPassword1!',
        });
      });

      expect(apiClient.profile.changePassword).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionsQueryKeys.all });
    });

    it('useRevokeSessionMutation invalidates sessions and logs out if isCurrent is true', async () => {
      vi.spyOn(apiClient.sessions, 'revoke').mockResolvedValue({
        success: true,
        message: 'revoked',
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRevokeSessionMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'sess-current', isCurrent: true });
      });

      expect(apiClient.sessions.revoke).toHaveBeenCalledWith('sess-current');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionsQueryKeys.all });
      expect(mockLogout).toHaveBeenCalled();
    });

    it('useRevokeSessionMutation does not logout if isCurrent is false', async () => {
      vi.spyOn(apiClient.sessions, 'revoke').mockResolvedValue({
        success: true,
        message: 'revoked',
      });

      const { result } = renderHook(() => useRevokeSessionMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'sess-remote', isCurrent: false });
      });

      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('useRevokeOtherSessionsMutation calls revokeOthers and invalidates sessions', async () => {
      vi.spyOn(apiClient.sessions, 'revokeOthers').mockResolvedValue({
        revokedCount: 2,
        message: 'ok',
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRevokeOtherSessionsMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(apiClient.sessions.revokeOthers).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionsQueryKeys.all });
    });
  });
});
