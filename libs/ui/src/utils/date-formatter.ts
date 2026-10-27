/**
 * Utility functions for date-only (YYYY-MM-DD) manipulation without timezone drift.
 */

export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new RangeError(`Invalid date-only value: ${dateString}`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new RangeError(`Invalid date-only value: ${dateString}`);
  }

  return date;
}

export function formatDateOnly(
  dateOrString: string | Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof dateOrString === 'string' ? parseDateOnly(dateOrString) : dateOrString;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, options ?? defaultOptions).format(date);
}

/**
 * Formats a Date or date string into human-friendly relative time.
 *
 * @param timestamp - ISO string or Date instance.
 * @returns Human-readable string representation (e.g. "Just now", "5m ago", "2h ago").
 */
export function formatTimestamp(timestamp: string | Date): string {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  try {
    const diffMs = Date.now() - timestamp.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  } catch {
    return String(timestamp);
  }
}
