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
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
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
