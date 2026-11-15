import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SERVER_FS_CHECK_STATUS,
  SERVER_FS_ISSUE_SEVERITY,
  SERVER_FS_PATH_TARGET,
} from '@aegis/api-contracts';

import {
  findFirstValidMissionTemplate,
  ServerFsInspectorService,
  serverFsInspectorService,
} from './server-fs-inspector.service';

const TEST_SERVER_ID = '11111111-1111-4111-a111-111111111111';
const SYMLINK_DIR_TYPE: fs.symlink.Type = process.platform === 'win32' ? 'junction' : 'dir';

interface DayzHostFixture {
  root: string;
  installDir: string;
  profileDir: string;
  battleyeDir: string;
  mpmissionsDir: string;
  executablePath: string;
  createMission: (name: string, options?: { init?: boolean; db?: boolean }) => string;
}

describe('ServerFsInspectorService (apps/server/src/services/server)', () => {
  const createdRoots: string[] = [];
  const originalPlatform = process.platform;
  let service: ServerFsInspectorService;

  const createTempRoot = (prefix = 'dsm-fs-inspector-'): string => {
    const raw = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const real = fs.realpathSync(raw);
    createdRoots.push(real);
    return real;
  };

  const createExecutableFile = (installDir: string, platform: NodeJS.Platform): string => {
    const exeName = platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
    const exePath = path.join(installDir, exeName);
    fs.writeFileSync(exePath, 'dayz-server-binary');
    if (platform !== 'win32') {
      fs.chmodSync(exePath, 0o700);
    }
    return exePath;
  };

  const createValidDayzFixture = (options?: {
    withExe?: boolean;
    withBattlEye?: boolean;
    withMpmissions?: boolean;
  }): DayzHostFixture => {
    const root = createTempRoot();
    const installDir = path.join(root, 'DayZServer');
    const profileDir = path.join(installDir, 'profiles');
    const battleyeDir = path.join(profileDir, 'BattlEye');
    const mpmissionsDir = path.join(installDir, 'mpmissions');

    fs.mkdirSync(profileDir, { recursive: true });
    if (options?.withBattlEye ?? true) {
      fs.mkdirSync(battleyeDir, { recursive: true });
    }
    if (options?.withMpmissions ?? true) {
      fs.mkdirSync(mpmissionsDir, { recursive: true });
    }

    const expectedExeName = process.platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
    const executablePath =
      (options?.withExe ?? true)
        ? createExecutableFile(installDir, process.platform)
        : path.join(installDir, expectedExeName);

    const createMission = (name: string, missionOpts?: { init?: boolean; db?: boolean }) => {
      const missionDir = path.join(mpmissionsDir, name);
      fs.mkdirSync(missionDir, { recursive: true });
      if (missionOpts?.init ?? true) {
        fs.writeFileSync(path.join(missionDir, 'init.c'), 'void main() {}');
      }
      if (missionOpts?.db ?? true) {
        fs.mkdirSync(path.join(missionDir, 'db'), { recursive: true });
      }
      return missionDir;
    };

    return {
      root,
      installDir,
      profileDir,
      battleyeDir,
      mpmissionsDir,
      executablePath,
      createMission,
    };
  };

  const withMockedPlatform = <T>(platform: NodeJS.Platform, fn: () => T): T => {
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });
    try {
      return fn();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new ServerFsInspectorService();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    vi.restoreAllMocks();
    while (createdRoots.length > 0) {
      const dir = createdRoots.pop()!;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('REQ-01: Installation Directory & Executable Verification', () => {
    it('validates an existing readable installPath with the host executable and zero issues', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(true);
      expect(result.serverId).toBe(TEST_SERVER_ID);
      expect(result.platform).toBe(process.platform);
      expect(result.issues).toEqual([]);
      expect(result.paths.installPath).toEqual({
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: fixture.installDir,
        resolvedPath: fixture.installDir,
        status: SERVER_FS_CHECK_STATUS.VALID,
        exists: true,
        isDirectory: true,
        executablePath: fixture.executablePath,
        executablePresent: true,
        executableRunnable: true,
      });
    });

    it('rejects relative installPath and marks dependent relative paths as skipped', () => {
      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: 'relative/DayZServer',
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.discoveredMissions).toEqual([]);
      expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
          code: 'INSTALL_PATH_NOT_ABSOLUTE',
        }),
      );
    });

    it('reports INSTALL_DIR_MISSING when installPath does not exist or stat fails with EACCES/EPERM', () => {
      const root = createTempRoot();
      const missingDir = path.join(root, 'DoesNotExist');

      const missingRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: missingDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(missingRes.valid).toBe(false);
      expect(missingRes.paths.installPath.exists).toBe(false);
      expect(missingRes.paths.installPath.isDirectory).toBe(false);
      expect(missingRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'INSTALL_DIR_MISSING',
          message: expect.stringContaining('does not exist'),
        }),
      );

      vi.spyOn(fs, 'statSync').mockImplementationOnce(() => {
        const err = new Error('EACCES: denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      });

      const deniedRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: missingDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(deniedRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'INSTALL_DIR_MISSING',
          message: expect.stringContaining('Permission denied inspecting'),
        }),
      );
    });

    it('reports INSTALL_PATH_NOT_DIRECTORY when installPath points to a file', () => {
      const root = createTempRoot();
      const filePath = path.join(root, 'not-a-dir.txt');
      fs.writeFileSync(filePath, 'plain-file');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: filePath,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.installPath.exists).toBe(true);
      expect(result.paths.installPath.isDirectory).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'INSTALL_PATH_NOT_DIRECTORY',
        }),
      );
    });

    it('reports INSTALL_DIR_MISSING when installPath lacks read/traverse permissions and handles realpath fallback', () => {
      const fixture = createValidDayzFixture();
      vi.spyOn(fs, 'realpathSync').mockImplementation(() => {
        throw new Error('EIO');
      });
      vi.spyOn(fs, 'accessSync').mockImplementationOnce(() => {
        throw new Error('EACCES');
      });

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.installPath.exists).toBe(true);
      expect(result.paths.installPath.isDirectory).toBe(true);
      expect(result.paths.installPath.resolvedPath).toBe(fixture.installDir);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'INSTALL_DIR_MISSING',
          message: expect.stringContaining('lacks read or traverse permissions'),
        }),
      );
    });

    it('reports EXECUTABLE_MISSING when DayZ executable is absent while still discovering missions', () => {
      const fixture = createValidDayzFixture({ withExe: false });
      fixture.createMission('dayzOffline.chernarusplus');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.paths.installPath.executablePresent).toBe(false);
      expect(result.paths.installPath.executableRunnable).toBe(false);
      expect(result.discoveredMissions).toHaveLength(1);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'EXECUTABLE_MISSING',
        }),
      );
    });

    it('reports EXECUTABLE_NOT_FILE when DayZ executable path is a directory', () => {
      const fixture = createValidDayzFixture({ withExe: false });
      fixture.createMission('dayzOffline.chernarusplus');
      fs.mkdirSync(fixture.executablePath);

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.installPath.executablePresent).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          code: 'EXECUTABLE_NOT_FILE',
        }),
      );
    });
  });

  describe('Cross-Platform Simulation (Windows & POSIX Linux Branches)', () => {
    it('enforces X_OK execution permission on Linux DayZServer binary', () => {
      const linuxInstall = '/opt/dayz';
      const linuxProfile = '/opt/dayz/profiles';
      const linuxBattlEye = '/opt/dayz/profiles/BattlEye';
      const linuxMissions = '/opt/dayz/mpmissions';
      const linuxMission = '/opt/dayz/mpmissions/dayzOffline.chernarusplus';
      const linuxExe = '/opt/dayz/DayZServer';

      const dirStat = { isDirectory: () => true, isFile: () => false } as fs.Stats;
      const fileStat = { isDirectory: () => false, isFile: () => true } as fs.Stats;

      withMockedPlatform('linux', () => {
        vi.spyOn(fs, 'statSync').mockImplementation(target => {
          const s = String(target);
          if (s === linuxExe || s === `${linuxMission}/init.c`) return fileStat;
          if (
            s === linuxInstall ||
            s === linuxProfile ||
            s === linuxBattlEye ||
            s === linuxMissions ||
            s === linuxMission ||
            s === `${linuxMission}/db`
          ) {
            return dirStat;
          }
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        });
        vi.spyOn(fs, 'realpathSync').mockImplementation(target => String(target));
        vi.spyOn(fs, 'readdirSync').mockReturnValue([] as unknown as fs.Dirent[]);
        vi.spyOn(fs, 'openSync').mockReturnValue(42);
        vi.spyOn(fs, 'closeSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

        // 1. Pass when X_OK succeeds
        const accessPass = vi.spyOn(fs, 'accessSync').mockImplementation(() => undefined);
        const passRes = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: linuxInstall,
          profilePath: 'profiles',
          missionPath: 'dayzOffline.chernarusplus',
        });

        expect(passRes.valid).toBe(true);
        expect(passRes.platform).toBe('linux');
        expect(passRes.paths.installPath.executablePath).toBe(linuxExe);
        expect(passRes.paths.installPath.executableRunnable).toBe(true);
        expect(accessPass).toHaveBeenCalledWith(
          linuxInstall,
          fs.constants.R_OK | fs.constants.X_OK,
        );
        expect(accessPass).toHaveBeenCalledWith(linuxExe, fs.constants.X_OK);

        // 2. Fail with EXECUTABLE_NOT_EXECUTABLE when X_OK throws on DayZServer
        vi.spyOn(fs, 'accessSync').mockImplementation((target, mode) => {
          if (String(target) === linuxExe && mode === fs.constants.X_OK) {
            throw new Error('EACCES');
          }
        });

        const failRes = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: linuxInstall,
          profilePath: 'profiles',
          missionPath: 'dayzOffline.chernarusplus',
        });

        expect(failRes.valid).toBe(false);
        expect(failRes.paths.installPath.executablePresent).toBe(true);
        expect(failRes.paths.installPath.executableRunnable).toBe(false);
        expect(failRes.issues).toContainEqual(
          expect.objectContaining({
            target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
            code: 'EXECUTABLE_NOT_EXECUTABLE',
            path: linuxExe,
          }),
        );
      });
    });

    it('rejects Windows drive prefixes with PATH_PLATFORM_MISMATCH on non-Windows platforms', () => {
      const statSpy = vi.spyOn(fs, 'statSync');

      const result = withMockedPlatform('linux', () =>
        service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: 'C:\\DayZServer',
          profilePath: 'D:\\Profiles',
          missionPath: 'E:\\Missions\\custom',
        }),
      );

      expect(statSpy).not.toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.issues.map(i => i.code)).toEqual([
        'PATH_PLATFORM_MISMATCH',
        'PATH_PLATFORM_MISMATCH',
        'PATH_PLATFORM_MISMATCH',
      ]);
    });

    it('validates Windows executable and case-insensitive containment on win32 platform', () => {
      const winInstall = 'C:\\DayZServer';
      const winExe = 'C:\\DayZServer\\DayZServer_x64.exe';
      const winProfile = 'C:\\DayZServer\\profiles';
      const winBattlEye = 'C:\\DayZServer\\profiles\\BattlEye';
      const winMissions = 'C:\\DayZServer\\mpmissions';
      const winMission = 'C:\\DayZServer\\mpmissions\\dayzOffline.chernarusplus';

      const dirStat = { isDirectory: () => true, isFile: () => false } as fs.Stats;
      const fileStat = { isDirectory: () => false, isFile: () => true } as fs.Stats;

      withMockedPlatform('win32', () => {
        vi.spyOn(fs, 'statSync').mockImplementation(target => {
          const s = String(target).toLowerCase();
          if (s === winExe.toLowerCase() || s === `${winMission}\\init.c`.toLowerCase()) {
            return fileStat;
          }
          if (
            s === winInstall.toLowerCase() ||
            s === winProfile.toLowerCase() ||
            s === winBattlEye.toLowerCase() ||
            s === winMissions.toLowerCase() ||
            s === winMission.toLowerCase() ||
            s === `${winMission}\\db`.toLowerCase()
          ) {
            return dirStat;
          }
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        });
        // Mixed case realpath exercises case-insensitive win32 containment
        vi.spyOn(fs, 'realpathSync').mockImplementation(target =>
          String(target).replace('C:\\DayZServer', 'c:\\dayzserver'),
        );
        vi.spyOn(fs, 'accessSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'readdirSync').mockReturnValue([] as unknown as fs.Dirent[]);
        vi.spyOn(fs, 'openSync').mockReturnValue(7);
        vi.spyOn(fs, 'closeSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

        const result = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: winInstall,
          profilePath: 'profiles',
          missionPath: 'mpmissions\\dayzOffline.chernarusplus',
        });

        expect(result.valid).toBe(true);
        expect(result.platform).toBe('win32');
        expect(result.paths.installPath.executablePath).toBe('c:\\dayzserver\\DayZServer_x64.exe');
        expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.VALID);
      });
    });

    it('rejects cross-drive symlink escapes on win32 where path.relative yields an absolute path', () => {
      const winInstall = 'C:\\DayZServer';
      const winMissions = 'C:\\DayZServer\\mpmissions';
      const winMission = 'C:\\DayZServer\\mpmissions\\escaped';

      const dirStat = { isDirectory: () => true, isFile: () => false } as fs.Stats;
      const fileStat = { isDirectory: () => false, isFile: () => true } as fs.Stats;

      withMockedPlatform('win32', () => {
        vi.spyOn(fs, 'statSync').mockImplementation(target => {
          const s = String(target);
          if (s === 'C:\\DayZServer\\DayZServer_x64.exe') return fileStat;
          if (s === winInstall || s === winMissions || s === winMission) return dirStat;
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        });
        vi.spyOn(fs, 'realpathSync').mockImplementation(target => {
          const s = String(target);
          if (s === winMission) return 'D:\\ExternalVolume\\secretMission';
          return s;
        });
        vi.spyOn(fs, 'accessSync').mockImplementation(() => undefined);
        vi.spyOn(fs, 'readdirSync').mockReturnValue([] as unknown as fs.Dirent[]);

        const result = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: winInstall,
          profilePath: 'profiles',
          missionPath: 'escaped',
        });

        expect(result.valid).toBe(false);
        expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            target: SERVER_FS_PATH_TARGET.MISSION_PATH,
            code: 'MISSION_SYMLINK_ESCAPE',
            path: 'D:\\ExternalVolume\\secretMission',
          }),
        );
      });
    });
  });

  describe('GUARD-01: Lexical Path Validation Ahead of Filesystem Syscalls', () => {
    it.each([
      { label: 'empty string', badPath: '' },
      { label: 'whitespace-only string', badPath: '   ' },
      { label: 'non-string runtime value', badPath: null as unknown as string },
    ])(
      'rejects installPath and profilePath lexical violation ($label) without syscalls while skipping optional missionPath',
      ({ badPath }) => {
        const statSpy = vi.spyOn(fs, 'statSync');
        const readdirSpy = vi.spyOn(fs, 'readdirSync');
        const openSpy = vi.spyOn(fs, 'openSync');

        const result = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: badPath,
          profilePath: badPath,
          missionPath: badPath,
        });

        expect(statSpy).not.toHaveBeenCalled();
        expect(readdirSpy).not.toHaveBeenCalled();
        expect(openSpy).not.toHaveBeenCalled();

        expect(result.valid).toBe(false);
        expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
        expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
        expect(result.discoveredMissions).toEqual([]);
        expect(result.issues.map(i => i.code)).toEqual([
          'PATH_LEXICAL_INVALID',
          'PATH_LEXICAL_INVALID',
        ]);
      },
    );

    it.each([
      { label: 'path exceeding 512 characters', badPath: `/${'a'.repeat(512)}` },
      { label: 'null byte', badPath: '/opt/dayz\0evil' },
      { label: 'parent directory traversal', badPath: '/opt/dayz/../etc/passwd' },
      { label: 'invalid filesystem char <', badPath: '/opt/dayz/<bad>' },
      { label: 'invalid filesystem char *', badPath: '/opt/dayz/wild*card' },
      { label: 'ASCII control char', badPath: '/opt/dayz/\nnewline' },
      { label: 'leading colon', badPath: ':invalid' },
      { label: 'non-alpha drive prefix', badPath: '1:\\DayZServer' },
      { label: 'extra colon in path', badPath: '/opt/dayz:stream' },
    ])(
      'rejects lexical violation ($label) without issuing fs.statSync, readdirSync, or openSync',
      ({ badPath }) => {
        const statSpy = vi.spyOn(fs, 'statSync');
        const readdirSpy = vi.spyOn(fs, 'readdirSync');
        const openSpy = vi.spyOn(fs, 'openSync');

        const result = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: badPath,
          profilePath: badPath,
          missionPath: badPath,
        });

        expect(statSpy).not.toHaveBeenCalled();
        expect(readdirSpy).not.toHaveBeenCalled();
        expect(openSpy).not.toHaveBeenCalled();

        expect(result.valid).toBe(false);
        expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
        expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
        expect(result.discoveredMissions).toEqual([]);
        expect(result.issues.map(i => i.code)).toEqual([
          'PATH_LEXICAL_INVALID',
          'PATH_LEXICAL_INVALID',
          'PATH_LEXICAL_INVALID',
        ]);
      },
    );

    it.each([
      { label: 'drive-relative subpath', badPath: 'C:profiles' },
      { label: 'bare drive prefix without separator', badPath: 'C:' },
    ])(
      'rejects Windows drive-relative $label ($badPath) on win32 without invoking fs syscalls',
      ({ badPath }) => {
        withMockedPlatform('win32', () => {
          const statSpy = vi.spyOn(fs, 'statSync');
          const readdirSpy = vi.spyOn(fs, 'readdirSync');
          const openSpy = vi.spyOn(fs, 'openSync');

          const result = service.inspect({
            serverId: TEST_SERVER_ID,
            installPath: badPath,
            profilePath: badPath,
            missionPath: badPath,
          });

          expect(statSpy).not.toHaveBeenCalled();
          expect(readdirSpy).not.toHaveBeenCalled();
          expect(openSpy).not.toHaveBeenCalled();

          expect(result.valid).toBe(false);
          expect(result.platform).toBe('win32');
          expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
          expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
          expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
          expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
          expect(result.discoveredMissions).toEqual([]);
          expect(result.issues.map(i => i.code)).toEqual([
            'PATH_LEXICAL_INVALID',
            'PATH_LEXICAL_INVALID',
            'PATH_LEXICAL_INVALID',
          ]);
        });
      },
    );
  });

  describe('Option B: Strictly Relative profilePath & missionPath Enforcement', () => {
    it.each([
      {
        platform: 'win32' as const,
        label: 'Windows drive-letter paths',
        profilePath: 'D:\\Profiles',
        missionPath: 'D:\\Missions\\custom',
      },
      {
        platform: 'win32' as const,
        label: 'leading backslash paths on Windows',
        profilePath: '\\profiles',
        missionPath: '\\mpmissions\\dayzOffline.chernarusplus',
      },
      {
        platform: 'win32' as const,
        label: 'leading forward-slash paths on Windows',
        profilePath: '/profiles',
        missionPath: '/mpmissions/dayzOffline.chernarusplus',
      },
      {
        platform: 'linux' as const,
        label: 'POSIX absolute paths on Linux',
        profilePath: '/var/dayz/profiles',
        missionPath: '/opt/dayz/mpmissions/dayzOffline.chernarusplus',
      },
      {
        platform: 'linux' as const,
        label: 'leading backslash paths on Linux',
        profilePath: '\\profiles',
        missionPath: '\\mpmissions\\custom',
      },
    ])(
      'rejects $label ($profilePath / $missionPath) with PROFILE_PATH_NOT_RELATIVE & MISSION_PATH_NOT_RELATIVE ahead of fs syscalls',
      ({ platform, profilePath, missionPath }) => {
        withMockedPlatform(platform, () => {
          const statSpy = vi.spyOn(fs, 'statSync');
          const readdirSpy = vi.spyOn(fs, 'readdirSync');
          const openSpy = vi.spyOn(fs, 'openSync');

          const result = service.inspect({
            serverId: TEST_SERVER_ID,
            installPath: 'relative/DayZServer',
            profilePath,
            missionPath,
          });

          expect(statSpy).not.toHaveBeenCalled();
          expect(readdirSpy).not.toHaveBeenCalled();
          expect(openSpy).not.toHaveBeenCalled();

          expect(result.valid).toBe(false);
          expect(result.paths.profilePath).toEqual({
            target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
            configuredPath: profilePath,
            resolvedPath: null,
            status: SERVER_FS_CHECK_STATUS.ERROR,
            exists: false,
            isDirectory: null,
            writable: null,
          });
          expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
          expect(result.paths.missionPath).toEqual({
            target: SERVER_FS_PATH_TARGET.MISSION_PATH,
            configuredPath: missionPath,
            resolvedPath: null,
            status: SERVER_FS_CHECK_STATUS.ERROR,
            exists: false,
            isDirectory: null,
            hasInitScript: null,
            hasEconomyDb: null,
          });
          expect(result.issues).toContainEqual(
            expect.objectContaining({
              target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
              severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
              code: 'PROFILE_PATH_NOT_RELATIVE',
            }),
          );
          expect(result.issues).toContainEqual(
            expect.objectContaining({
              target: SERVER_FS_PATH_TARGET.MISSION_PATH,
              severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
              code: 'MISSION_PATH_NOT_RELATIVE',
            }),
          );
        });
      },
    );

    it('discovers missions under valid installPath while rejecting absolute profilePath and missionPath without probing them on disk', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');

      const externalProfile = path.join(fixture.root, 'external-profiles');
      const externalMission = path.join(fixture.root, 'external-mission');
      const statSpy = vi.spyOn(fs, 'statSync');
      const openSpy = vi.spyOn(fs, 'openSync');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: externalProfile,
        missionPath: externalMission,
      });

      expect(result.valid).toBe(false);
      expect(result.discoveredMissions).toHaveLength(1);
      expect(result.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.VALID);
      expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(result.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.issues.map(i => i.code)).toEqual([
        'PROFILE_PATH_NOT_RELATIVE',
        'MISSION_PATH_NOT_RELATIVE',
      ]);
      expect(statSpy).not.toHaveBeenCalledWith(externalProfile);
      expect(statSpy).not.toHaveBeenCalledWith(externalMission);
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('REQ-02 & GUARD-03: Auto-Discovery of Installed DayZ Missions', () => {
    it('discovers depth-1 mission directories sorted alphabetically and excludes files, hidden entries, and depth-2 dirs', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.sakhal', { init: true, db: false });
      const chernarus = fixture.createMission('dayzOffline.chernarusplus', {
        init: true,
        db: true,
      });
      fixture.createMission('dayzOffline.enoch', { init: false, db: true });

      // Regular file, hidden directory, and depth-2 subdirectory must be excluded
      fs.writeFileSync(path.join(fixture.mpmissionsDir, 'readme.txt'), 'ignore me');
      fs.mkdirSync(path.join(fixture.mpmissionsDir, '.hiddenMission'));
      fs.mkdirSync(path.join(chernarus, 'nestedSubdir'));

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(true);
      expect(result.discoveredMissions).toEqual([
        {
          name: 'dayzOffline.chernarusplus',
          relativePath: 'mpmissions/dayzOffline.chernarusplus',
          resolvedPath: chernarus,
          hasInitScript: true,
          hasEconomyDb: true,
        },
        {
          name: 'dayzOffline.enoch',
          relativePath: 'mpmissions/dayzOffline.enoch',
          resolvedPath: path.join(fixture.mpmissionsDir, 'dayzOffline.enoch'),
          hasInitScript: false,
          hasEconomyDb: true,
        },
        {
          name: 'dayzOffline.sakhal',
          relativePath: 'mpmissions/dayzOffline.sakhal',
          resolvedPath: path.join(fixture.mpmissionsDir, 'dayzOffline.sakhal'),
          hasInitScript: true,
          hasEconomyDb: false,
        },
      ]);
    });

    it('resolves case-insensitive and identical mission name tiebreaks deterministically', () => {
      const fixture = createValidDayzFixture();
      const baseMpmissions = fixture.mpmissionsDir;

      const makeDirent = (name: string): fs.Dirent =>
        ({
          name,
          isDirectory: () => true,
          isSymbolicLink: () => false,
        }) as unknown as fs.Dirent;

      const originalStatSync = fs.statSync.bind(fs);
      const originalRealpathSync = fs.realpathSync.bind(fs);

      vi.spyOn(fs, 'readdirSync').mockReturnValueOnce([
        makeDirent('alpha'),
        makeDirent('Alpha'),
        makeDirent('Alpha'),
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, 'realpathSync').mockImplementation(target => {
        const s = String(target);
        if (s.startsWith(baseMpmissions)) return s;
        return originalRealpathSync(target);
      });
      vi.spyOn(fs, 'statSync').mockImplementation(target => {
        const s = String(target);
        if (s === path.join(baseMpmissions, 'alpha') || s === path.join(baseMpmissions, 'Alpha')) {
          return { isDirectory: () => true, isFile: () => false } as fs.Stats;
        }
        if (s.endsWith('init.c')) {
          return { isDirectory: () => false, isFile: () => true } as fs.Stats;
        }
        if (s.endsWith('db')) {
          return { isDirectory: () => true, isFile: () => false } as fs.Stats;
        }
        return originalStatSync(target);
      });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => undefined);

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: fixture.profileDir,
        missionPath: fixture.installDir,
      });

      expect(result.discoveredMissions.map(m => m.name)).toEqual(['alpha', 'Alpha', 'Alpha']);
    });

    it('emits non-blocking warning and empty array when mpmissions is missing, non-dir, unresolvable, or unreadable', () => {
      // 1. Missing mpmissions
      const missingFixture = createValidDayzFixture({ withMpmissions: false });
      const missingRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: missingFixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });
      expect(missingRes.discoveredMissions).toEqual([]);
      expect(missingRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
          code: 'MPMISSIONS_DIR_MISSING',
        }),
      );

      // 2. mpmissions is a regular file
      const fileFixture = createValidDayzFixture({ withMpmissions: false });
      fs.writeFileSync(fileFixture.mpmissionsDir, 'file-not-dir');
      const notDirRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fileFixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });
      expect(notDirRes.discoveredMissions).toEqual([]);
      expect(notDirRes.issues).toContainEqual(
        expect.objectContaining({
          severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
          code: 'MPMISSIONS_PATH_NOT_DIRECTORY',
        }),
      );

      // 3. mpmissions realpathSync fails
      const realpathFixture = createValidDayzFixture();
      const origRealpath = fs.realpathSync.bind(fs);
      vi.spyOn(fs, 'realpathSync').mockImplementation(target => {
        if (String(target) === realpathFixture.mpmissionsDir) {
          throw new Error('ELOOP');
        }
        return origRealpath(target);
      });
      const realpathFailRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: realpathFixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });
      expect(realpathFailRes.discoveredMissions).toEqual([]);
      expect(realpathFailRes.issues).toContainEqual(
        expect.objectContaining({
          code: 'MPMISSIONS_DIR_MISSING',
          message: expect.stringContaining("Unable to resolve 'mpmissions'"),
        }),
      );

      vi.restoreAllMocks();

      // 4. readdirSync throws EACCES
      const unreadableFixture = createValidDayzFixture();
      vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
        throw new Error('EACCES');
      });
      const readdirFailRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: unreadableFixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });
      expect(readdirFailRes.discoveredMissions).toEqual([]);
      expect(readdirFailRes.issues).toContainEqual(
        expect.objectContaining({
          code: 'MPMISSIONS_DIR_MISSING',
          message: expect.stringContaining("Unable to read 'mpmissions'"),
        }),
      );
    });

    it('excludes escaped symlinks, sibling-prefix symlinks, self-links, broken symlinks, non-dir symlink targets, and unreadable mission dirs', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('validMission');

      // Sibling-prefix dir (mpmissions-backup/escape) and external dir
      const siblingPrefixRoot = path.join(fixture.installDir, 'mpmissions-backup');
      const siblingMission = path.join(siblingPrefixRoot, 'siblingMission');
      const externalMission = path.join(fixture.root, 'externalMission');
      const brokenTarget = path.join(fixture.root, 'deletedTarget');
      const unreadableMission = fixture.createMission('unreadableMission');

      fs.mkdirSync(siblingMission, { recursive: true });
      fs.writeFileSync(path.join(siblingMission, 'init.c'), 'void main() {}');
      fs.mkdirSync(externalMission, { recursive: true });
      fs.writeFileSync(path.join(externalMission, 'init.c'), 'void main() {}');
      fs.mkdirSync(brokenTarget, { recursive: true });

      fs.symlinkSync(
        externalMission,
        path.join(fixture.mpmissionsDir, 'linkExternal'),
        SYMLINK_DIR_TYPE,
      );
      fs.symlinkSync(
        siblingMission,
        path.join(fixture.mpmissionsDir, 'linkSiblingPrefix'),
        SYMLINK_DIR_TYPE,
      );
      fs.symlinkSync(
        fixture.mpmissionsDir,
        path.join(fixture.mpmissionsDir, 'linkSelf'),
        SYMLINK_DIR_TYPE,
      );
      fs.symlinkSync(
        brokenTarget,
        path.join(fixture.mpmissionsDir, 'linkBroken'),
        SYMLINK_DIR_TYPE,
      );
      // Remove brokenTarget after creating link so realpathSync returns null
      fs.rmSync(brokenTarget, { recursive: true, force: true });

      // Symlink to a file inside mpmissions (simulated via statSync for cross-platform reliability without Win32 SeCreateSymbolicLinkPrivilege)
      const fileTarget = path.join(fixture.mpmissionsDir, 'plainTarget.txt');
      fs.writeFileSync(fileTarget, 'not-a-directory');
      const linkToFileDir = path.join(fixture.mpmissionsDir, 'linkToFile');
      fs.mkdirSync(linkToFileDir);

      const originalStatSync = fs.statSync.bind(fs);
      vi.spyOn(fs, 'statSync').mockImplementation(target => {
        if (String(target) === linkToFileDir) {
          return { isDirectory: () => false, isFile: () => true } as fs.Stats;
        }
        return originalStatSync(target);
      });

      const originalAccessSync = fs.accessSync.bind(fs);
      vi.spyOn(fs, 'accessSync').mockImplementation((target, mode) => {
        if (String(target) === unreadableMission) {
          throw new Error('EACCES');
        }
        return originalAccessSync(target, mode);
      });

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'validMission',
      });

      expect(result.discoveredMissions.map(m => m.name)).toEqual(['validMission']);
    });
  });

  describe('REQ-03 & GUARD-03: Mission Path Resolution and Artifact Validation', () => {
    it('resolves bare mission names, forward/backslash mpmissions relative paths, and custom relative subpaths inside installDir', () => {
      const fixture = createValidDayzFixture();
      const chernarus = fixture.createMission('dayzOffline.chernarusplus');

      const customMission = path.join(fixture.installDir, 'custom', 'mission');
      fs.mkdirSync(path.join(customMission, 'db'), { recursive: true });
      fs.writeFileSync(path.join(customMission, 'init.c'), 'void main() {}');

      // 1. Bare mission name
      const bareRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });
      expect(bareRes.valid).toBe(true);
      expect(bareRes.paths.missionPath.resolvedPath).toBe(chernarus);

      // 2. Windows backslash relative path
      const backslashRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      });
      expect(backslashRes.valid).toBe(true);
      expect(backslashRes.paths.missionPath.resolvedPath).toBe(chernarus);

      // 3. Custom forward-slash relative subpath inside installDir
      const customRelativeRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'custom/mission',
      });
      expect(customRelativeRes.valid).toBe(true);
      expect(customRelativeRes.paths.missionPath.resolvedPath).toBe(customMission);
      expect(customRelativeRes.paths.missionPath.hasInitScript).toBe(true);
      expect(customRelativeRes.paths.missionPath.hasEconomyDb).toBe(true);
    });

    it('validates warning vs error severity for missing db/ and missing init.c', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('noDbMission', { init: true, db: false });
      fixture.createMission('noInitMission', { init: false, db: true });

      // Missing db/ -> warning, valid: true
      const noDbRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'noDbMission',
      });
      expect(noDbRes.valid).toBe(true);
      expect(noDbRes.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.WARNING);
      expect(noDbRes.paths.missionPath.hasInitScript).toBe(true);
      expect(noDbRes.paths.missionPath.hasEconomyDb).toBe(false);
      expect(noDbRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
          code: 'MISSION_ECONOMY_DB_MISSING',
        }),
      );

      // Missing init.c -> error, valid: false
      const noInitRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'noInitMission',
      });
      expect(noInitRes.valid).toBe(false);
      expect(noInitRes.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(noInitRes.paths.missionPath.hasInitScript).toBe(false);
      expect(noInitRes.paths.missionPath.hasEconomyDb).toBe(true);
      expect(noInitRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
          code: 'MISSION_INIT_SCRIPT_MISSING',
        }),
      );
    });

    it('reports MISSION_DIR_MISSING, MISSION_PATH_NOT_DIRECTORY, unreadable mission dir, and MISSION_SYMLINK_ESCAPE', () => {
      const fixture = createValidDayzFixture();
      const fileMission = path.join(fixture.mpmissionsDir, 'fileMission');
      fs.writeFileSync(fileMission, 'not-a-dir');

      const externalMission = path.join(fixture.root, 'externalSecret');
      fs.mkdirSync(externalMission, { recursive: true });
      fs.writeFileSync(path.join(externalMission, 'init.c'), 'void main() {}');
      fs.symlinkSync(
        externalMission,
        path.join(fixture.mpmissionsDir, 'escapedMission'),
        SYMLINK_DIR_TYPE,
      );

      const unreadableMission = fixture.createMission('lockedMission');

      // 1. Missing mission dir
      const missingRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.nonexistent',
      });
      expect(missingRes.valid).toBe(false);
      expect(missingRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          code: 'MISSION_DIR_MISSING',
        }),
      );

      // 2. Mission path is a file
      const fileRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'fileMission',
      });
      expect(fileRes.valid).toBe(false);
      expect(fileRes.paths.missionPath.exists).toBe(true);
      expect(fileRes.paths.missionPath.isDirectory).toBe(false);
      expect(fileRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          code: 'MISSION_PATH_NOT_DIRECTORY',
        }),
      );

      // 3. Symlink escape (bare name under mpmissions/ and relative subpath under installDir)
      const escapeRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'escapedMission',
      });
      expect(escapeRes.valid).toBe(false);
      expect(escapeRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          code: 'MISSION_SYMLINK_ESCAPE',
        }),
      );

      // Self-reference '.' escapes allowEqual=false boundary
      const selfEscapeRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: '.',
      });
      expect(selfEscapeRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          code: 'MISSION_SYMLINK_ESCAPE',
        }),
      );

      // 4. Unreadable mission dir + realpath fallback
      const origRealpath = fs.realpathSync.bind(fs);
      vi.spyOn(fs, 'realpathSync').mockImplementation(target => {
        if (String(target) === unreadableMission) {
          throw new Error('EIO');
        }
        return origRealpath(target);
      });
      const origAccess = fs.accessSync.bind(fs);
      vi.spyOn(fs, 'accessSync').mockImplementation((target, mode) => {
        if (String(target) === unreadableMission) {
          throw new Error('EACCES');
        }
        return origAccess(target, mode);
      });

      const unreadableRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions/lockedMission',
      });
      expect(unreadableRes.valid).toBe(false);
      expect(unreadableRes.paths.missionPath.hasInitScript).toBeNull();
      expect(unreadableRes.paths.missionPath.hasEconomyDb).toBeNull();
      expect(unreadableRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          code: 'MISSION_DIR_MISSING',
          message: expect.stringContaining('lacks read or traverse permissions'),
        }),
      );
    });
  });

  describe('REQ-04 & GUARD-02: Profile & BattlEye Inspection and Write Probe Cleanup', () => {
    it('probes writable profile and BattlEye directories without modifying existing files or leaving .tmp probe residue', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');

      const existingProfileFile = path.join(fixture.profileDir, 'server.log');
      const existingBeFile = path.join(fixture.battleyeDir, 'beserver_x64.cfg');
      fs.writeFileSync(existingProfileFile, 'existing-log-content');
      fs.writeFileSync(existingBeFile, 'RConPassword secret');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(true);
      expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.VALID);
      expect(result.paths.profilePath.writable).toBe(true);
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.VALID);
      expect(result.paths.battleyePath.writable).toBe(true);

      expect(fs.readdirSync(fixture.profileDir).sort()).toEqual(['BattlEye', 'server.log']);
      expect(fs.readdirSync(fixture.battleyeDir)).toEqual(['beserver_x64.cfg']);
      expect(fs.readFileSync(existingProfileFile, 'utf8')).toBe('existing-log-content');
      expect(fs.readFileSync(existingBeFile, 'utf8')).toBe('RConPassword secret');
    });

    it('reports BATTLEYE_DIR_MISSING as non-blocking warning without creating BattlEye on disk', () => {
      const fixture = createValidDayzFixture({ withBattlEye: false });
      fixture.createMission('dayzOffline.chernarusplus');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(true);
      expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.VALID);
      expect(result.paths.battleyePath).toEqual({
        target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
        configuredPath: fixture.battleyeDir,
        resolvedPath: fixture.battleyeDir,
        status: SERVER_FS_CHECK_STATUS.WARNING,
        exists: false,
        isDirectory: false,
        writable: false,
      });
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
          code: 'BATTLEYE_DIR_MISSING',
        }),
      );
      expect(fs.existsSync(fixture.battleyeDir)).toBe(false);
    });

    it('reports PROFILE_DIR_MISSING and PROFILE_PATH_NOT_DIRECTORY without creating missing directories', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');

      const missingProfileName = 'missing-profiles';
      const missingProfilePath = path.join(fixture.installDir, missingProfileName);
      const missingRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: missingProfileName,
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(missingRes.valid).toBe(false);
      expect(missingRes.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(missingRes.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(missingRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
          code: 'PROFILE_DIR_MISSING',
        }),
      );
      expect(fs.existsSync(missingProfilePath)).toBe(false);

      const fileProfileName = 'profile-file.txt';
      const fileProfilePath = path.join(fixture.installDir, fileProfileName);
      fs.writeFileSync(fileProfilePath, 'not-a-dir');
      const notDirRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: fileProfileName,
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(notDirRes.valid).toBe(false);
      expect(notDirRes.paths.profilePath.exists).toBe(true);
      expect(notDirRes.paths.profilePath.isDirectory).toBe(false);
      expect(notDirRes.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(notDirRes.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
          code: 'PROFILE_PATH_NOT_DIRECTORY',
        }),
      );
    });

    it('rejects PROFILE_SYMLINK_ESCAPE when relative profilePath resolves outside installDir without running write probes', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');
      fs.rmSync(fixture.profileDir, { recursive: true, force: true });

      const externalProfile = path.join(fixture.root, 'external-profiles');
      fs.mkdirSync(path.join(externalProfile, 'BattlEye'), { recursive: true });
      fs.symlinkSync(externalProfile, fixture.profileDir, SYMLINK_DIR_TYPE);

      const openSpy = vi.spyOn(fs, 'openSync');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(openSpy).not.toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.paths.profilePath).toEqual({
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: 'profiles',
        resolvedPath: externalProfile,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: true,
        isDirectory: true,
        writable: null,
      });
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
          code: 'PROFILE_SYMLINK_ESCAPE',
          path: externalProfile,
        }),
      );
    });

    it('reports BATTLEYE_PATH_NOT_DIRECTORY when BattlEye is a file', () => {
      const fixture = createValidDayzFixture({ withBattlEye: false });
      fixture.createMission('dayzOffline.chernarusplus');
      fs.writeFileSync(fixture.battleyeDir, 'file-instead-of-dir');

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.battleyePath.exists).toBe(true);
      expect(result.paths.battleyePath.isDirectory).toBe(false);
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
          code: 'BATTLEYE_PATH_NOT_DIRECTORY',
        }),
      );
    });

    it('enforces GUARD-02 exclusive O_EXCL write probe, closes fd even if unlinkSync throws, and handles openSync failure cleanly', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('dayzOffline.chernarusplus');

      const origRealpath = fs.realpathSync.bind(fs);
      vi.spyOn(fs, 'realpathSync').mockImplementation(target => {
        if (
          String(target) === fixture.installDir ||
          String(target) === fixture.profileDir ||
          String(target) === fixture.battleyeDir
        ) {
          throw new Error('realpath fallback');
        }
        return origRealpath(target);
      });

      // Profile: openSync throws EROFS (fd remains undefined -> closeSync NOT called for profile)
      // BattlEye: openSync succeeds with fd=99, unlinkSync throws EPERM -> closeSync(99) MUST be called
      const openSpy = vi.spyOn(fs, 'openSync').mockImplementation(target => {
        if (String(target).startsWith(fixture.battleyeDir)) {
          return 99;
        }
        throw Object.assign(new Error('EROFS: read-only filesystem'), { code: 'EROFS' });
      });
      const closeSpy = vi.spyOn(fs, 'closeSync').mockImplementation(() => undefined);
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw Object.assign(new Error('EPERM: cannot unlink'), { code: 'EPERM' });
      });

      const result = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: fixture.installDir,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(result.valid).toBe(false);
      expect(result.paths.profilePath.writable).toBe(false);
      expect(result.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.paths.battleyePath.writable).toBe(false);
      expect(result.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
          code: 'PROFILE_DIR_NOT_WRITABLE',
        }),
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
          code: 'BATTLEYE_DIR_NOT_WRITABLE',
        }),
      );

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\.dsm_fs_probe_.*\.tmp$/),
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o600,
      );
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledWith(99);
    });

    it('marks relative profilePath and missionPath as skipped when installPath does not exist, while still rejecting non-relative paths', () => {
      const fixture = createValidDayzFixture();
      const missingInstall = path.join(fixture.root, 'missingInstall');

      const relativeRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: missingInstall,
        profilePath: 'profiles',
        missionPath: 'dayzOffline.chernarusplus',
      });

      expect(relativeRes.valid).toBe(false);
      expect(relativeRes.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(relativeRes.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(relativeRes.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(relativeRes.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);

      const nonRelativeRes = service.inspect({
        serverId: TEST_SERVER_ID,
        installPath: missingInstall,
        profilePath: fixture.profileDir,
        missionPath: fixture.mpmissionsDir,
      });

      expect(nonRelativeRes.valid).toBe(false);
      expect(nonRelativeRes.paths.installPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(nonRelativeRes.paths.profilePath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(nonRelativeRes.paths.battleyePath.status).toBe(SERVER_FS_CHECK_STATUS.SKIPPED);
      expect(nonRelativeRes.paths.missionPath.status).toBe(SERVER_FS_CHECK_STATUS.ERROR);
      expect(nonRelativeRes.issues.map(i => i.code)).toEqual([
        'INSTALL_DIR_MISSING',
        'PROFILE_PATH_NOT_RELATIVE',
        'MISSION_PATH_NOT_RELATIVE',
      ]);
    });
  });

  describe('Optional missionPath & findFirstValidMissionTemplate', () => {
    it.each([undefined, null, '', '   '])(
      'keeps valid: true and marks missionPath skipped when missionPath is %o',
      missionPath => {
        const fixture = createValidDayzFixture();
        fixture.createMission('dayzOffline.chernarusplus');

        const result = service.inspect({
          serverId: TEST_SERVER_ID,
          installPath: fixture.installDir,
          profilePath: 'profiles',
          missionPath,
        });

        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.paths.missionPath).toEqual({
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          configuredPath: '',
          resolvedPath: null,
          status: SERVER_FS_CHECK_STATUS.SKIPPED,
          exists: false,
          isDirectory: null,
          hasInitScript: null,
          hasEconomyDb: null,
        });
        expect(result.discoveredMissions.map(m => m.name)).toContain('dayzOffline.chernarusplus');
      },
    );

    it('discovers the first valid mission with init.c and valid template characters, or returns null when absent/escaped', () => {
      const fixture = createValidDayzFixture();
      fixture.createMission('aaa.noInit', { init: false });
      fixture.createMission('bbb bad-space', { init: true });
      fixture.createMission('dayzOffline.enoch', { init: true });
      fixture.createMission('empty.chernarus', { init: true });

      expect(findFirstValidMissionTemplate(fixture.installDir)).toBe('dayzOffline.enoch');

      const bareDir = createTempRoot('dsm-no-missions-');
      expect(findFirstValidMissionTemplate(bareDir)).toBeNull();
    });
  });

  describe('singleton export', () => {
    it('exports singleton serverFsInspectorService instance', () => {
      expect(serverFsInspectorService).toBeInstanceOf(ServerFsInspectorService);
    });
  });
});
