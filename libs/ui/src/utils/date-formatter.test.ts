import { describe, expect, it, vi } from 'vitest';

import { formatDateOnly, formatTimestamp, parseDateOnly, toDateOnlyString } from './date-formatter';

describe('date-formatter utilities', () => {
  it('formats Date to YYYY-MM-DD string', () => {
    const date = new Date(2025, 4, 15); // May 15, 2025
    expect(toDateOnlyString(date)).toBe('2025-05-15');
  });

  it('parses valid date-only string to midnight Date', () => {
    const parsed = parseDateOnly('2025-10-25');
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(9); // 0-indexed October
    expect(parsed.getDate()).toBe(25);
    expect(parsed.getHours()).toBe(0);
  });

  it('throws RangeError on malformed or non-existent date strings', () => {
    expect(() => parseDateOnly('not-a-date')).toThrow(RangeError);
    expect(() => parseDateOnly('2025-02-31')).toThrow(RangeError); // February 31
    expect(() => parseDateOnly('2025-13-01')).toThrow(RangeError); // Month 13
  });

  it('formats date-only string and Date object using locale options', () => {
    const formatted = formatDateOnly('2025-05-15', 'en-US');
    expect(formatted).toContain('May');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2025');

    const formattedDateObj = formatDateOnly(new Date(2025, 4, 15), 'en-US');
    expect(formattedDateObj).toContain('May');
  });

  describe('formatTimestamp', () => {
    it('returns string unchanged when passed a formatted string', () => {
      expect(formatTimestamp('5m ago')).toBe('5m ago');
      expect(formatTimestamp('Yesterday at 4:00 PM')).toBe('Yesterday at 4:00 PM');
    });

    it('formats dates less than 60 seconds ago as "Just now"', () => {
      const now = new Date('2026-10-27T12:00:00Z');
      vi.setSystemTime(now);

      const thirtySecsAgo = new Date('2026-10-27T11:59:30Z');
      expect(formatTimestamp(thirtySecsAgo)).toBe('Just now');

      vi.useRealTimers();
    });

    it('formats dates less than 60 minutes ago as "Xm ago"', () => {
      const now = new Date('2026-10-27T12:00:00Z');
      vi.setSystemTime(now);

      const fiveMinsAgo = new Date('2026-10-27T11:55:00Z');
      expect(formatTimestamp(fiveMinsAgo)).toBe('5m ago');

      const fiftyNineMinsAgo = new Date('2026-10-27T11:01:00Z');
      expect(formatTimestamp(fiftyNineMinsAgo)).toBe('59m ago');

      vi.useRealTimers();
    });

    it('formats dates less than 24 hours ago as "Xh ago"', () => {
      const now = new Date('2026-10-27T12:00:00Z');
      vi.setSystemTime(now);

      const twoHoursAgo = new Date('2026-10-27T10:00:00Z');
      expect(formatTimestamp(twoHoursAgo)).toBe('2h ago');

      const twentyThreeHoursAgo = new Date('2026-10-26T13:00:00Z');
      expect(formatTimestamp(twentyThreeHoursAgo)).toBe('23h ago');

      vi.useRealTimers();
    });

    it('formats dates less than 7 days ago as "Xd ago"', () => {
      const now = new Date('2026-10-27T12:00:00Z');
      vi.setSystemTime(now);

      const threeDaysAgo = new Date('2026-10-24T12:00:00Z');
      expect(formatTimestamp(threeDaysAgo)).toBe('3d ago');

      const sixDaysAgo = new Date('2026-10-21T12:00:00Z');
      expect(formatTimestamp(sixDaysAgo)).toBe('6d ago');

      vi.useRealTimers();
    });

    it('formats dates 7 days or older using toLocaleDateString()', () => {
      const now = new Date('2026-10-27T12:00:00Z');
      vi.setSystemTime(now);

      const tenDaysAgo = new Date('2026-10-17T12:00:00Z');
      expect(formatTimestamp(tenDaysAgo)).toBe(tenDaysAgo.toLocaleDateString());

      vi.useRealTimers();
    });

    it('handles invalid date objects gracefully via catch block', () => {
      const invalidDate = {
        getTime() {
          throw new Error('Explosion');
        },
        toString() {
          return '[Invalid Custom Date]';
        },
      } as unknown as Date;

      expect(formatTimestamp(invalidDate)).toBe('[Invalid Custom Date]');
    });
  });
});
