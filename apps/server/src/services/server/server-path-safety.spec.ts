import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getPlatformPathImpl,
  isDirectoryReadable,
  isHostAbsolutePath,
  isNonRelativeSubpath,
  isPathContainedWithin,
  normalizeRelativeSubpath,
  probeDirectoryWritable,
  safeLstat,
  safeRealpath,
  safeStat,
  validateColonPlacement,
  validateLexicalCandidate,
} from './server-path-safety';

describe('server-path-safety', () => {
  let tempDir: string;
  let tempReal: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-path-safety-'));
    tempReal = fs.realpathSync(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('selects platform-specific path implementations and classifies absolute/non-relative paths', () => {
    expect(getPlatformPathImpl('win32')).toBe(path.win32);
    expect(getPlatformPathImpl('linux')).toBe(path.posix);

    expect(isHostAbsolutePath('C:\\DayZServer', 'win32')).toBe(true);
    expect(isHostAbsolutePath('profiles', 'win32')).toBe(false);
    expect(isHostAbsolutePath('/opt/dayz', 'linux')).toBe(true);
    expect(isHostAbsolutePath('profiles', 'linux')).toBe(false);

    expect(isNonRelativeSubpath('D:\\Profiles', 'win32')).toBe(true);
    expect(isNonRelativeSubpath('\\profiles', 'win32')).toBe(true);
    expect(isNonRelativeSubpath('/profiles', 'win32')).toBe(true);
    expect(isNonRelativeSubpath('profiles\\custom', 'win32')).toBe(false);

    expect(isNonRelativeSubpath('/var/dayz', 'linux')).toBe(true);
    expect(isNonRelativeSubpath('\\profiles', 'linux')).toBe(true);
    expect(isNonRelativeSubpath('profiles/custom', 'linux')).toBe(false);

    expect(normalizeRelativeSubpath('a\\b//c\\d', path.posix)).toBe('a/b/c/d');
    expect(normalizeRelativeSubpath('a/b\\c//d', path.win32)).toBe('a\\b\\c\\d');
  });

  it('validates colon placement for Windows drive prefixes vs POSIX and illegal colons', () => {
    expect(validateColonPlacement('profiles/sub', 'linux')).toEqual({
      valid: true,
      trimmed: 'profiles/sub',
    });
    expect(validateColonPlacement('C:\\DayZServer', 'win32')).toEqual({
      valid: true,
      trimmed: 'C:\\DayZServer',
    });
    expect(validateColonPlacement('C:/DayZServer', 'linux')).toEqual({
      valid: false,
      code: 'PATH_PLATFORM_MISMATCH',
      message: 'Windows drive letter paths are not valid on this host platform.',
    });
    expect(validateColonPlacement('C:relative', 'win32')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateColonPlacement('C:\\DayZ:Server', 'win32')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateColonPlacement('foo:bar', 'linux')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
  });

  it('validates lexical candidates across empty, length, null bytes, traversal, and invalid chars', () => {
    expect(validateLexicalCandidate('', 'win32').valid).toBe(false);
    expect(validateLexicalCandidate(null as unknown as string, 'linux').valid).toBe(false);
    expect(validateLexicalCandidate('   ', 'linux').valid).toBe(false);
    expect(validateLexicalCandidate('a'.repeat(513), 'linux').valid).toBe(false);
    expect(validateLexicalCandidate('bad\0path', 'linux')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateLexicalCandidate('mpmissions/../etc', 'linux')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateLexicalCandidate('dir/<bad>', 'win32')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateLexicalCandidate('dir/ctrl\x07char', 'linux')).toMatchObject({
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
    });
    expect(validateLexicalCandidate('  profiles/live  ', 'linux')).toEqual({
      valid: true,
      trimmed: 'profiles/live',
    });
  });

  it('enforces structural path containment with allowEqual, sibling-prefix, and platform casing rules', () => {
    expect(isPathContainedWithin('C:\\DayZ\\Profiles', 'c:\\dayz', 'win32')).toBe(true);
    expect(isPathContainedWithin('C:\\DayZ', 'c:\\dayz', 'win32', false)).toBe(false);
    expect(isPathContainedWithin('C:\\DayZ', 'c:\\dayz', 'win32', true)).toBe(true);
    expect(isPathContainedWithin('C:\\DayZ2\\Profiles', 'C:\\DayZ', 'win32')).toBe(false);
    expect(isPathContainedWithin('D:\\Other\\Profiles', 'C:\\DayZ', 'win32')).toBe(false);

    expect(isPathContainedWithin('/opt/dayz/profiles', '/opt/dayz', 'linux')).toBe(true);
    expect(isPathContainedWithin('/opt/dayz', '/opt/dayz', 'linux', false)).toBe(false);
    expect(isPathContainedWithin('/opt/dayz', '/opt/dayz', 'linux', true)).toBe(true);
    expect(isPathContainedWithin('/opt/dayz2/profiles', '/opt/dayz', 'linux')).toBe(false);
    expect(isPathContainedWithin('/opt', '/opt/dayz', 'linux')).toBe(false);
  });

  it('inspects existing, missing, and dangling symlink filesystem entries safely', () => {
    const filePath = path.join(tempReal, 'sample.txt');
    fs.writeFileSync(filePath, 'ok', 'utf8');

    const statRes = safeStat(filePath);
    expect(statRes.exists).toBe(true);
    if (statRes.exists) {
      expect(statRes.stat.isFile()).toBe(true);
    }

    const lstatRes = safeLstat(filePath);
    expect(lstatRes.exists).toBe(true);

    expect(safeRealpath(filePath)).toBe(fs.realpathSync(filePath));

    const missingPath = path.join(tempReal, 'does-not-exist');
    expect(safeStat(missingPath)).toMatchObject({ exists: false, errorCode: 'ENOENT' });
    expect(safeLstat(missingPath)).toMatchObject({ exists: false, errorCode: 'ENOENT' });
    expect(safeRealpath(missingPath)).toBeNull();

    // Dangling junction/symlink target to check lstat vs stat divergence
    const externalTarget = path.join(tempReal, 'vanishing-target');
    fs.mkdirSync(externalTarget);
    const linkPath = path.join(tempReal, 'dangling-link');
    fs.symlinkSync(externalTarget, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    fs.rmSync(externalTarget, { recursive: true, force: true });

    expect(safeLstat(linkPath).exists).toBe(true);
    expect(safeStat(linkPath).exists).toBe(false);
    expect(safeRealpath(linkPath)).toBeNull();
  });

  it('checks directory readability and writable probe cleanup including error paths', () => {
    expect(isDirectoryReadable(tempReal, process.platform)).toBe(true);
    expect(isDirectoryReadable(tempReal, 'win32')).toBe(true);
    expect(isDirectoryReadable(tempReal, 'linux')).toBe(true);
    expect(isDirectoryReadable(path.join(tempReal, 'missing'), process.platform)).toBe(false);

    const pathImpl = getPlatformPathImpl(process.platform);
    expect(probeDirectoryWritable(tempReal, pathImpl)).toBe(true);
    expect(fs.readdirSync(tempReal)).toEqual([]);

    // Probe failure before opening file
    vi.spyOn(fs, 'openSync').mockImplementationOnce(() => {
      throw new Error('EACCES');
    });
    expect(probeDirectoryWritable(tempReal, pathImpl)).toBe(false);

    // Unlink failure after file descriptor opened still closes fd safely
    const closeSpy = vi.spyOn(fs, 'closeSync');
    vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      throw new Error('EPERM');
    });
    expect(probeDirectoryWritable(tempReal, pathImpl)).toBe(false);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
