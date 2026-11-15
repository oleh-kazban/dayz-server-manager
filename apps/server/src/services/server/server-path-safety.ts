import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type PlatformPathImpl = typeof path.win32 | typeof path.posix;

export type LexicalValidationResult =
  | { valid: true; trimmed: string }
  | { valid: false; code: 'PATH_LEXICAL_INVALID' | 'PATH_PLATFORM_MISMATCH'; message: string };

export type SafeStatResult =
  { exists: true; stat: fs.Stats } | { exists: false; errorCode?: string };

export function getPlatformPathImpl(platform: NodeJS.Platform): PlatformPathImpl {
  return platform === 'win32' ? path.win32 : path.posix;
}

export function isHostAbsolutePath(targetPath: string, platform: NodeJS.Platform): boolean {
  return getPlatformPathImpl(platform).isAbsolute(targetPath);
}

export function isNonRelativeSubpath(trimmed: string, platform: NodeJS.Platform): boolean {
  return isHostAbsolutePath(trimmed, platform) || /^[\\/]/.test(trimmed);
}

export function normalizeRelativeSubpath(subpath: string, pathImpl: PlatformPathImpl): string {
  return subpath.replace(/[\\/]+/g, pathImpl.sep);
}

export function validateColonPlacement(
  trimmed: string,
  platform: NodeJS.Platform,
): LexicalValidationResult {
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    return { valid: true, trimmed };
  }

  const validDriveColon =
    colonIndex === 1 && /^[a-zA-Z]:[\\/]/.test(trimmed) && trimmed.indexOf(':', 2) === -1;
  if (!validDriveColon) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Colons are only permitted in Windows drive letter prefixes.',
    };
  }

  if (platform !== 'win32') {
    return {
      valid: false,
      code: 'PATH_PLATFORM_MISMATCH',
      message: 'Windows drive letter paths are not valid on this host platform.',
    };
  }

  return { valid: true, trimmed };
}

export function validateLexicalCandidate(
  rawPath: string,
  platform: NodeJS.Platform,
): LexicalValidationResult {
  if (!rawPath || typeof rawPath !== 'string') {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path must be a non-empty string.',
    };
  }

  const trimmed = rawPath.trim();
  if (trimmed.length === 0 || trimmed.length > 512) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path length must be between 1 and 512 characters.',
    };
  }

  if (trimmed.includes('\0')) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Null bytes are forbidden in paths.',
    };
  }

  if (trimmed.includes('..')) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path traversal (..) is not permitted.',
    };
  }

  const hasControlChar = Array.from(trimmed).some(ch => ch.charCodeAt(0) < 32);
  if (/[<>"|?*]/.test(trimmed) || hasControlChar) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path contains invalid filesystem characters.',
    };
  }

  return validateColonPlacement(trimmed, platform);
}

export function isPathContainedWithin(
  candidateReal: string,
  baseReal: string,
  platform: NodeJS.Platform,
  allowEqual = false,
): boolean {
  const pathImpl = getPlatformPathImpl(platform);
  const normalizedCandidate = platform === 'win32' ? candidateReal.toLowerCase() : candidateReal;
  const normalizedBase = platform === 'win32' ? baseReal.toLowerCase() : baseReal;
  const rel = pathImpl.relative(normalizedBase, normalizedCandidate);
  if (rel === '') {
    return allowEqual;
  }
  const escapesParent = rel === '..' || rel.startsWith(`..${pathImpl.sep}`);
  return !escapesParent && !pathImpl.isAbsolute(rel);
}

function safeStatWith(targetPath: string, statFn: (p: string) => fs.Stats): SafeStatResult {
  try {
    return { exists: true, stat: statFn(targetPath) };
  } catch (err) {
    return {
      exists: false,
      errorCode: (err as NodeJS.ErrnoException).code,
    };
  }
}

export function safeStat(targetPath: string): SafeStatResult {
  return safeStatWith(targetPath, p => fs.statSync(p));
}

export function safeLstat(targetPath: string): SafeStatResult {
  return safeStatWith(targetPath, p => fs.lstatSync(p));
}

export function safeRealpath(targetPath: string): string | null {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

export function isDirectoryReadable(dirPath: string, platform: NodeJS.Platform): boolean {
  try {
    const mode = platform === 'win32' ? fs.constants.R_OK : fs.constants.R_OK | fs.constants.X_OK;
    fs.accessSync(dirPath, mode);
    return true;
  } catch {
    return false;
  }
}

export function probeDirectoryWritable(dirPath: string, pathImpl: PlatformPathImpl): boolean {
  const probeFile = pathImpl.join(dirPath, `.dsm_fs_probe_${crypto.randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    try {
      fd = fs.openSync(
        probeFile,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o600,
      );
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
      }
    }
    fs.unlinkSync(probeFile);
    return true;
  } catch {
    return false;
  }
}
