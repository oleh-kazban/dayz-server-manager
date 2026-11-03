import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { localStorageDriver } from './local-storage.driver';
import { useStorage } from './use-storage';

describe('useStorage', () => {
  it('initializes with fallback value when storage is empty', () => {
    const { result } = renderHook(() =>
      useStorage('test-hook-key', 'default-val', localStorageDriver),
    );

    expect(result.current[0]).toBe('default-val');
  });

  it('updates state and persists next value directly', () => {
    const { result } = renderHook(() => useStorage('test-hook-key', 'initial', localStorageDriver));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorageDriver.get('test-hook-key', '')).toBe('updated');
  });

  it('supports updater function to compute next value from previous state', () => {
    const { result } = renderHook(() => useStorage('counter-key', 10, localStorageDriver));

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(localStorageDriver.get('counter-key', 0)).toBe(15);
  });

  it('removes stored value and resets state to initialValue', () => {
    const { result } = renderHook(() => useStorage('reset-key', 'default', localStorageDriver));

    act(() => {
      result.current[1]('temporary');
    });
    expect(result.current[0]).toBe('temporary');

    act(() => {
      result.current[2](); // removeStoredValue
    });

    expect(result.current[0]).toBe('default');
    expect(localStorageDriver.get('reset-key', 'fallback')).toBe('fallback');
  });
});
