import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { localStorageDriver } from './local-storage.driver';

describe('localStorageDriver', () => {
  it('returns fallback when item does not exist', () => {
    expect(localStorageDriver.get('missing-key', 'default-val')).toBe('default-val');
  });

  it('sets and gets item without schema validation', () => {
    localStorageDriver.set('test-key', { count: 42 });
    const result = localStorageDriver.get('test-key', { count: 0 });

    expect(result).toEqual({ count: 42 });
  });

  it('validates item with schema and returns validated data when valid', () => {
    const schema = z.object({ id: z.string(), active: z.boolean() });
    localStorageDriver.set('schema-key', { id: 'srv-1', active: true });

    const result = localStorageDriver.get('schema-key', { id: 'fallback', active: false }, schema);
    expect(result).toEqual({ id: 'srv-1', active: true });
  });

  it('returns fallback and logs warning when schema validation fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const schema = z.object({ id: z.string(), score: z.number() });

    // Store corrupted / legacy structure
    window.localStorage.setItem('corrupted-key', JSON.stringify({ id: 123, score: 'bad' }));

    const fallback = { id: 'fallback', score: 0 };
    const result = localStorageDriver.get('corrupted-key', fallback, schema);

    expect(result).toEqual(fallback);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Schema validation failed for "corrupted-key"'),
    );
    warnSpy.mockRestore();
  });

  it('returns fallback when JSON parsing throws', () => {
    window.localStorage.setItem('malformed-json', '{ invalid json ');

    const result = localStorageDriver.get('malformed-json', 'safe-fallback');
    expect(result).toBe('safe-fallback');
  });

  it('removes item from localStorage', () => {
    localStorageDriver.set('to-delete', 'temp-value');
    expect(localStorageDriver.get('to-delete', '')).toBe('temp-value');

    localStorageDriver.remove('to-delete');
    expect(localStorageDriver.get('to-delete', 'not-found')).toBe('not-found');
  });

  it('catches and logs warning on storage set error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    localStorageDriver.set('quota-key', 'heavy-payload');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to set "quota-key":'),
      expect.any(Error),
    );

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('catches and logs warning on storage remove error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('StorageAccessDenied');
    });

    localStorageDriver.remove('locked-key');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to remove "locked-key":'),
      expect.any(Error),
    );

    removeItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
