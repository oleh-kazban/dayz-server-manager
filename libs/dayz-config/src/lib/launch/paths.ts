import type { LaunchPlatform } from '@aegis/api-contracts';

const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/;
const WINDOWS_UNC = /^\\\\[^\\/]+[\\/][^\\/]+/;

export function executableNameFor(platform: LaunchPlatform): string {
  return platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
}

export function separatorFor(platform: LaunchPlatform): '\\' | '/' {
  return platform === 'win32' ? '\\' : '/';
}

export function isAbsoluteForPlatform(path: string, platform: LaunchPlatform): boolean {
  if (platform === 'win32') {
    return WINDOWS_ABSOLUTE.test(path) || WINDOWS_UNC.test(path);
  }
  return path.startsWith('/');
}

/** Joins path segments with the platform separator, normalising separators inside each segment. */
export function joinForPlatform(platform: LaunchPlatform, ...segments: string[]): string {
  const sep = separatorFor(platform);
  const parts = segments.flatMap(segment => segment.split(/[\\/]/)).filter(part => part !== '');
  return rootOf(segments[0] ?? '', platform) + parts.join(sep);
}

/** Root of a path: `\\` (Windows UNC share), the separator (absolute) or `''` (drive/relative). */
function rootOf(path: string, platform: LaunchPlatform): string {
  if (platform === 'win32' && /^[\\/]{2}[^\\/]/.test(path)) {
    return '\\\\';
  }
  return /^[\\/]/.test(path) ? separatorFor(platform) : '';
}

/** True when `path` is a safe relative path: not absolute, no `..` segment, no empty name. */
export function isSafeRelativePath(path: string): boolean {
  if (path.length === 0 || /^[\\/]/.test(path) || /^[A-Za-z]:/.test(path)) {
    return false;
  }
  return path.split(/[\\/]/).every(segment => segment.length > 0 && segment !== '..');
}
