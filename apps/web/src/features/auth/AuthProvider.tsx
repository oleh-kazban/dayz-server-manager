import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { apiClient } from '@dsm/api-client';

import { AuthContext } from './auth.context';
import { authStorage } from './auth.storage';
import type { AuthContextValue, AuthUser, SignInCredentials } from './auth.types';

// Synchronous token hydration at module load to prevent unauthenticated initial queries on page reload
const initialStoredToken = authStorage.getToken();
if (initialStoredToken) {
  apiClient.client.setToken(initialStoredToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Ensure token is synced synchronously prior to mounting child queries
  const currentToken = authStorage.getToken();
  if (currentToken && apiClient.client.getToken() !== currentToken) {
    apiClient.client.setToken(currentToken);
  }

  const [user, setUser] = useState<AuthUser | null>(authStorage.get);

  const logout = () => {
    apiClient.client.setToken(null);
    authStorage.clear();
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...patch };
      authStorage.set(updated);
      return updated;
    });
  };

  const login = async (credentials: SignInCredentials) => {
    const response = await apiClient.auth.login({
      usernameOrEmail: credentials.usernameOrEmail,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
    });

    const authenticatedUser: AuthUser = {
      id: response.user.id,
      username: response.user.username,
      displayName: response.user.displayName,
      email: response.user.email ?? '',
      role: response.user.role,
      roles: [response.user.role],
    };

    apiClient.client.setToken(response.accessToken);
    authStorage.set(authenticatedUser, credentials.rememberMe, {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
    setUser(authenticatedUser);
  };

  useEffect(() => {
    const existingToken = authStorage.getToken();
    if (existingToken) {
      apiClient.client.setToken(existingToken);
    }

    apiClient.client.setOnRefreshToken(async () => {
      const refreshToken = authStorage.getRefreshToken();
      if (!refreshToken) {
        logout();
        return null;
      }

      try {
        const response = await apiClient.auth.refresh({ refreshToken });
        apiClient.client.setToken(response.accessToken);
        authStorage.setTokens({ accessToken: response.accessToken });
        return response.accessToken;
      } catch {
        logout();
        return null;
      }
    });

    return () => {
      apiClient.client.setOnRefreshToken(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
      updateUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
