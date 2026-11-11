import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACKNOWLEDGED_GREETINGS_STORAGE_KEY,
  acknowledgeGreeting,
  getUserGreetingNotificationId,
  isGreetingAcknowledged,
  USER_GREETING_ID_PREFIX,
} from './greeting.storage';

describe('greeting.storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('builds deterministic trimmed greeting notification IDs', () => {
    expect(getUserGreetingNotificationId('  user-1  ')).toBe(`${USER_GREETING_ID_PREFIX}user-1`);
  });

  it('persists per-user greeting acknowledgement and deduplicates repeated writes (REQ-06)', () => {
    expect(isGreetingAcknowledged('user-1')).toBe(false);

    acknowledgeGreeting('user-1');
    expect(isGreetingAcknowledged('user-1')).toBe(true);
    expect(isGreetingAcknowledged('user-2')).toBe(false);
    expect(window.localStorage.getItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY)).toBe(
      JSON.stringify(['user-1']),
    );

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    acknowledgeGreeting('  user-1  ');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY)).toBe(
      JSON.stringify(['user-1']),
    );
  });

  it('refuses blank or whitespace userId with zero storage writes (GUARD-02)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    expect(isGreetingAcknowledged('   ')).toBe(false);
    acknowledgeGreeting('   \t\n  ');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY)).toBeNull();
  });

  it('falls back safely when localStorage holds malformed JSON or non-array data (GUARD-02)', () => {
    window.localStorage.setItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY, '{invalid json');
    expect(isGreetingAcknowledged('user-1')).toBe(false);

    window.localStorage.setItem(
      ACKNOWLEDGED_GREETINGS_STORAGE_KEY,
      JSON.stringify({ wrong: 'shape' }),
    );
    expect(isGreetingAcknowledged('user-1')).toBe(false);

    window.localStorage.setItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY, JSON.stringify([123, true]));
    expect(isGreetingAcknowledged('user-1')).toBe(false);

    acknowledgeGreeting('user-1');
    expect(isGreetingAcknowledged('user-1')).toBe(true);
    expect(window.localStorage.getItem(ACKNOWLEDGED_GREETINGS_STORAGE_KEY)).toBe(
      JSON.stringify(['user-1']),
    );
  });
});
