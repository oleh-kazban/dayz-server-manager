import { localStorageDriver } from './local-storage.driver';
import { sessionStorageDriver } from './session-storage.driver';
import { useStorage } from './use-storage';

export * from './local-storage.driver';
export * from './session-storage.driver';
export * from './storage.types';
export * from './use-storage';

export const useLocalStorage = <T>(key: string, fallback: T) =>
  useStorage(key, fallback, localStorageDriver);
export const useSessionStorage = <T>(key: string, fallback: T) =>
  useStorage(key, fallback, sessionStorageDriver);
