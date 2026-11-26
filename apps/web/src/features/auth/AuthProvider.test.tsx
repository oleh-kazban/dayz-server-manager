import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import { showToast } from '@aegis/ui';

import { AUTH_STORAGE_KEY, useAuth } from './auth.context';
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

    vi.spyOn(apiClient.auth, 'logout').mockResolvedValue(undefined);
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
          <button type="button" onClick={() => void logout()}>
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
    await act(async () => {
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
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout');
      const token = await act(async () => registeredHandler!());

      expect(token).toBeNull();
      expect(authStorage.get()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
      expect(logoutSpy).not.toHaveBeenCalled();
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
        refreshToken: 'new-rotated-refresh-jwt',
        expiresIn: 900,
      });

      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      const token = await act(async () => registeredHandler!());

      expect(token).toBe('new-refreshed-jwt');
      expect(authStorage.getRefreshToken()).toBe('new-rotated-refresh-jwt');
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
        new ApiError('Invalid or expired refresh token', 401),
      );
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout');

      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      const token = await act(async () => registeredHandler!());

      expect(token).toBeNull();
      expect(authStorage.get()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['localStorage', true, 'sessionStorage'],
      ['sessionStorage', false, 'localStorage'],
    ] as const)(
      'stores both rotated tokens in %s, the storage of the current ones (AC-8)',
      async (used, rememberMe, other) => {
        let registeredHandler: (() => Promise<string | null>) | null = null;
        vi.spyOn(apiClient.client, 'setOnRefreshToken').mockImplementation(fn => {
          registeredHandler = fn;
        });
        authStorage.set(mockUser, rememberMe, {
          accessToken: 'old-access-jwt',
          refreshToken: 'old-refresh-jwt',
        });
        const refreshSpy = vi.spyOn(apiClient.auth, 'refresh').mockResolvedValueOnce({
          accessToken: 'rotated-access-jwt',
          refreshToken: 'rotated-refresh-jwt',
          expiresIn: 900,
        });
        render(
          <AuthProvider>
            <div>Mounted</div>
          </AuthProvider>,
        );

        await act(async () => registeredHandler!());

        expect(refreshSpy).toHaveBeenCalledWith({ refreshToken: 'old-refresh-jwt' });
        expect(window[used].getItem('dsm_refresh_token')).toBe(
          JSON.stringify('rotated-refresh-jwt'),
        );
        expect(window[used].getItem('dsm_access_token')).toBe(JSON.stringify('rotated-access-jwt'));
        expect(window[other].getItem('dsm_refresh_token')).toBeNull();
        expect(window[other].getItem('dsm_access_token')).toBeNull();
      },
    );

    it.each([
      ['a network error', new TypeError('Failed to fetch')],
      ['a 500 response', new ApiError('Server error', 500)],
      ['a 429 response', new ApiError('Too many requests', 429)],
    ])('keeps the operator signed in after %s (AC-8)', async (_name, failure) => {
      let registeredHandler: (() => Promise<string | null>) | null = null;
      vi.spyOn(apiClient.client, 'setOnRefreshToken').mockImplementation(fn => {
        registeredHandler = fn;
      });
      authStorage.set(mockUser, true, {
        accessToken: 'old-access-jwt',
        refreshToken: 'kept-refresh-jwt',
      });
      vi.spyOn(apiClient.auth, 'refresh').mockRejectedValueOnce(failure);
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout');
      render(
        <AuthProvider>
          <div>Mounted</div>
        </AuthProvider>,
      );

      const token = await act(async () => registeredHandler!());

      expect(token).toBeNull();
      expect(authStorage.get()).not.toBeNull();
      expect(authStorage.getToken()).toBe('old-access-jwt');
      expect(authStorage.getRefreshToken()).toBe('kept-refresh-jwt');
      expect(apiClient.client.getToken()).toBe('old-access-jwt');
      expect(logoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('logout (AC-3)', () => {
    const storedUser: AuthUser = {
      id: 'usr-out',
      username: 'outUser',
      email: 'out@dayz.local',
      role: 'admin',
    };

    function LogoutConsumer() {
      const { isAuthenticated, logout } = useAuth();
      return (
        <div>
          <span data-testid="status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
          <button type="button" onClick={() => void logout()}>
            Log Out
          </button>
        </div>
      );
    }

    const signOut = async () => {
      render(
        <AuthProvider>
          <LogoutConsumer />
        </AuthProvider>,
      );
      await act(async () => {
        screen.getByRole('button', { name: 'Log Out' }).click();
      });
    };

    const expectSignedOutLocally = () => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
      expect(authStorage.get()).toBeNull();
      expect(authStorage.getToken()).toBeNull();
      expect(authStorage.getRefreshToken()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
    };

    beforeEach(() => {
      authStorage.set(storedUser, true, {
        accessToken: 'stored-access-jwt',
        refreshToken: 'stored-refresh-jwt',
      });
    });

    it('calls the sign-out endpoint once and then clears local state', async () => {
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout').mockResolvedValue(undefined);
      const refreshSpy = vi.spyOn(apiClient.auth, 'refresh');

      await signOut();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).not.toHaveBeenCalled();
      expectSignedOutLocally();
    });

    it('keeps the local session until the sign-out call has settled', async () => {
      let settle!: () => void;
      vi.spyOn(apiClient.auth, 'logout').mockReturnValue(
        new Promise<void>(resolve => {
          settle = resolve;
        }),
      );

      await signOut();
      expect(screen.getByTestId('status')).toHaveTextContent('logged-in');
      expect(authStorage.get()).not.toBeNull();

      await act(async () => settle());

      expectSignedOutLocally();
    });

    it('refreshes once and repeats the call when the access token has expired', async () => {
      const tokenAtCall: (string | null)[] = [];
      const logoutSpy = vi
        .spyOn(apiClient.auth, 'logout')
        .mockImplementationOnce(() => {
          tokenAtCall.push(apiClient.client.getToken());
          return Promise.reject(new ApiError('Token expired', 401));
        })
        .mockImplementationOnce(() => {
          tokenAtCall.push(apiClient.client.getToken());
          return Promise.resolve(undefined);
        });
      const refreshSpy = vi.spyOn(apiClient.auth, 'refresh').mockResolvedValue({
        accessToken: 'fresh-access-jwt',
        refreshToken: 'fresh-refresh-jwt',
        expiresIn: 900,
      });

      await signOut();

      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledWith({ refreshToken: 'stored-refresh-jwt' });
      expect(logoutSpy).toHaveBeenCalledTimes(2);
      expect(tokenAtCall[1]).toBe('fresh-access-jwt');
      expectSignedOutLocally();
    });

    it('stops after one repeat when the sign-out call is rejected again', async () => {
      const logoutSpy = vi
        .spyOn(apiClient.auth, 'logout')
        .mockRejectedValue(new ApiError('Token expired', 401));
      const refreshSpy = vi.spyOn(apiClient.auth, 'refresh').mockResolvedValue({
        accessToken: 'fresh-access-jwt',
        refreshToken: 'fresh-refresh-jwt',
        expiresIn: 900,
      });

      await signOut();

      expect(logoutSpy).toHaveBeenCalledTimes(2);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expectSignedOutLocally();
    });

    it.each([
      ['the server rejects it', new ApiError('Session expired', 401)],
      ['a network error occurs', new TypeError('Failed to fetch')],
    ])(
      'does not call the endpoint again when the refresh fails because %s',
      async (_name, failure) => {
        const logoutSpy = vi
          .spyOn(apiClient.auth, 'logout')
          .mockRejectedValue(new ApiError('Token expired', 401));
        const refreshSpy = vi.spyOn(apiClient.auth, 'refresh').mockRejectedValue(failure);

        await signOut();

        expect(refreshSpy).toHaveBeenCalledTimes(1);
        expect(logoutSpy).toHaveBeenCalledTimes(1);
        expectSignedOutLocally();
      },
    );

    it.each([
      ['a network error', new TypeError('Failed to fetch')],
      ['a 500 response', new ApiError('Server error', 500)],
      ['an aborted call', new DOMException('The operation timed out', 'TimeoutError')],
    ])('still clears local state after %s and does not refresh', async (_name, failure) => {
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout').mockRejectedValue(failure);
      const refreshSpy = vi.spyOn(apiClient.auth, 'refresh');

      await signOut();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).not.toHaveBeenCalled();
      expectSignedOutLocally();
    });

    it('shows no error toast when the sign-out call fails', async () => {
      const errorToast = vi.spyOn(showToast, 'error');
      vi.spyOn(apiClient.auth, 'logout').mockRejectedValue(new TypeError('Failed to fetch'));

      await signOut();

      expect(errorToast).not.toHaveBeenCalled();
      expectSignedOutLocally();
    });
  });

  it('exposes the root role after a login response with role root', async () => {
    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      accessToken: 'root-access-token',
      refreshToken: 'root-refresh-token',
      expiresIn: 900,
      user: { id: 'usr-root', username: 'rootUser', email: 'root@dayz.local', role: 'root' },
    });

    function Consumer() {
      const { user, login } = useAuth();
      return (
        <div>
          <span data-testid="role">{user?.role ?? 'none'}</span>
          <button
            type="button"
            onClick={() =>
              void login({ usernameOrEmail: 'rootUser', password: 'SecretPassword123!' })
            }
          >
            Log In
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await act(async () => {
      screen.getByRole('button', { name: 'Log In' }).click();
    });

    expect(screen.getByTestId('role')).toHaveTextContent('root');
    expect(authStorage.get()?.role).toBe('root');
  });

  describe('adoptSession', () => {
    const rootResponse = {
      accessToken: 'root-access-token',
      refreshToken: 'root-refresh-token',
      expiresIn: 900,
      user: { id: 'usr-root', username: 'owner', role: 'root' as const },
    };

    function AdoptConsumer() {
      const { user, adoptSession } = useAuth();
      return (
        <div>
          <span data-testid="user">{user ? `${user.username}:${user.role}` : 'none'}</span>
          <button type="button" onClick={() => adoptSession(rootResponse)}>
            Adopt
          </button>
        </div>
      );
    }

    it('sets the user and stores the tokens without calling login', () => {
      const loginSpy = vi.spyOn(apiClient.auth, 'login');
      render(
        <AuthProvider>
          <AdoptConsumer />
        </AuthProvider>,
      );

      act(() => {
        screen.getByRole('button', { name: 'Adopt' }).click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('owner:root');
      expect(authStorage.get()).toMatchObject({ id: 'usr-root', username: 'owner', role: 'root' });
      expect(authStorage.getToken()).toBe('root-access-token');
      expect(authStorage.getRefreshToken()).toBe('root-refresh-token');
      expect(apiClient.client.getToken()).toBe('root-access-token');
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it('stores the session for the tab only (rememberMe false)', () => {
      window.localStorage.setItem('dsm_refresh_token', JSON.stringify('stale-refresh'));
      render(
        <AuthProvider>
          <AdoptConsumer />
        </AuthProvider>,
      );

      act(() => {
        screen.getByRole('button', { name: 'Adopt' }).click();
      });

      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
      expect(window.sessionStorage.getItem('dsm_access_token')).toBe(
        JSON.stringify('root-access-token'),
      );
      expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(window.localStorage.getItem('dsm_refresh_token')).toBeNull();
    });

    it('replaces the user of a previous session', () => {
      authStorage.set(
        { id: 'usr-setup', username: 'setup-1a2b', email: '', role: 'setup' },
        false,
        {
          accessToken: 'setup-access-token',
        },
      );
      render(
        <AuthProvider>
          <AdoptConsumer />
        </AuthProvider>,
      );
      expect(screen.getByTestId('user')).toHaveTextContent('setup-1a2b:setup');

      act(() => {
        screen.getByRole('button', { name: 'Adopt' }).click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('owner:root');
      expect(apiClient.client.getToken()).toBe('root-access-token');
    });
  });

  it('login keeps the session in localStorage when rememberMe is true and in sessionStorage when it is not', async () => {
    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      accessToken: 'login-access-token',
      refreshToken: 'login-refresh-token',
      expiresIn: 900,
      user: { id: 'usr-a', username: 'someone', email: 'a@dayz.local', role: 'admin' },
    });

    function LoginConsumer() {
      const { login } = useAuth();
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              void login({ usernameOrEmail: 'someone', password: 'x', rememberMe: true })
            }
          >
            Remember
          </button>
          <button
            type="button"
            onClick={() => void login({ usernameOrEmail: 'someone', password: 'x' })}
          >
            Once
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Remember' }).click();
    });
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem('dsm_refresh_token')).toBe(
      JSON.stringify('login-refresh-token'),
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Once' }).click();
    });
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['root', 'localStorage'],
    ['setup', 'sessionStorage'],
  ] as const)(
    'login with rememberMe true stores a %s user in %s only',
    async (role, expectedStore) => {
      vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
        accessToken: 'role-access-token',
        refreshToken: 'role-refresh-token',
        expiresIn: 900,
        user: { id: 'usr-r', username: 'someone', email: 'r@dayz.local', role },
      });

      function RememberConsumer() {
        const { login } = useAuth();
        return (
          <button
            type="button"
            onClick={() =>
              void login({ usernameOrEmail: 'someone', password: 'x', rememberMe: true })
            }
          >
            Remember
          </button>
        );
      }

      render(
        <AuthProvider>
          <RememberConsumer />
        </AuthProvider>,
      );
      await act(async () => {
        screen.getByRole('button', { name: 'Remember' }).click();
      });

      const used = window[expectedStore];
      const other = expectedStore === 'localStorage' ? window.sessionStorage : window.localStorage;
      for (const key of [AUTH_STORAGE_KEY, 'dsm_access_token', 'dsm_refresh_token']) {
        expect(used.getItem(key)).not.toBeNull();
        expect(other.getItem(key)).toBeNull();
      }
    },
  );

  it.each([
    ['an unknown role', { role: 'moderator' }],
    ['a missing role', {}],
  ])('mounts signed out and clears storage for a stored user with %s', (_name, extra) => {
    authStorage.clear();
    const stored = JSON.stringify({ id: 'usr-x', username: 'someone', ...extra });
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, stored);
    window.localStorage.setItem(AUTH_STORAGE_KEY, stored);
    window.sessionStorage.setItem('dsm_access_token', JSON.stringify('access'));
    window.localStorage.setItem('dsm_refresh_token', JSON.stringify('refresh'));

    function Consumer() {
      const { isAuthenticated, user } = useAuth();
      return (
        <span data-testid="state">
          {isAuthenticated ? 'in' : 'out'}:{user?.username ?? 'none'}
        </span>
      );
    }

    expect(() =>
      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId('state')).toHaveTextContent('out:none');
    for (const storage of [window.localStorage, window.sessionStorage]) {
      expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(storage.getItem('dsm_access_token')).toBeNull();
      expect(storage.getItem('dsm_refresh_token')).toBeNull();
    }
  });
});
