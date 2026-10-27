import type { StorageDriver, StorageSchema } from './storage.types';

export const localStorageDriver: StorageDriver = {
  get<T>(key: string, fallback: T, schema?: StorageSchema<T>): T {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return fallback;
      }
      const parsed: unknown = JSON.parse(item);
      if (schema) {
        const result = schema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
        console.warn(`[LocalStorage] Schema validation failed for "${key}". Falling back.`);
        return fallback;
      }
      return parsed as T;
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
