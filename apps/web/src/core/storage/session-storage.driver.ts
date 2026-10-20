import { StorageDriver } from './storage.types';

export const sessionStorageDriver: StorageDriver = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = window.sessionStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[SessionStorage] Failed to set "${key}":`, err);
    }
  },

  remove(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (err) {
      console.warn(`[SessionStorage] Failed to set "${key}":`, err);
    }
  },
};
