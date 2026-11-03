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
});
