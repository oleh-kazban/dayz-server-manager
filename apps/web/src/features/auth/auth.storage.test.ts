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
  });

  it('stores user in sessionStorage when rememberMe is false', () => {
    authStorage.set(mockUser, false);
    expect(authStorage.get()).toEqual(mockUser);
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('stores user in localStorage when rememberMe is true', () => {
    authStorage.set(mockUser, true);
    expect(authStorage.get()).toEqual(mockUser);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('clears user from both storages', () => {
    authStorage.set(mockUser, true);
    authStorage.clear();

    expect(authStorage.get()).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
