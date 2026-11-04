import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@dsm/api-client';

import { useAuth } from './auth.context';
import { authStorage } from './auth.storage';
import type { AuthUser } from './auth.types';
import { AuthProvider } from './AuthProvider';

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStorage.clear();
    apiClient.client.setToken(null);
  });

  it('throws an error if useAuth is invoked outside of an AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth should be used within <AuthProvider />');
  });

  it('provides default unauthenticated state when storage is empty', () => {
    authStorage.clear();

    function Consumer() {
      const { isAuthenticated, user } = useAuth();
      return (
        <div>
          <span data-testid="status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
          <span data-testid="user">{user?.username ?? 'none'}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('restores existing user and token from authStorage on mount', () => {
    const existingUser: AuthUser = {
      id: 'stored-1',
      username: 'storedAdmin',
      email: 'stored@dayz.local',
      role: 'admin',
      roles: ['admin'],
    };
    authStorage.set(existingUser, false, { accessToken: 'existing-jwt' });

    function Consumer() {
      const { isAuthenticated, user } = useAuth();
      return (
        <div>
          <span data-testid="status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
          <span data-testid="user">{user?.username}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('user')).toHaveTextContent('storedAdmin');
    expect(apiClient.client.getToken()).toBe('existing-jwt');
  });

  it('synchronously populates apiClient token before child component initial render', () => {
    authStorage.set(
      {
        id: 'stored-sync',
        username: 'syncAdmin',
        email: 'sync@dayz.local',
        role: 'admin',
        roles: ['admin'],
      },
      false,
      { accessToken: 'sync-jwt-token' },
    );

    let tokenDuringChildRender: string | null = null;
    function SyncConsumer() {
      tokenDuringChildRender = apiClient.client.getToken();
      return <div>Sync</div>;
    }

    render(
      <AuthProvider>
        <SyncConsumer />
      </AuthProvider>,
    );

    expect(tokenDuringChildRender).toBe('sync-jwt-token');
  });

  it('handles login and logout lifecycle', async () => {
    authStorage.clear();

    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 900,
      user: {
        id: 'usr-new-id',
        username: 'newCommander',
        email: 'commander@dayz.local',
        role: 'admin',
      },
    });

    function Consumer() {
      const { isAuthenticated, user, login, logout } = useAuth();
      return (
        <div>
          <span data-testid="status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
          <span data-testid="user">{user?.username ?? 'none'}</span>
          <button
            type="button"
            onClick={() =>
              void login({
                usernameOrEmail: 'newCommander',
                password: 'SecretPassword123!',
                rememberMe: true,
              })
            }
          >
            Log In
          </button>
          <button type="button" onClick={logout}>
            Log Out
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('logged-out');

    // Perform Login
    await act(async () => {
      screen.getByRole('button', { name: 'Log In' }).click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('user')).toHaveTextContent('newCommander');
    expect(authStorage.get()?.username).toBe('newCommander');
    expect(authStorage.getToken()).toBe('test-access-token');
    expect(apiClient.client.getToken()).toBe('test-access-token');

    // Perform Logout
    act(() => {
      screen.getByRole('button', { name: 'Log Out' }).click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(authStorage.get()).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(apiClient.client.getToken()).toBeNull();
  });

  describe('token refresh callback lifecycle', () => {
    const mockUser: AuthUser = {
      id: 'usr-refresh',
      username: 'refreshUser',
      email: 'refresh@dayz.local',
      role: 'admin',
      roles: ['admin'],
    };

    it('logs out and returns null when refresh token is missing', async () => {
      let registeredHandler: (() => Promise<string | null>) | null = null;
      vi.spyOn(apiClient.client, 'setOnRefreshToken').mockImplementation(fn => {
        registeredHandler = fn;
      });

      authStorage.clear();

      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      expect(registeredHandler).not.toBeNull();
      const token = await act(async () => registeredHandler!());

      expect(token).toBeNull();
      expect(authStorage.get()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
    });

    it('refreshes token successfully and updates client and storage', async () => {
      let registeredHandler: (() => Promise<string | null>) | null = null;
      vi.spyOn(apiClient.client, 'setOnRefreshToken').mockImplementation(fn => {
        registeredHandler = fn;
      });

      authStorage.set(mockUser, true, {
        accessToken: 'old-access-jwt',
        refreshToken: 'valid-refresh-jwt',
      });

      vi.spyOn(apiClient.auth, 'refresh').mockResolvedValueOnce({
        accessToken: 'new-refreshed-jwt',
        expiresIn: 900,
      });

      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      const token = await act(async () => registeredHandler!());

      expect(token).toBe('new-refreshed-jwt');
      expect(authStorage.getToken()).toBe('new-refreshed-jwt');
      expect(apiClient.client.getToken()).toBe('new-refreshed-jwt');
    });

    it('logs out when refresh API call fails', async () => {
      let registeredHandler: (() => Promise<string | null>) | null = null;
      vi.spyOn(apiClient.client, 'setOnRefreshToken').mockImplementation(fn => {
        registeredHandler = fn;
      });

      authStorage.set(mockUser, true, {
        accessToken: 'old-access-jwt',
        refreshToken: 'expired-refresh-jwt',
      });

      vi.spyOn(apiClient.auth, 'refresh').mockRejectedValueOnce(
        new Error('Invalid or expired refresh token'),
      );

      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      const token = await act(async () => registeredHandler!());

      expect(token).toBeNull();
      expect(authStorage.get()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
    });
  });
});
