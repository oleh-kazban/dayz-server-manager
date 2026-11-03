import type { StorageDriver, StorageSchema } from './storage.types';

export const sessionStorageDriver: StorageDriver = {
  get<T>(key: string, fallback: T, schema?: StorageSchema<T>): T {
    try {
      const item = window.sessionStorage.getItem(key);
      if (item === null) {
        return fallback;
      }
      const parsed: unknown = JSON.parse(item);
      if (schema) {
        const result = schema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
        console.warn(`[SessionStorage] Schema validation failed for "${key}". Falling back.`);
        return fallback;
      }
      return parsed as T;
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
