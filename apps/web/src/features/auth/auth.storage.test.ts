import { describe, expect, it } from 'vitest';

import { AUTH_STORAGE_KEY } from './auth.context';
import { authStorage } from './auth.storage';
import type { AuthUser } from './auth.types';

const mockUser: AuthUser = {
  id: 'usr-123',
  username: 'admin',
  email: 'admin@dayz.local',
  role: 'admin',
};

describe('authStorage', () => {
  it('returns null when no session is present', () => {
    authStorage.clear();
    expect(authStorage.get()).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
  });

  it('stores user in sessionStorage when rememberMe is false and removes legacy localStorage refresh tokens', () => {
    window.localStorage.setItem('dsm_refresh_token', JSON.stringify('legacy-token'));
    authStorage.set(mockUser, false, { accessToken: 'token-abc', refreshToken: 'ref-xyz' });

    expect(authStorage.get()).toEqual(mockUser);
    expect(authStorage.getToken()).toBe('token-abc');
    expect(authStorage.getRefreshToken()).toBe('ref-xyz');
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.sessionStorage.getItem('dsm_refresh_token')).toBe(JSON.stringify('ref-xyz'));
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('dsm_refresh_token')).toBeNull();
  });

  it('stores user and refresh token in localStorage when rememberMe is true to survive browser restarts', () => {
    authStorage.set(mockUser, true, { accessToken: 'token-abc', refreshToken: 'ref-xyz' });

    expect(authStorage.get()).toEqual(mockUser);
    expect(authStorage.getToken()).toBe('token-abc');
    expect(authStorage.getRefreshToken()).toBe('ref-xyz');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem('dsm_access_token')).not.toBeNull();
    expect(window.localStorage.getItem('dsm_refresh_token')).toBe(JSON.stringify('ref-xyz'));
    expect(window.sessionStorage.getItem('dsm_refresh_token')).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('updates tokens via setTokens while maintaining storage boundaries', () => {
    authStorage.set(mockUser, true, { accessToken: 'token-old', refreshToken: 'ref-old' });
    authStorage.setTokens({ accessToken: 'token-new', refreshToken: 'ref-new' });

    expect(authStorage.getToken()).toBe('token-new');
    expect(authStorage.getRefreshToken()).toBe('ref-new');
    expect(window.localStorage.getItem('dsm_refresh_token')).toBe(JSON.stringify('ref-new'));
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

  it('normalizes legacy stored role and roles[] claims to admin and strips roles', () => {
    authStorage.clear();
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        id: 'usr-legacy',
        username: 'legacyMod',
        email: 'mod@dayz.local',
        role: 'moderator',
        roles: ['moderator', 'viewer'],
      }),
    );

    const parsed = authStorage.get();
    expect(parsed).toEqual({
      id: 'usr-legacy',
      username: 'legacyMod',
      email: 'mod@dayz.local',
      role: 'admin',
    });
    expect(parsed && 'roles' in parsed).toBe(false);
  });

  it('returns null when stored user JSON is malformed or missing required fields', () => {
    authStorage.clear();
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ id: 'usr-bad' }));
    expect(authStorage.get()).toBeNull();

    window.sessionStorage.setItem(AUTH_STORAGE_KEY, '{not-json');
    expect(authStorage.get()).toBeNull();
  });
});
