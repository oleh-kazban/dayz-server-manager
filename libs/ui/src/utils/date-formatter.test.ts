import { describe, expect, it } from 'vitest';

import { formatDateOnly, parseDateOnly, toDateOnlyString } from './date-formatter';

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
});
