import { localStorageDriver, sessionStorageDriver } from '@dsm/web/core/storage';

import { AUTH_STORAGE_KEY } from './auth.context';
import { type AuthUser, authUserSchema } from './auth.types';

const AUTH_TOKEN_KEY = 'dsm_access_token';
const AUTH_REFRESH_TOKEN_KEY = 'dsm_refresh_token';

export const authStorage = {
  get(): AuthUser | null {
    return (
      sessionStorageDriver.get<AuthUser | null>(AUTH_STORAGE_KEY, null, authUserSchema) ??
      localStorageDriver.get<AuthUser | null>(AUTH_STORAGE_KEY, null, authUserSchema)
    );
  },

  getToken(): string | null {
    return (
      sessionStorageDriver.get<string | null>(AUTH_TOKEN_KEY, null) ??
      localStorageDriver.get<string | null>(AUTH_TOKEN_KEY, null)
    );
  },

  getRefreshToken(): string | null {
    // Refresh tokens are strictly read from sessionStorage
    return sessionStorageDriver.get<string | null>(AUTH_REFRESH_TOKEN_KEY, null);
  },

  set(
    user: AuthUser,
    rememberMe = false,
    tokens?: { accessToken?: string; refreshToken?: string },
  ): void {
    const primary = rememberMe ? localStorageDriver : sessionStorageDriver;
    const secondary = rememberMe ? sessionStorageDriver : localStorageDriver;

    primary.set(AUTH_STORAGE_KEY, user);
    secondary.remove(AUTH_STORAGE_KEY);

    if (tokens?.accessToken) {
      primary.set(AUTH_TOKEN_KEY, tokens.accessToken);
      secondary.remove(AUTH_TOKEN_KEY);
    }
    if (tokens?.refreshToken) {
      // Refresh tokens must NEVER be stored in localStorage (XSS mitigation per PR review)
      sessionStorageDriver.set(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorageDriver.remove(AUTH_REFRESH_TOKEN_KEY);
    }
  },

  setTokens(tokens: { accessToken?: string; refreshToken?: string }): void {
    if (tokens.accessToken) {
      const isPersistent = localStorageDriver.get(AUTH_STORAGE_KEY, null) !== null;
      const targetDriver = isPersistent ? localStorageDriver : sessionStorageDriver;
      targetDriver.set(AUTH_TOKEN_KEY, tokens.accessToken);
    }
    if (tokens.refreshToken) {
      sessionStorageDriver.set(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorageDriver.remove(AUTH_REFRESH_TOKEN_KEY);
    }
  },

  clear(): void {
    localStorageDriver.remove(AUTH_STORAGE_KEY);
    sessionStorageDriver.remove(AUTH_STORAGE_KEY);
    localStorageDriver.remove(AUTH_TOKEN_KEY);
    sessionStorageDriver.remove(AUTH_TOKEN_KEY);
    localStorageDriver.remove(AUTH_REFRESH_TOKEN_KEY);
    sessionStorageDriver.remove(AUTH_REFRESH_TOKEN_KEY);
  },
};
