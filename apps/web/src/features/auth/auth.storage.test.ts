import { describe, expect, it } from 'vitest';

import { AUTH_STORAGE_KEY } from './auth.context';
import { authStorage } from './auth.storage';
import type { AuthUser } from './auth.types';

const mockUser: AuthUser = {
  id: 'usr-123',
  username: 'admin',
  email: 'admin@dayz.local',
  role: 'admin',
  roles: ['admin'],
};

describe('authStorage', () => {
  it('returns null when no session is present', () => {
    authStorage.clear();
    expect(authStorage.get()).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
  });

  it('stores user in sessionStorage when rememberMe is false', () => {
    authStorage.set(mockUser, false, { accessToken: 'token-abc', refreshToken: 'ref-xyz' });
    expect(authStorage.get()).toEqual(mockUser);
    expect(authStorage.getToken()).toBe('token-abc');
    expect(authStorage.getRefreshToken()).toBe('ref-xyz');
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('stores user in localStorage when rememberMe is true, but strictly keeps refresh token in sessionStorage', () => {
    authStorage.set(mockUser, true, { accessToken: 'token-abc', refreshToken: 'ref-xyz' });
    expect(authStorage.get()).toEqual(mockUser);
    expect(authStorage.getToken()).toBe('token-abc');
    expect(authStorage.getRefreshToken()).toBe('ref-xyz');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem('dsm_access_token')).not.toBeNull();
    expect(window.localStorage.getItem('dsm_refresh_token')).toBeNull();
    expect(window.sessionStorage.getItem('dsm_refresh_token')).toBe(JSON.stringify('ref-xyz'));
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('updates tokens via setTokens while maintaining storage boundaries', () => {
    authStorage.set(mockUser, true, { accessToken: 'token-old', refreshToken: 'ref-old' });
    authStorage.setTokens({ accessToken: 'token-new', refreshToken: 'ref-new' });

    expect(authStorage.getToken()).toBe('token-new');
    expect(authStorage.getRefreshToken()).toBe('ref-new');
    expect(window.localStorage.getItem('dsm_refresh_token')).toBeNull();
    expect(window.sessionStorage.getItem('dsm_refresh_token')).toBe(JSON.stringify('ref-new'));
  });

  it('clears user and tokens from both storages', () => {
    authStorage.set(mockUser, true, { accessToken: 'token-abc', refreshToken: 'ref-xyz' });
    authStorage.clear();

    expect(authStorage.get()).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
