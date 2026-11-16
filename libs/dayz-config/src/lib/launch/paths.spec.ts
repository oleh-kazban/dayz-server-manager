import {
  executableNameFor,
  isAbsoluteForPlatform,
  isSafeRelativePath,
  joinForPlatform,
  separatorFor,
} from './paths';

describe('launch paths', () => {
  it('names the executable and separator per platform', () => {
    expect(executableNameFor('win32')).toBe('DayZServer_x64.exe');
    expect(executableNameFor('linux')).toBe('DayZServer');
    expect(separatorFor('win32')).toBe('\\');
    expect(separatorFor('linux')).toBe('/');
  });

  it.each([
    ['win32', 'C:\\DayZ', true],
    ['win32', 'c:/DayZ', true],
    ['win32', '\\\\nas\\share', true],
    ['win32', 'C:', false],
    ['win32', '\\DayZ', false],
    ['win32', 'DayZ', false],
    ['linux', '/srv/dayz', true],
    ['linux', 'srv/dayz', false],
    ['linux', 'C:\\DayZ', false],
  ] as const)('isAbsoluteForPlatform(%s, %j) = %s', (platform, path, expected) => {
    expect(isAbsoluteForPlatform(path, platform)).toBe(expected);
  });

  it.each([
    ['win32', ['C:\\DayZ\\', 'profiles/', '/BattlEye'], 'C:\\DayZ\\profiles\\BattlEye'],
    ['win32', ['C:/DayZ', 'DayZServer_x64.exe'], 'C:\\DayZ\\DayZServer_x64.exe'],
    ['win32', ['\\\\nas\\share\\', 'x'], '\\\\nas\\share\\x'],
    ['win32', ['\\DayZ', 'x'], '\\DayZ\\x'],
    ['linux', ['/srv//dayz/', 'DayZServer'], '/srv/dayz/DayZServer'],
    ['linux', ['//srv', 'x'], '/srv/x'],
    ['linux', ['/', 'x'], '/x'],
    ['linux', ['profiles', 'BattlEye'], 'profiles/BattlEye'],
    ['linux', ['', ''], ''],
    ['linux', [], ''],
  ] as const)('joinForPlatform(%s, %j) = %j', (platform, segments, expected) => {
    expect(joinForPlatform(platform, ...segments)).toBe(expected);
  });

  it.each([
    ['profiles', true],
    ['data/profiles', true],
    ['data\\profiles', true],
    ['', false],
    ['/abs', false],
    ['\\abs', false],
    ['C:rel', false],
    ['..', false],
    ['a/../b', false],
    ['a//b', false],
  ])('isSafeRelativePath(%j) = %s', (path, expected) => {
    expect(isSafeRelativePath(path)).toBe(expected);
  });
});
