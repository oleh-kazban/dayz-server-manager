import { useCallback, useState } from 'react';

import { StorageDriver } from './storage.types';

export function useStorage<T>(
  key: string,
  initialValue: T,
  driver: StorageDriver,
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => driver.get(key, initialValue));

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        driver.set(key, resolved);
        return resolved;
      });
    },
    [driver, key],
  );

  const removeStoredValue = useCallback(() => {
    driver.remove(key);
    setValue(initialValue);
  }, [driver, initialValue, key]);

  return [value, setStoredValue, removeStoredValue];
}
