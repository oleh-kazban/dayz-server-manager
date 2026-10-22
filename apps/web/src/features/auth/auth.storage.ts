import { localStorageDriver, sessionStorageDriver } from '@dsm/core/storage';

import { AUTH_STORAGE_KEY } from './auth.context';
import { AuthUser } from './auth.types';

export const authStorage = {
  get(): AuthUser | null {
    return (
      sessionStorageDriver.get<AuthUser | null>(AUTH_STORAGE_KEY, null) ??
      localStorageDriver.get<AuthUser | null>(AUTH_STORAGE_KEY, null)
    );
  },

  set(user: AuthUser, rememberMe = false): void {
    if (rememberMe) {
      localStorageDriver.set(AUTH_STORAGE_KEY, user);
      sessionStorageDriver.remove(AUTH_STORAGE_KEY);
    } else {
      sessionStorageDriver.set(AUTH_STORAGE_KEY, user);
      localStorageDriver.remove(AUTH_STORAGE_KEY);
    }
  },

  clear(): void {
    localStorageDriver.remove(AUTH_STORAGE_KEY);
    sessionStorageDriver.remove(AUTH_STORAGE_KEY);
  },
};
