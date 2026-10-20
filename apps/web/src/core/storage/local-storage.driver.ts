import { StorageDriver } from './storage.types';

export const localStorageDriver: StorageDriver = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[LocalStorage] Failed to set "${key}":`, err);
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[LocalStorage] Failed to remove "${key}":`, err);
    }
  },
};
