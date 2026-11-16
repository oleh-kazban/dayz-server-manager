import type { LaunchPlatform } from '@aegis/api-contracts';

const WINDOWS_NEEDS_QUOTES = /[\s"&|<>^()%!]/;
const POSIX_SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/;
const POSIX_ESCAPED_QUOTE = "'\\''";

function quoteWindows(value: string): string {
  if (value.length > 0 && !WINDOWS_NEEDS_QUOTES.test(value)) {
    return value;
  }
  return `"${value}"`;
}

function quotePosix(value: string): string {
  if (value.length > 0 && POSIX_SAFE.test(value)) {
    return value;
  }
  const escaped = value.replace(/'/g, POSIX_ESCAPED_QUOTE);
  return `'${escaped}'`;
}

/**
 * Display-only rendering of the command for copy/paste and logs. The process supervisor must
 * spawn the `executable` + `args` array directly and never execute this string.
 */
export function formatCommandLine(
  executable: string,
  args: readonly string[],
  platform: LaunchPlatform,
): string {
  const quote = platform === 'win32' ? quoteWindows : quotePosix;
  return [executable, ...args].map(quote).join(' ');
}
