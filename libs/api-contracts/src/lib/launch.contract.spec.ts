import {
  DEFAULT_LAUNCH_OPTIONS,
  EMPTY_LAUNCH_OPTIONS,
  launchCommandPreviewSchema,
  launchOptionsSchema,
} from './launch.contract';

describe('launchOptionsSchema', () => {
  it('fills every missing key with its off value', () => {
    expect(launchOptionsSchema.parse({})).toEqual(EMPTY_LAUNCH_OPTIONS);
  });

  it('accepts the default options for new servers', () => {
    expect(launchOptionsSchema.parse(DEFAULT_LAUNCH_OPTIONS)).toEqual({
      cpuCount: 4,
      limitFPS: null,
      doLogs: true,
      adminLog: true,
      netLog: true,
      freezeCheck: false,
      scriptDebug: false,
      filePatching: false,
    });
  });

  it.each([
    [{ cpuCount: 0 }, 'cpuCount', 'CPU count must be between 1 and 64'],
    [{ cpuCount: 65 }, 'cpuCount', 'CPU count must be between 1 and 64'],
    [{ cpuCount: 1.5 }, 'cpuCount', 'CPU count must be a whole number'],
    [{ limitFPS: 0 }, 'limitFPS', 'FPS limit must be between 1 and 200'],
    [{ limitFPS: 201 }, 'limitFPS', 'FPS limit must be between 1 and 200'],
    [{ limitFPS: 60.5 }, 'limitFPS', 'FPS limit must be a whole number'],
    [{ doLogs: 'yes' }, 'doLogs', undefined],
  ])('rejects %j', (input, path, message) => {
    const result = launchOptionsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([path]);
      if (message) {
        expect(result.error.issues[0].message).toBe(message);
      }
    }
  });

  it('rejects unknown keys so no free-form argument can be smuggled in', () => {
    expect(launchOptionsSchema.safeParse({ extraArgs: '-evil' }).success).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(launchOptionsSchema.safeParse({ cpuCount: 1, limitFPS: 200 }).success).toBe(true);
    expect(launchOptionsSchema.safeParse({ cpuCount: 64, limitFPS: 1 }).success).toBe(true);
  });
});

describe('launchCommandPreviewSchema', () => {
  it('parses a preview payload', () => {
    const payload = {
      serverId: '7f0c6a52-1d5c-4c3e-9b4b-0c6f1f7f6e10',
      platform: 'linux',
      mods: { modFolders: ['@CF'], serverModFolders: [], missingFolderCount: 0 },
      command: {
        ready: true,
        executable: '/srv/dayz/DayZServer',
        cwd: '/srv/dayz',
        args: ['-config=serverDZ.cfg'],
        commandLine: '/srv/dayz/DayZServer -config=serverDZ.cfg',
        segments: [{ arg: '-config=serverDZ.cfg', source: 'managed' }],
        issues: [
          {
            severity: 'warning',
            code: 'LAUNCH_SCRIPT_DEBUG_ENABLED',
            message: 'x',
            field: 'launchOptions.scriptDebug',
          },
        ],
      },
    };
    expect(launchCommandPreviewSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an unknown platform', () => {
    expect(launchCommandPreviewSchema.shape.platform.safeParse('darwin').success).toBe(false);
  });
});
