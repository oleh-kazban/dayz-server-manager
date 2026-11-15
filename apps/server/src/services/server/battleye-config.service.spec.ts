import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  battlEyeConfigService,
  type BattlEyeConfigSource,
  getBattlEyeConfigFilename,
  renderBattlEyeCfg,
} from './battleye-config.service';
import { ConfigStorageError } from './config-atomic-writer';

const RCON_SECRET = 'RconSecret!99';
const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';

describe('BattlEyeConfigService', () => {
  let tempDir: string;
  let tempReal: string;
  let installDir: string;
  let backupRootDir: string;

  const baseServer = (overrides: Partial<BattlEyeConfigSource> = {}): BattlEyeConfigSource => ({
    id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    name: 'Outlive Chernarus #1',
    status: 'stopped',
    installPath: installDir,
    profilePath: 'profiles',
    rconPort: 2310,
    rconIp: '127.0.0.1',
    ...overrides,
  });

  const sync = (
    overrides: Partial<BattlEyeConfigSource> = {},
    password: string | null = RCON_SECRET,
  ) => battlEyeConfigService.syncBattlEyeConfig(baseServer(overrides), password, { backupRootDir });

  const beCfgPath = (profile = 'profiles') =>
    path.join(installDir, profile, 'BattlEye', getBattlEyeConfigFilename(process.platform));

  const listTree = (root: string): string[] =>
    fs.existsSync(root)
      ? (fs.readdirSync(root, { recursive: true }) as string[]).map(String).sort()
      : [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-battleye-'));
    tempReal = fs.realpathSync(tempDir);
    installDir = path.join(tempReal, 'dayz-install');
    backupRootDir = path.join(tempReal, 'backups');
    fs.mkdirSync(installDir, { recursive: true });
    fs.mkdirSync(backupRootDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the BattlEye filename per platform', () => {
    expect(getBattlEyeConfigFilename('win32')).toBe('BEServer_x64.cfg');
    expect(getBattlEyeConfigFilename('linux')).toBe('beserver_x64.cfg');
    expect(getBattlEyeConfigFilename()).toBe(getBattlEyeConfigFilename(process.platform));
  });

  it('renders the BattlEye cfg and rejects invalid RCON passwords or bind IPs', () => {
    expect(renderBattlEyeCfg({ rconPort: 2310, rconIp: '127.0.0.1' }, 'ValidPass!1')).toBe(
      'RConPassword ValidPass!1\nRConPort 2310\nRConIP 127.0.0.1\nRestrictRCon 0\n',
    );
    expect(() => renderBattlEyeCfg({ rconPort: 2310, rconIp: '127.0.0.1' }, 'bad pass')).toThrow(
      expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }),
    );
    expect(() => renderBattlEyeCfg({ rconPort: 2310, rconIp: 'not-an-ip' }, 'ValidPass!1')).toThrow(
      expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }),
    );
  });

  it('writes only the BattlEye file, prunes stale active variants, and is idempotent', () => {
    const serverDzPath = path.join(installDir, 'serverDZ.cfg');
    const serverDzBytes = Buffer.from('hostname = "Operator owned";\r\n// keep\r\n', 'utf8');
    fs.writeFileSync(serverDzPath, serverDzBytes);

    const battleyeDir = path.join(installDir, 'profiles', 'BattlEye');
    fs.mkdirSync(battleyeDir, { recursive: true });
    fs.writeFileSync(beCfgPath(), 'RConPassword OldPassword\n', 'utf8');
    const stale1 = path.join(battleyeDir, 'BEServer_x64_active_abc12.cfg');
    const stale2 = path.join(battleyeDir, 'beserver_active_999.cfg');
    const unrelated = path.join(battleyeDir, 'bans.txt');
    fs.writeFileSync(stale1, 'RConPassword Stale1', 'utf8');
    fs.writeFileSync(stale2, 'RConPassword Stale2', 'utf8');
    fs.writeFileSync(unrelated, 'ban-list', 'utf8');

    const result = sync();

    expect(result.battleyeCfgPath).toBe(beCfgPath());
    expect(result.battleyeCfgWritten).toBe(true);
    expect(result.staleActiveFilesRemoved).toEqual(
      [stale1, stale2].sort((a, b) => a.localeCompare(b)),
    );
    expect(result.backupPaths).toHaveLength(3);
    expect(fs.existsSync(stale1)).toBe(false);
    expect(fs.existsSync(stale2)).toBe(false);
    expect(fs.readFileSync(unrelated, 'utf8')).toBe('ban-list');
    expect(fs.readFileSync(beCfgPath(), 'utf8')).toBe(
      `RConPassword ${RCON_SECRET}\nRConPort 2310\nRConIP 127.0.0.1\nRestrictRCon 0\n`,
    );
    expect(fs.readFileSync(serverDzPath).equals(serverDzBytes)).toBe(true);

    const second = sync();
    expect(second.battleyeCfgWritten).toBe(false);
    expect(second.staleActiveFilesRemoved).toEqual([]);
    expect(second.backupPaths).toEqual([]);
    expect(fs.readFileSync(serverDzPath).equals(serverDzBytes)).toBe(true);
  });

  it('provisions nested profile subdirectories when the profile does not exist yet', () => {
    const result = sync({ profilePath: 'profiles/cluster/node1' });
    expect(result.battleyeCfgWritten).toBe(true);
    expect(result.backupPaths).toEqual([]);
    expect(fs.existsSync(beCfgPath(path.join('profiles', 'cluster', 'node1')))).toBe(true);
  });

  it('records the stale file as removed even when it vanished before its backup', () => {
    const battleyeDir = path.join(installDir, 'profiles', 'BattlEye');
    fs.mkdirSync(battleyeDir, { recursive: true });
    const stale = path.join(battleyeDir, 'BEServer_x64_active_gone.cfg');
    fs.writeFileSync(stale, 'RConPassword Stale', 'utf8');

    // The stale file disappears right before its backup is taken (concurrent cleanup).
    const realLstat = fs.lstatSync.bind(fs);
    vi.spyOn(fs, 'lstatSync').mockImplementation(((p: fs.PathLike, ...rest: []) => {
      if (String(p) === stale) {
        fs.rmSync(stale, { force: true });
      }
      return realLstat(p, ...rest);
    }) as typeof fs.lstatSync);

    const result = sync();
    expect(result.staleActiveFilesRemoved).toEqual([stale]);
    expect(result.backupPaths).toEqual([]);
  });

  it('writes beserver_x64.cfg with chmod 0600 on a simulated POSIX host', () => {
    const posixInstall = '/opt/dayz';
    const createdDirs = new Set<string>([posixInstall]);
    const writtenFiles = new Map<string, string>();
    const dirStat = {
      isDirectory: () => true,
      isFile: () => false,
      isSymbolicLink: () => false,
    } as unknown as fs.Stats;
    const fileStat = {
      isDirectory: () => false,
      isFile: () => true,
      isSymbolicLink: () => false,
    } as unknown as fs.Stats;
    const enoent = (p: string) => Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
    const statOf = (target: fs.PathLike) => {
      const p = String(target);
      if (createdDirs.has(p)) return dirStat;
      if (writtenFiles.has(p)) return fileStat;
      throw enoent(p);
    };

    vi.spyOn(fs, 'statSync').mockImplementation(statOf as typeof fs.statSync);
    vi.spyOn(fs, 'lstatSync').mockImplementation(statOf as typeof fs.lstatSync);
    vi.spyOn(fs, 'realpathSync').mockImplementation(((target: fs.PathLike) => {
      const p = String(target);
      if (createdDirs.has(p) || writtenFiles.has(p)) return p;
      throw enoent(p);
    }) as typeof fs.realpathSync);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(((target: fs.PathLike) => {
      createdDirs.add(String(target));
      return String(target);
    }) as typeof fs.mkdirSync);
    let nextFd = 100;
    const openFds = new Map<number, { path: string; chunks: Buffer[] }>();
    vi.spyOn(fs, 'openSync').mockImplementation(((target: fs.PathLike) => {
      const fd = nextFd;
      nextFd += 1;
      openFds.set(fd, { path: String(target), chunks: [] });
      return fd;
    }) as typeof fs.openSync);
    vi.spyOn(fs, 'writeSync').mockImplementation(((
      fd: number,
      data: Buffer,
      offset = 0,
      length?: number,
    ) => {
      const slice = data.subarray(offset, offset + (length ?? data.length));
      openFds.get(fd)?.chunks.push(Buffer.from(slice));
      return slice.length;
    }) as typeof fs.writeSync);
    vi.spyOn(fs, 'fsyncSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'closeSync').mockImplementation(fd => {
      const entry = openFds.get(fd);
      if (entry) {
        writtenFiles.set(entry.path, Buffer.concat(entry.chunks).toString('utf8'));
        openFds.delete(fd);
      }
    });
    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      const content = writtenFiles.get(String(oldPath)) ?? '';
      writtenFiles.delete(String(oldPath));
      writtenFiles.set(String(newPath), content);
    });
    const chmodSpy = vi.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);

    const result = battlEyeConfigService.syncBattlEyeConfig(
      baseServer({ installPath: posixInstall, profilePath: 'profiles/node1' }),
      RCON_SECRET,
      { platform: 'linux', backupRootDir: '/opt/backups' },
    );

    const target = '/opt/dayz/profiles/node1/BattlEye/beserver_x64.cfg';
    expect(result.battleyeCfgPath).toBe(target);
    expect(writtenFiles.get(target)).toContain(`RConPassword ${RCON_SECRET}`);
    // Mode is applied to the temp file before the atomic rename, which preserves it.
    expect(chmodSpy).toHaveBeenCalledWith(expect.stringMatching(/beserver_x64\.cfg\.tmp\./), 0o600);
  });

  it('refuses while the server is active or without an RCON password, touching nothing', () => {
    for (const status of ['running', 'starting', 'stopping'] as const) {
      expect(() => sync({ status })).toThrow(
        expect.objectContaining({ errorCode: 'SERVER_RUNNING_CONFIG_LOCKED' }),
      );
    }
    for (const password of [null, '']) {
      expect(() => sync({}, password)).toThrow(
        expect.objectContaining({ errorCode: 'CONFIG_RCON_PASSWORD_REQUIRED' }),
      );
    }
    expect(() =>
      battlEyeConfigService.syncBattlEyeConfig(baseServer({ status: 'running' }), RCON_SECRET),
    ).toThrow(expect.objectContaining({ errorCode: 'SERVER_RUNNING_CONFIG_LOCKED' }));
    expect(listTree(installDir)).toEqual([]);
    expect(listTree(backupRootDir)).toEqual([]);
  });

  it('rejects invalid RCON bind IPs and passwords before filesystem access', () => {
    expect(() => sync({ rconIp: '999.999.1.1' })).toThrow(
      expect.objectContaining({
        errorCode: 'CONFIG_PATH_INVALID',
        message: expect.stringContaining('IPv4'),
      }),
    );
    expect(() => sync({}, 'bad space')).toThrow(
      expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }),
    );
    expect(listTree(installDir)).toEqual([]);
  });

  it('rejects invalid installation and profile paths without writing', () => {
    const fileInstall = path.join(tempReal, 'install-file');
    fs.writeFileSync(fileInstall, 'nope', 'utf8');
    const cases: Partial<BattlEyeConfigSource>[] = [
      { installPath: 'relative/dir' },
      { installPath: 'C:\\bad|name' },
      { installPath: path.join(tempReal, 'missing-dir') },
      { installPath: fileInstall },
      { profilePath: '/abs/profiles' },
      { profilePath: '\\abs\\profiles' },
      { profilePath: '..' },
      { profilePath: '.' },
      { profilePath: 'profiles/./x' },
    ];
    for (const overrides of cases) {
      expect(() => sync(overrides)).toThrow(ConfigStorageError);
    }
    expect(listTree(installDir)).toEqual([]);
  });

  it('rejects an installation directory whose canonical path cannot be resolved', () => {
    vi.spyOn(fs, 'realpathSync').mockImplementationOnce(() => {
      throw new Error('EIO');
    });
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: 'Failed to resolve canonical installation directory path.',
      }),
    );
  });

  it('rejects profile segments that are files, dangling links, or escape the install directory', () => {
    fs.writeFileSync(path.join(installDir, 'profile-file'), 'file', 'utf8');
    expect(() => sync({ profilePath: 'profile-file' })).toThrow(
      expect.objectContaining({ message: 'Profile path is not a directory.' }),
    );

    const outsideDir = path.join(tempReal, 'outside');
    fs.mkdirSync(outsideDir);
    fs.symlinkSync(outsideDir, path.join(installDir, 'escaped-profile'), LINK_TYPE);
    expect(() => sync({ profilePath: 'escaped-profile' })).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('escapes installation directory'),
      }),
    );

    const danglingTarget = path.join(tempReal, 'dangling-target');
    fs.mkdirSync(danglingTarget);
    fs.symlinkSync(danglingTarget, path.join(installDir, 'dangling-profile'), LINK_TYPE);
    fs.rmSync(danglingTarget, { recursive: true });
    expect(() => sync({ profilePath: 'dangling-profile' })).toThrow(
      expect.objectContaining({ message: 'Profile path is not a directory.' }),
    );

    fs.mkdirSync(path.join(installDir, 'unresolvable'));
    const realRealpath = fs.realpathSync.bind(fs);
    vi.spyOn(fs, 'realpathSync').mockImplementation(((p: fs.PathLike, ...rest: []) => {
      if (String(p).endsWith('unresolvable')) {
        throw new Error('EIO');
      }
      return realRealpath(p, ...rest);
    }) as typeof fs.realpathSync);
    expect(() => sync({ profilePath: 'unresolvable' })).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('escapes installation directory'),
      }),
    );
    expect(fs.existsSync(path.join(outsideDir, 'BattlEye'))).toBe(false);
  });

  it('rejects unsafe BattlEye directories, targets, and stale entries', () => {
    const profilesDir = path.join(installDir, 'profiles');
    fs.mkdirSync(profilesDir, { recursive: true });
    const outsideDir = path.join(tempReal, 'outside');
    fs.mkdirSync(outsideDir);
    const battleyeDir = path.join(profilesDir, 'BattlEye');

    fs.symlinkSync(outsideDir, battleyeDir, LINK_TYPE);
    expect(() => sync()).toThrow(
      expect.objectContaining({ message: 'BattlEye directory must be a non-symlink directory.' }),
    );
    fs.rmSync(battleyeDir, { recursive: true, force: true });

    fs.writeFileSync(battleyeDir, 'not a dir', 'utf8');
    expect(() => sync()).toThrow(
      expect.objectContaining({ message: 'BattlEye directory must be a non-symlink directory.' }),
    );
    fs.rmSync(battleyeDir, { force: true });

    fs.mkdirSync(path.join(battleyeDir, getBattlEyeConfigFilename(process.platform)), {
      recursive: true,
    });
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('must be a regular non-symlink file'),
      }),
    );
    fs.rmSync(path.join(battleyeDir, getBattlEyeConfigFilename(process.platform)), {
      recursive: true,
    });

    fs.mkdirSync(path.join(battleyeDir, 'BEServer_x64_active_dir.cfg'));
    expect(() => sync()).toThrow(
      expect.objectContaining({ message: expect.stringContaining('Stale BattlEye active file') }),
    );
    fs.rmSync(path.join(battleyeDir, 'BEServer_x64_active_dir.cfg'), { recursive: true });

    const realRealpath = fs.realpathSync.bind(fs);
    const realpathSpy = vi.spyOn(fs, 'realpathSync').mockImplementation(((
      p: fs.PathLike,
      ...rest: []
    ) => {
      if (String(p).endsWith('BattlEye')) {
        return outsideDir;
      }
      return realRealpath(p, ...rest);
    }) as typeof fs.realpathSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({ message: expect.stringContaining('BattlEye directory escapes') }),
    );
    realpathSpy.mockImplementation(((p: fs.PathLike, ...rest: []) => {
      if (String(p).endsWith('BattlEye')) {
        throw new Error('EIO');
      }
      return realRealpath(p, ...rest);
    }) as typeof fs.realpathSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({ message: expect.stringContaining('BattlEye directory escapes') }),
    );
    expect(fs.readdirSync(outsideDir)).toEqual([]);
  });

  it('rejects TOCTOU leaf symlinks and post-mkdir containment escapes while provisioning', () => {
    const outsideDir = path.join(tempReal, 'outside');
    fs.mkdirSync(outsideDir);
    fs.mkdirSync(path.join(installDir, 'profiles'), { recursive: true });

    const realLstat = fs.lstatSync.bind(fs);
    let beLstatCalls = 0;
    vi.spyOn(fs, 'lstatSync').mockImplementation(((p: fs.PathLike, ...rest: []) => {
      if (String(p).endsWith('BattlEye')) {
        beLstatCalls += 1;
        if (beLstatCalls === 2) {
          return {
            isSymbolicLink: () => true,
            isDirectory: () => true,
            isFile: () => false,
          } as unknown as fs.Stats;
        }
      }
      return realLstat(p, ...rest);
    }) as typeof fs.lstatSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: 'Target configuration subdirectory must not be a symbolic link.',
      }),
    );
    vi.restoreAllMocks();
    fs.rmSync(path.join(installDir, 'profiles', 'BattlEye'), { recursive: true, force: true });

    const realRealpath = fs.realpathSync.bind(fs);
    const realpathSpy = vi.spyOn(fs, 'realpathSync').mockImplementation(((
      p: fs.PathLike,
      ...rest: []
    ) => {
      if (String(p).endsWith('BattlEye')) {
        return outsideDir;
      }
      return realRealpath(p, ...rest);
    }) as typeof fs.realpathSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: 'Provisioned directory escaped installation directory boundaries.',
      }),
    );
    fs.rmSync(path.join(installDir, 'profiles', 'BattlEye'), { recursive: true, force: true });

    realpathSpy.mockImplementation(((p: fs.PathLike, ...rest: []) => {
      if (String(p).endsWith('BattlEye')) {
        throw new Error('EIO');
      }
      return realRealpath(p, ...rest);
    }) as typeof fs.realpathSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: 'Provisioned directory escaped installation directory boundaries.',
      }),
    );
    fs.rmSync(path.join(installDir, 'profiles', 'BattlEye'), { recursive: true, force: true });
    realpathSpy.mockRestore();

    const realStat = fs.statSync.bind(fs);
    vi.spyOn(fs, 'statSync').mockImplementation(((p: fs.PathLike, ...rest: []) => {
      const stat = realStat(p, ...rest);
      if (String(p).endsWith('BattlEye')) {
        return { ...stat, isDirectory: () => false } as fs.Stats;
      }
      return stat;
    }) as typeof fs.statSync);
    expect(() => sync()).toThrow(
      expect.objectContaining({
        message: 'Provisioned directory escaped installation directory boundaries.',
      }),
    );
    expect(fs.readdirSync(outsideDir)).toEqual([]);
  });

  describe('tryAutoSyncOnSave', () => {
    const auto = (
      overrides: Partial<BattlEyeConfigSource> = {},
      password: string | null = RCON_SECRET,
      logger = { warn: vi.fn() },
    ) => ({
      result: battlEyeConfigService.tryAutoSyncOnSave(baseServer(overrides), password, {
        backupRootDir,
        logger,
      }),
      logger,
    });

    it('skips silently for active servers, missing passwords, and unusable install paths', () => {
      const fileInstall = path.join(tempReal, 'install-file');
      fs.writeFileSync(fileInstall, 'x', 'utf8');
      const skipped = [
        auto({ status: 'running' }),
        auto({}, null),
        auto({}, ''),
        auto({ installPath: 'relative/path' }),
        auto({ installPath: 'C:\\bad|name' }),
        auto({ installPath: path.join(tempReal, 'absent') }),
        auto({ installPath: fileInstall }),
      ];
      for (const { result, logger } of skipped) {
        expect(result).toBeNull();
        expect(logger.warn).not.toHaveBeenCalled();
      }
      expect(listTree(installDir)).toEqual([]);
    });

    it('writes the BattlEye file when the server is stopped and has an RCON password', () => {
      const { result } = auto();
      expect(result?.battleyeCfgWritten).toBe(true);
      expect(fs.readFileSync(beCfgPath(), 'utf8')).toContain(`RConPassword ${RCON_SECRET}`);
      expect(fs.existsSync(path.join(installDir, 'serverDZ.cfg'))).toBe(false);
    });

    it('logs a warning with the storage error code instead of throwing', () => {
      const { result, logger } = auto({ profilePath: '/abs' });
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ serverId: baseServer().id, errorCode: 'CONFIG_PATH_INVALID' }),
        'Best-effort BattlEye config auto-sync skipped after server save',
      );
    });

    it('maps unexpected non-Error failures to CONFIG_WRITE_FAILED and works without a logger', () => {
      vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
        throw 'disk-glitch';
      });
      const { result, logger } = auto();
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'CONFIG_WRITE_FAILED',
          message: expect.stringContaining('Unknown atomic write error'),
        }),
        expect.any(String),
      );

      vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
        throw 'raw-failure';
      });
      fs.mkdirSync(path.join(installDir, 'profiles', 'BattlEye'), { recursive: true });
      const warn = vi.fn();
      expect(
        battlEyeConfigService.tryAutoSyncOnSave(baseServer(), RCON_SECRET, {
          backupRootDir,
          logger: { warn },
        }),
      ).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'CONFIG_WRITE_FAILED',
          message: 'Unknown auto-sync error',
        }),
        expect.any(String),
      );

      expect(
        battlEyeConfigService.tryAutoSyncOnSave(baseServer({ profilePath: '/abs' }), RCON_SECRET),
      ).toBeNull();
    });
  });
});
