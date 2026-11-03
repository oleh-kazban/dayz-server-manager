export interface StorageSchema<T> {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error?: unknown };
}

export interface StorageDriver {
  get<T>(key: string, fallback: T, schema?: StorageSchema<T>): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}
