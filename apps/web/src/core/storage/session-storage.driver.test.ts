import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { sessionStorageDriver } from './session-storage.driver';

describe('sessionStorageDriver', () => {
  it('returns fallback when item is absent', () => {
    expect(sessionStorageDriver.get('missing', 'fallback')).toBe('fallback');
  });

  it('sets and gets item correctly', () => {
    sessionStorageDriver.set('session-user', { name: 'Survivor' });
    expect(sessionStorageDriver.get('session-user', { name: 'Guest' })).toEqual({
      name: 'Survivor',
    });
  });

  it('validates item with schema', () => {
    const schema = z.object({ token: z.string() });
    sessionStorageDriver.set('session-token', { token: 'jwt-123' });

    expect(sessionStorageDriver.get('session-token', { token: '' }, schema)).toEqual({
      token: 'jwt-123',
    });
  });

  it('returns fallback and warns when schema validation fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const schema = z.object({ token: z.string() });

    window.sessionStorage.setItem('session-token', JSON.stringify({ token: 9999 }));
    const fallback = { token: 'fallback' };

    expect(sessionStorageDriver.get('session-token', fallback, schema)).toEqual(fallback);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Schema validation failed for "session-token"'),
    );
    warnSpy.mockRestore();
  });

  it('returns fallback on malformed JSON', () => {
    window.sessionStorage.setItem('bad-json', '{ incomplete');
    expect(sessionStorageDriver.get('bad-json', 'safe')).toBe('safe');
  });

  it('removes item from sessionStorage', () => {
    sessionStorageDriver.set('to-remove', 'val');
    sessionStorageDriver.remove('to-remove');
    expect(sessionStorageDriver.get('to-remove', 'none')).toBe('none');
  });

  it('handles set errors gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });

    sessionStorageDriver.set('key', 'data');
    expect(warnSpy).toHaveBeenCalled();

    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('handles remove errors gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Denied');
    });

    sessionStorageDriver.remove('key');
    expect(warnSpy).toHaveBeenCalled();

    spy.mockRestore();
    warnSpy.mockRestore();
  });
});
