import { describe, expect, it } from 'vitest';

import { DEFAULT_LAUNCH_OPTIONS, EMPTY_LAUNCH_OPTIONS } from '@aegis/api-contracts';

import {
  areLaunchOptionsEqual,
  buildLaunchCommandPreview,
  readLaunchOptions,
  resolveLaunchPlatform,
} from './launch-command.service';

describe('launch-command.service', () => {
  it('maps the host platform to a DayZ launch platform', () => {
    expect(resolveLaunchPlatform('win32')).toBe('win32');
    expect(resolveLaunchPlatform('linux')).toBe('linux');
    expect(resolveLaunchPlatform('darwin')).toBe('linux');
    expect(['win32', 'linux']).toContain(resolveLaunchPlatform());
  });

  it('normalises stored launch options, filling keys missing from older rows', () => {
    expect(readLaunchOptions({ launchOptions: { doLogs: true } as never })).toEqual({
      ...EMPTY_LAUNCH_OPTIONS,
      doLogs: true,
    });
    expect(readLaunchOptions({ launchOptions: null as never })).toEqual(EMPTY_LAUNCH_OPTIONS);
  });

  it('compares launch options by value', () => {
    expect(areLaunchOptionsEqual(DEFAULT_LAUNCH_OPTIONS, { ...DEFAULT_LAUNCH_OPTIONS })).toBe(true);
    expect(
      areLaunchOptionsEqual(DEFAULT_LAUNCH_OPTIONS, { ...DEFAULT_LAUNCH_OPTIONS, cpuCount: 2 }),
    ).toBe(false);
  });

  it('builds a not-ready preview when stored server state is unsafe', () => {
    const preview = buildLaunchCommandPreview(
      {
        id: '44444444-4444-4444-a444-444444444444',
        installPath: 'relative/path',
        profilePath: 'profiles',
        gamePort: 2302,
        launchOptions: DEFAULT_LAUNCH_OPTIONS,
      },
      [],
      'linux',
    );
    expect(preview.command.ready).toBe(false);
    expect(preview.command.args).toEqual([]);
    expect(preview.command.issues[0].code).toBe('LAUNCH_INSTALL_PATH_INVALID');
    expect(preview.mods).toEqual({ modFolders: [], serverModFolders: [], missingFolderCount: 0 });
  });
});
