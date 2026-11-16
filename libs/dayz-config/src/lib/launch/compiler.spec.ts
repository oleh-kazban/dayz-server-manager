import {
  DEFAULT_LAUNCH_OPTIONS,
  EMPTY_LAUNCH_OPTIONS,
  launchCommandSchema,
  type LaunchOptionsDto,
} from '@aegis/api-contracts';

import { compileLaunchCommand, type LaunchCompileInput } from './compiler';

function input(overrides: Partial<LaunchCompileInput> = {}): LaunchCompileInput {
  return {
    platform: 'win32',
    installPath: 'C:\\DayZServer',
    profilePath: 'profiles',
    gamePort: 2302,
    launchOptions: DEFAULT_LAUNCH_OPTIONS,
    mods: { modFolders: [], serverModFolders: [] },
    ...overrides,
  };
}

function options(overrides: Partial<LaunchOptionsDto>): LaunchOptionsDto {
  return { ...EMPTY_LAUNCH_OPTIONS, ...overrides };
}

describe('compileLaunchCommand', () => {
  it('compiles managed and default operator flags for Windows', () => {
    const result = compileLaunchCommand(input());

    expect(result).toEqual({
      ready: true,
      executable: 'C:\\DayZServer\\DayZServer_x64.exe',
      cwd: 'C:\\DayZServer',
      args: [
        '-config=serverDZ.cfg',
        '-port=2302',
        '-profiles=profiles',
        '-BEpath=profiles\\BattlEye',
        '-cpuCount=4',
        '-doLogs',
        '-adminLog',
        '-netLog',
      ],
      commandLine:
        'C:\\DayZServer\\DayZServer_x64.exe -config=serverDZ.cfg -port=2302 -profiles=profiles -BEpath=profiles\\BattlEye -cpuCount=4 -doLogs -adminLog -netLog',
      segments: expect.any(Array),
      issues: [],
    });
    expect(launchCommandSchema.safeParse(result).success).toBe(true);
    expect(result.segments.map(s => s.source)).toEqual([
      'managed',
      'managed',
      'managed',
      'managed',
      'operator',
      'operator',
      'operator',
      'operator',
    ]);
  });

  it('compiles Linux paths, mods in order, and every operator flag', () => {
    const result = compileLaunchCommand(
      input({
        platform: 'linux',
        installPath: '/srv/dayz server/',
        gamePort: 2402,
        launchOptions: {
          cpuCount: 8,
          limitFPS: 120,
          doLogs: true,
          adminLog: true,
          netLog: true,
          freezeCheck: true,
          scriptDebug: true,
          filePatching: true,
        },
        mods: { modFolders: ['@CF', '@Dabs Framework'], serverModFolders: ['@Admin'] },
      }),
    );

    expect(result.ready).toBe(true);
    expect(result.executable).toBe('/srv/dayz server/DayZServer');
    expect(result.cwd).toBe('/srv/dayz server/');
    expect(result.args).toEqual([
      '-config=serverDZ.cfg',
      '-port=2402',
      '-profiles=profiles',
      '-BEpath=profiles/BattlEye',
      '-mod=@CF;@Dabs Framework',
      '-serverMod=@Admin',
      '-cpuCount=8',
      '-limitFPS=120',
      '-doLogs',
      '-adminLog',
      '-netLog',
      '-freezeCheck',
      '-scriptDebug=true',
      '-filePatching',
    ]);
    expect(result.segments.filter(s => s.source === 'mods').map(s => s.arg)).toEqual([
      '-mod=@CF;@Dabs Framework',
      '-serverMod=@Admin',
    ]);
    expect(result.commandLine).toContain("'/srv/dayz server/DayZServer'");
    expect(result.commandLine).toContain("'-mod=@CF;@Dabs Framework'");
    expect(result.issues.map(i => i.code)).toEqual([
      'LAUNCH_FILE_PATCHING_ENABLED',
      'LAUNCH_SCRIPT_DEBUG_ENABLED',
    ]);
    expect(result.issues.every(i => i.severity === 'warning')).toBe(true);
  });

  it('emits only managed flags when every option is off', () => {
    const result = compileLaunchCommand(input({ launchOptions: EMPTY_LAUNCH_OPTIONS }));
    expect(result.args).toHaveLength(4);
    expect(result.segments.every(s => s.source === 'managed')).toBe(true);
  });

  it('is deterministic and does not mutate its input', () => {
    const source = input({ mods: { modFolders: ['@B', '@A'], serverModFolders: [] } });
    const snapshot = structuredClone(source);
    expect(compileLaunchCommand(source)).toEqual(compileLaunchCommand(source));
    expect(source).toEqual(snapshot);
  });

  it('warns about enabled mods without a folder name', () => {
    const result = compileLaunchCommand(
      input({ mods: { modFolders: ['@CF'], serverModFolders: [], missingFolderCount: 2 } }),
    );
    expect(result.ready).toBe(true);
    expect(result.issues).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'LAUNCH_MOD_FOLDER_MISSING',
        field: 'mods',
        message: expect.stringContaining('2 enabled mod(s)'),
      }),
    ]);
  });

  it('accepts UNC install paths on Windows and quotes paths with spaces', () => {
    const result = compileLaunchCommand(input({ installPath: '\\\\nas\\games\\Day Z' }));
    expect(result.ready).toBe(true);
    expect(result.executable).toBe('\\\\nas\\games\\Day Z\\DayZServer_x64.exe');
    expect(result.commandLine.startsWith('"\\\\nas\\games\\Day Z\\DayZServer_x64.exe" ')).toBe(
      true,
    );
  });

  it.each([
    ['empty', ''],
    ['relative', 'DayZServer'],
    ['traversal', 'C:\\DayZ\\..\\Windows'],
    ['quote', 'C:\\Day"Z'],
    ['newline', 'C:\\DayZ\n-evil'],
    ['posix path on Windows', '/srv/dayz'],
  ])('refuses an invalid install path (%s)', (_, installPath) => {
    const result = compileLaunchCommand(input({ installPath }));
    expect(result.ready).toBe(false);
    expect(result.args).toEqual([]);
    expect(result.segments).toEqual([]);
    expect(result.commandLine).toBe('');
    expect(result.issues).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'LAUNCH_INSTALL_PATH_INVALID',
        field: 'installPath',
      }),
    ]);
  });

  it('refuses a Windows drive path on Linux', () => {
    const result = compileLaunchCommand(input({ platform: 'linux', installPath: 'C:\\DayZ' }));
    expect(result.issues[0].code).toBe('LAUNCH_INSTALL_PATH_INVALID');
    expect(result.issues[0].message).toContain('Linux');
  });

  it.each(['', '/etc', 'C:\\profiles', '../profiles', 'profiles/../..', 'pro"files', 'a//'])(
    'refuses an unsafe profile path %j',
    profilePath => {
      const result = compileLaunchCommand(input({ profilePath }));
      expect(result.ready).toBe(false);
      expect(result.issues.map(i => i.code)).toContain('LAUNCH_PROFILE_PATH_INVALID');
    },
  );

  it('accepts a nested relative profile path', () => {
    const result = compileLaunchCommand(input({ profilePath: 'data/profiles' }));
    expect(result.args).toContain('-profiles=data\\profiles');
    expect(result.args).toContain('-BEpath=data\\profiles\\BattlEye');
  });

  it.each([0, 1023, 65536, 2302.5, Number.NaN])('refuses game port %p', gamePort => {
    const result = compileLaunchCommand(input({ gamePort }));
    expect(result.ready).toBe(false);
    expect(result.issues[0]).toMatchObject({ code: 'LAUNCH_PORT_INVALID', field: 'gamePort' });
  });

  it.each(['CF', '@a;b', '@a/b', '@..', ' @CF', '@'])('refuses invalid mod folder %j', folder => {
    const result = compileLaunchCommand(
      input({ mods: { modFolders: [], serverModFolders: [folder] } }),
    );
    expect(result.ready).toBe(false);
    expect(result.issues.map(i => i.code)).toContain('LAUNCH_MOD_FOLDER_INVALID');
  });

  it.each([
    ['cpuCount out of range', options({ cpuCount: 65 })],
    ['limitFPS out of range', options({ limitFPS: 0 })],
    ['non-integer', options({ cpuCount: 2.5 })],
  ])('refuses invalid launch options (%s)', (_, launchOptions) => {
    const result = compileLaunchCommand(input({ launchOptions }));
    expect(result.ready).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'LAUNCH_OPTION_INVALID', field: 'launchOptions' }),
    ]);
  });

  it('refuses smuggled extra option keys', () => {
    const launchOptions = { ...EMPTY_LAUNCH_OPTIONS, extra: '-x' } as unknown as LaunchOptionsDto;
    expect(compileLaunchCommand(input({ launchOptions })).ready).toBe(false);
  });

  it('reports every input error at once', () => {
    const result = compileLaunchCommand(input({ installPath: '', profilePath: '..', gamePort: 1 }));
    expect(result.issues.map(i => i.code)).toEqual([
      'LAUNCH_INSTALL_PATH_INVALID',
      'LAUNCH_PROFILE_PATH_INVALID',
      'LAUNCH_PORT_INVALID',
    ]);
    expect(result.executable).toBe('');
  });

  it.each(['@x"y', '@tab\there', '@del\x7f'])(
    'refuses a valid @folder whose flag fails the final argument gate (%j)',
    folder => {
      const result = compileLaunchCommand(
        input({ mods: { modFolders: [folder], serverModFolders: [] } }),
      );
      expect(result).toMatchObject({ ready: false, args: [], segments: [], commandLine: '' });
      expect(result.issues).toEqual([
        expect.objectContaining({ severity: 'error', code: 'LAUNCH_ARG_UNSAFE' }),
      ]);
    },
  );

  it('refuses control characters in the profile path', () => {
    const result = compileLaunchCommand(input({ profilePath: 'pro\tfiles' }));
    expect(result.issues.map(i => i.code)).toEqual(['LAUNCH_PROFILE_PATH_INVALID']);
  });
});
