import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aegis/dayz-config', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/dayz-config')>();
  return { ...actual, renderServerDzTemplate: vi.fn(actual.renderServerDzTemplate) };
});
vi.mock('./server-path-safety', async importOriginal => {
  const actual = await importOriginal<typeof import('./server-path-safety')>();
  return { ...actual, validateLexicalCandidate: vi.fn(actual.validateLexicalCandidate) };
});

import { eq } from 'drizzle-orm';

import { SERVER_CONFIG_MAX_BYTES } from '@aegis/api-contracts';
import {
  type DatabaseInstance,
  initDatabase,
  type Server,
  serverConfigRevisions,
  servers,
  users,
} from '@aegis/database';
import * as dayzConfigModule from '@aegis/dayz-config';

import { ConfigStorageError } from './config-atomic-writer';
import { CONFIG_EDIT_LOCK_TTL_MS, ConfigEditLockService } from './config-edit-lock.service';
import { MAX_CONFIG_REVISIONS, ServerDzConfigService } from './server-dz-config.service';
import * as pathSafetyModule from './server-path-safety';

const SERVER_ID = '33333333-3333-4333-a333-333333333333';
const OTHER_SERVER_ID = '44444444-4444-4444-a444-444444444444';
const ALICE = { id: 'user-alice', username: 'alice', displayName: 'Alice A.' };
const BOB = { id: 'user-bob', username: 'bob', displayName: null };
const TAB_1 = '00000000-0000-4000-a000-000000000001';
const TAB_2 = '00000000-0000-4000-a000-000000000002';
const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);
const DISK_JOIN = 'disk-join-pw';
const DISK_ADMIN = 'disk-admin-pw';
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';
const HOST_EOL = process.platform === 'win32' ? 'crlf' : 'lf';

const ORIGINAL_LINES = [
  'hostname = "Test Server";  // name',
  `password = "${DISK_JOIN}";`,
  `passwordAdmin = "${DISK_ADMIN}";`,
  '',
  'maxPlayers = 40;',
  'steamQueryPort = 27016;',
  'motd[] = {};',
  'storeHouseStateDisabled = false;',
  '/* keep this comment */',
  'class Missions',
  '{',
  '\tclass DayZ',
  '\t{',
  '\t\ttemplate = "dayzOffline.chernarusplus";',
  '\t};',
  '};',
  '',
];
const ORIGINAL_LF = ORIGINAL_LINES.join('\n');

const sha256 = (data: Buffer) => crypto.createHash('sha256').update(data).digest('hex');

function encodeCfg(lf: string, options: { bom?: boolean; crlf?: boolean } = {}): Buffer {
  const body = Buffer.from(options.crlf ? lf.replace(/\n/g, '\r\n') : lf, 'utf8');
  return options.bom ? Buffer.concat([UTF8_BOM, body]) : body;
}

function expectStorageError(fn: () => unknown, errorCode: string): ConfigStorageError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigStorageError);
    expect((err as ConfigStorageError).errorCode).toBe(errorCode);
    return err as ConfigStorageError;
  }
  throw new Error(`expected ${errorCode} to be thrown`);
}

describe('ServerDzConfigService', () => {
  let tempReal: string;
  let installDir: string;
  let backupRootDir: string;
  let cfgPath: string;
  let dbi: DatabaseInstance;
  let now: number;
  let locks: ConfigEditLockService;
  let service: ServerDzConfigService;

  const alice = { userId: ALICE.id, sessionToken: TAB_1 };

  const getServer = (id = SERVER_ID): Server =>
    dbi.db.select().from(servers).where(eq(servers.id, id)).get()!;
  const updateServer = (patch: Partial<Server>) =>
    dbi.db.update(servers).set(patch).where(eq(servers.id, SERVER_ID)).run();
  const revisionRows = () =>
    dbi.db
      .select()
      .from(serverConfigRevisions)
      .where(eq(serverConfigRevisions.serverId, SERVER_ID))
      .all();
  const backupFiles = () => {
    const dir = path.join(backupRootDir, SERVER_ID);
    return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
  };
  const writeDisk = (bytes: Buffer) => fs.writeFileSync(cfgPath, bytes);
  const readDisk = () => fs.readFileSync(cfgPath);

  const snapshot = () => ({
    file:
      fs.existsSync(cfgPath) && fs.lstatSync(cfgPath).isFile() ? readDisk().toString('hex') : null,
    backups: backupFiles(),
    revisions: revisionRows(),
    server: getServer(),
    installTree: (fs.readdirSync(installDir, { recursive: true }) as string[]).map(String).sort(),
  });
  const expectZeroMutation = (before: ReturnType<typeof snapshot>) => {
    expect(snapshot()).toEqual(before);
  };

  const buildService = (
    overrides: Partial<ConstructorParameters<typeof ServerDzConfigService>[0]> = {},
  ) =>
    new ServerDzConfigService({
      db: dbi.db,
      sqlite: dbi.sqlite,
      locks,
      clock: () => now,
      platform: process.platform,
      backupRootDir,
      ...overrides,
    });

  const lockAndLoad = (actor = alice) => {
    locks.acquire(SERVER_ID, 'server_dz', actor);
    return service.load(getServer(), actor);
  };

  beforeEach(() => {
    tempReal = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-serverdz-')));
    installDir = path.join(tempReal, 'install');
    backupRootDir = path.join(tempReal, 'backups');
    cfgPath = path.join(installDir, 'serverDZ.cfg');
    fs.mkdirSync(path.join(installDir, 'mpmissions', 'dayzOffline.chernarusplus'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(installDir, 'mpmissions', 'dayzOffline.enoch'), { recursive: true });

    dbi = initDatabase({ dbPath: ':memory:' });
    now = T0;
    for (const user of [ALICE, BOB]) {
      dbi.db
        .insert(users)
        .values({ ...user, passwordHash: 'x', role: 'admin', createdAt: new Date(T0) })
        .run();
    }
    const base = {
      status: 'stopped' as const,
      profilePath: 'profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      createdAt: new Date(T0),
      updatedAt: new Date(T0),
    };
    dbi.db
      .insert(servers)
      .values({
        ...base,
        id: SERVER_ID,
        name: 'Test Server',
        installPath: installDir,
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
      })
      .run();
    dbi.db
      .insert(servers)
      .values({
        ...base,
        id: OTHER_SERVER_ID,
        name: 'Neighbour',
        installPath: path.join(tempReal, 'neighbour'),
        gamePort: 2402,
        queryPort: 27116,
        rconPort: 2410,
      })
      .run();

    locks = new ConfigEditLockService(dbi.db, dbi.sqlite, () => now);
    service = buildService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dbi.close();
    fs.rmSync(tempReal, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns plaintext content and reports hash, encoding, projection, and an external revision', () => {
      const bytes = encodeCfg(ORIGINAL_LF, { bom: true, crlf: true });
      writeDisk(bytes);

      const result = service.load(getServer(), { userId: ALICE.id });

      expect(result.exists).toBe(true);
      expect(result.content).toBe(ORIGINAL_LF);
      expect(result.contentHash).toBe(sha256(bytes));
      expect(result).toMatchObject({
        eol: 'crlf',
        hasBom: true,
        sizeBytes: bytes.length,
        serverRunning: false,
        lock: null,
        projection: {
          missionTemplate: 'dayzOffline.chernarusplus',
          steamQueryPort: 27016,
          maxPlayers: 40,
        },
      });
      expect(result.latestRevision).toMatchObject({
        source: 'external',
        authorUserId: null,
        authorName: null,
        contentHash: sha256(bytes),
        createdAt: new Date(T0).toISOString(),
      });
      const [revision] = revisionRows();
      expect(revision.content).toBe(result.content);
      expect(readDisk().equals(bytes)).toBe(true);
    });

    it('records one external revision per distinct on-disk version, never duplicating on reload', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      service.load(getServer(), { userId: ALICE.id });
      service.load(getServer(), { userId: ALICE.id });
      expect(revisionRows()).toHaveLength(1);

      writeDisk(encodeCfg(ORIGINAL_LF.replace('maxPlayers = 40', 'maxPlayers = 41')));
      const drifted = service.load(getServer(), { userId: ALICE.id });
      service.load(getServer(), { userId: ALICE.id });

      const rows = revisionRows();
      expect(rows).toHaveLength(2);
      expect(rows.every(row => row.source === 'external' && row.userId === null)).toBe(true);
      expect(drifted.latestRevision?.contentHash).toBe(sha256(readDisk()));
      expect(drifted.eol).toBe('lf');
      expect(drifted.hasBom).toBe(false);
    });

    it('syncs servers queryPort and maxPlayers in SQLite when serverDZ.cfg drifts externally while preserving servers.missionPath', () => {
      updateServer({
        queryPort: 27016,
        maxPlayers: 30,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });
      const driftedText = ORIGINAL_LF.replace('steamQueryPort = 27016;', 'steamQueryPort = 2305;')
        .replace('maxPlayers = 40;', 'maxPlayers = 60;')
        .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');
      writeDisk(encodeCfg(driftedText));
      now = T0 + 5_000;

      const result = service.load(getServer(), alice);

      expect(result.projection).toEqual({
        steamQueryPort: 2305,
        maxPlayers: 60,
        missionTemplate: 'dayzOffline.enoch',
      });
      const rows = revisionRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        source: 'external',
        userId: null,
        contentHash: result.contentHash,
      });
      expect(getServer()).toMatchObject({
        queryPort: 2305,
        maxPlayers: 60,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        updatedAt: new Date(T0 + 5_000),
      });
    });

    it('self-heals out-of-sync servers queryPort/maxPlayers when an external revision exists while preserving missionPath', () => {
      const driftedText = ORIGINAL_LF.replace('steamQueryPort = 27016;', 'steamQueryPort = 2305;')
        .replace('maxPlayers = 40;', 'maxPlayers = 60;')
        .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');
      writeDisk(encodeCfg(driftedText));

      const initial = service.load(getServer(), alice);
      expect(revisionRows()).toHaveLength(1);

      updateServer({
        queryPort: 27016,
        maxPlayers: 30,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        updatedAt: new Date(T0),
      });
      now = T0 + 10_000;

      const healed = service.load(getServer(), alice);

      expect(healed.latestRevision?.id).toBe(initial.latestRevision?.id);
      expect(revisionRows()).toHaveLength(1);
      expect(getServer()).toMatchObject({
        queryPort: 2305,
        maxPlayers: 60,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        updatedAt: new Date(T0 + 10_000),
      });

      // Subsequent load when hash, queryPort, and maxPlayers match is a DB no-op (even if missionPath differs from cfg)
      now = T0 + 20_000;
      service.load(getServer(), alice);
      expect(getServer().updatedAt).toEqual(new Date(T0 + 10_000));
    });

    it('skips syncing servers.queryPort when drifted steamQueryPort collides with another port', () => {
      updateServer({
        queryPort: 27016,
        maxPlayers: 30,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });
      const conflictingText = ORIGINAL_LF.replace(
        'steamQueryPort = 27016;',
        'steamQueryPort = 27116;',
      )
        .replace('maxPlayers = 40;', 'maxPlayers = 55;')
        .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');
      writeDisk(encodeCfg(conflictingText));
      now = T0 + 7_000;

      const result = service.load(getServer(), alice);

      expect(result.projection.steamQueryPort).toBe(27116);
      expect(getServer()).toMatchObject({
        queryPort: 27016,
        maxPlayers: 55,
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
      });
    });

    it('reports exists:false with the latest revision when the file is missing', () => {
      const missing = service.load(getServer(), { userId: ALICE.id });
      expect(missing).toEqual({
        exists: false,
        content: null,
        contentHash: null,
        eol: HOST_EOL,
        hasBom: false,
        sizeBytes: 0,
        projection: null,
        serverRunning: false,
        lock: null,
        latestRevision: null,
      });
      expect(revisionRows()).toHaveLength(0);

      writeDisk(encodeCfg(ORIGINAL_LF));
      const loaded = service.load(getServer(), { userId: ALICE.id });
      fs.rmSync(cfgPath);
      const afterDelete = service.load(getServer(), { userId: ALICE.id });
      expect(afterDelete.exists).toBe(false);
      expect(afterDelete.latestRevision).toEqual(loaded.latestRevision);
    });

    it('defaults the missing-file EOL to LF on a POSIX host', () => {
      const posixInstall = '/opt/dayz';
      updateServer({ installPath: posixInstall });
      const dirStat = { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false };
      const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      vi.spyOn(fs, 'statSync').mockImplementation(((p: fs.PathLike) => {
        if (String(p) === posixInstall) return dirStat;
        throw enoent();
      }) as typeof fs.statSync);
      vi.spyOn(fs, 'realpathSync').mockImplementation(((p: fs.PathLike) =>
        String(p)) as typeof fs.realpathSync);
      vi.spyOn(fs, 'lstatSync').mockImplementation((() => {
        throw enoent();
      }) as typeof fs.lstatSync);

      const posix = buildService({ platform: 'linux' }).load(getServer(), { userId: ALICE.id });
      expect(posix.exists).toBe(false);
      expect(posix.eol).toBe('lf');
    });

    it('reports serverRunning and heldByYou per editor session token', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      locks.acquire(SERVER_ID, 'server_dz', alice);
      updateServer({ status: 'running' });

      const mine = service.load(getServer(), alice);
      const otherTab = service.load(getServer(), { userId: ALICE.id, sessionToken: TAB_2 });
      const noToken = service.load(getServer(), { userId: ALICE.id });
      const otherUser = service.load(getServer(), { userId: BOB.id, sessionToken: TAB_1 });

      expect(mine.serverRunning).toBe(true);
      expect(mine.lock).toMatchObject({ holderName: 'Alice A.', heldByYou: true });
      expect(otherTab.lock?.heldByYou).toBe(false);
      expect(noToken.lock?.heldByYou).toBe(false);
      expect(otherUser.lock?.heldByYou).toBe(false);
    });

    it('refuses unusable installation paths without reading or recording anything', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      const fileInstall = path.join(tempReal, 'install-file');
      fs.writeFileSync(fileInstall, 'x');
      for (const installPath of [
        'relative/install',
        'C:\\bad|path',
        path.join(tempReal, 'nope'),
        fileInstall,
      ]) {
        const err = expectStorageError(
          () => service.load({ ...getServer(), installPath }, { userId: ALICE.id }),
          'CONFIG_PATH_INVALID',
        );
        expect(err.statusCode).toBe(400);
      }
      expect(revisionRows()).toHaveLength(0);
    });

    it('refuses symlinked, non-regular, escaping, or unresolvable targets with zero mutation', () => {
      const outside = path.join(tempReal, 'outside');
      fs.mkdirSync(outside);
      fs.writeFileSync(path.join(outside, 'serverDZ.cfg'), ORIGINAL_LF);

      fs.symlinkSync(outside, cfgPath, LINK_TYPE);
      let before = snapshot();
      expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      expectZeroMutation(before);
      fs.rmSync(cfgPath, { recursive: true, force: true });

      fs.mkdirSync(cfgPath);
      before = snapshot();
      expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      expectZeroMutation(before);
      fs.rmSync(cfgPath, { recursive: true });

      writeDisk(encodeCfg(ORIGINAL_LF));
      before = snapshot();
      const realRealpath = fs.realpathSync.bind(fs);
      const spy = vi
        .spyOn(fs, 'realpathSync')
        .mockImplementation(((p: fs.PathLike, ...rest: []) =>
          String(p) === cfgPath
            ? path.join(outside, 'serverDZ.cfg')
            : realRealpath(p, ...rest)) as typeof fs.realpathSync);
      expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      spy.mockImplementation(((p: fs.PathLike, ...rest: []) => {
        if (String(p) === cfgPath) throw new Error('EIO');
        return realRealpath(p, ...rest);
      }) as typeof fs.realpathSync);
      expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      expectZeroMutation(before);
      expect(fs.readFileSync(path.join(outside, 'serverDZ.cfg'), 'utf8')).toBe(ORIGINAL_LF);
    });

    it('refuses files larger than 64 KB before reading them', () => {
      writeDisk(Buffer.alloc(SERVER_CONFIG_MAX_BYTES + 1, 0x20));
      const readSpy = vi.spyOn(fs, 'readFileSync');
      const before = snapshot();
      readSpy.mockClear();
      const err = expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_FILE_TOO_LARGE',
      );
      expect(err.statusCode).toBe(413);
      expect(err.params).toEqual({ maxBytes: SERVER_CONFIG_MAX_BYTES });
      expect(readSpy).not.toHaveBeenCalled();
      expectZeroMutation(before);
    });

    it('refuses when the file grows past the limit between stat and read, or cannot be read', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      const before = snapshot();
      const realRead = fs.readFileSync.bind(fs);
      const spy = vi
        .spyOn(fs, 'readFileSync')
        .mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: []) =>
          String(p) === cfgPath
            ? Buffer.alloc(SERVER_CONFIG_MAX_BYTES + 1)
            : realRead(p, ...rest)) as typeof fs.readFileSync);
      expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_FILE_TOO_LARGE',
      );

      spy.mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: []) => {
        if (String(p) === cfgPath) throw new Error('EBUSY locked');
        return realRead(p, ...rest);
      }) as typeof fs.readFileSync);
      const busy = expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      expect(busy.message).toBe('Failed to read serverDZ.cfg: EBUSY locked');

      spy.mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: []) => {
        if (String(p) === cfgPath) throw 'raw';
        return realRead(p, ...rest);
      }) as typeof fs.readFileSync);
      const raw = expectStorageError(
        () => service.load(getServer(), { userId: ALICE.id }),
        'CONFIG_PATH_INVALID',
      );
      expect(raw.message).toBe('Failed to read serverDZ.cfg: Unknown read error');
      spy.mockRestore();
      expectZeroMutation(before);
    });
  });

  describe('validate', () => {
    it('accepts a valid file and strips a leading BOM character', () => {
      const result = service.validate(getServer(), `\ufeff${ORIGINAL_LF.replace(/\n/g, '\r\n')}`);
      expect(result.valid).toBe(true);
      expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    });

    it('keeps warnings non-blocking', () => {
      const result = service.validate(getServer(), `myCustomKey = 1;\n${ORIGINAL_LF}`);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          code: 'UNKNOWN_SETTING',
          line: 1,
          column: 1,
        }),
      ]);
    });

    it('reports a missing mission folder at the template value position', () => {
      const text = ORIGINAL_LF.replace('dayzOffline.chernarusplus', 'dayzOffline.sakhal');
      const result = service.validate(getServer(), text);
      expect(result.valid).toBe(false);
      expect(result.diagnostics).toContainEqual({
        severity: 'error',
        code: 'MISSION_NOT_FOUND',
        message:
          "Mission folder 'mpmissions/dayzOffline.sakhal' does not exist in the server installation",
        line: 14,
        column: 14,
        endLine: 14,
        endColumn: 34,
      });
    });

    it('treats files, escaping links, and unresolvable folders as missing missions', () => {
      fs.writeFileSync(path.join(installDir, 'mpmissions', 'asFile'), 'x');
      const outside = path.join(tempReal, 'outside-mission');
      fs.mkdirSync(outside);
      fs.symlinkSync(outside, path.join(installDir, 'mpmissions', 'escaped'), LINK_TYPE);
      fs.mkdirSync(path.join(installDir, 'mpmissions', 'unresolvable'));
      const realRealpath = fs.realpathSync.bind(fs);
      vi.spyOn(fs, 'realpathSync').mockImplementation(((p: fs.PathLike, ...rest: []) => {
        if (String(p).endsWith('unresolvable')) throw new Error('EIO');
        return realRealpath(p, ...rest);
      }) as typeof fs.realpathSync);

      for (const mission of ['asFile', 'escaped', 'unresolvable']) {
        const result = service.validate(
          getServer(),
          ORIGINAL_LF.replace('dayzOffline.chernarusplus', mission),
        );
        expect(result.diagnostics.map(d => d.code)).toContain('MISSION_NOT_FOUND');
      }
    });

    it('reports a missing mission folder when the installation path is unusable', () => {
      const result = service.validate(
        { ...getServer(), installPath: 'relative/path' },
        ORIGINAL_LF,
      );
      expect(result.diagnostics.map(d => d.code)).toEqual(['MISSION_NOT_FOUND']);
    });

    it('rethrows unexpected installation-path failures', () => {
      vi.mocked(pathSafetyModule.validateLexicalCandidate).mockImplementationOnce(() => {
        throw new TypeError('unexpected');
      });
      expect(() => service.validate(getServer(), ORIGINAL_LF)).toThrow(TypeError);
    });

    it('flags steamQueryPort collisions with this server and with other servers', () => {
      const collide = (port: number) =>
        service.validate(
          getServer(),
          ORIGINAL_LF.replace('steamQueryPort = 27016', `steamQueryPort = ${port}`),
        );

      expect(collide(2302).diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'STEAM_QUERY_PORT_CONFLICT',
          message: "steamQueryPort 2302 collides with this server's game or RCON port",
          line: 6,
          column: 18,
        }),
      );
      expect(collide(2310).diagnostics.map(d => d.code)).toContain('STEAM_QUERY_PORT_CONFLICT');
      for (const port of [2402, 27116, 2410]) {
        expect(collide(port).diagnostics).toContainEqual(
          expect.objectContaining({
            code: 'STEAM_QUERY_PORT_CONFLICT',
            message: `steamQueryPort ${port} collides with a port of server 'Neighbour'`,
          }),
        );
      }
      expect(collide(27016).valid).toBe(true);
    });

    it('anchors the collision at the file start when steamQueryPort is omitted', () => {
      updateServer({ gamePort: 27016, queryPort: 27015 });
      const result = service.validate(
        getServer(),
        ORIGINAL_LF.replace('steamQueryPort = 27016;\n', ''),
      );
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'STEAM_QUERY_PORT_CONFLICT',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        }),
      );
    });

    it('reports a missing template without running the mission folder check', () => {
      const result = service.validate(getServer(), 'hostname = "x";\n');
      expect(result.valid).toBe(false);
      const codes = result.diagnostics.map(d => d.code);
      expect(codes).toContain('MISSION_TEMPLATE_MISSING');
      expect(codes).not.toContain('MISSION_NOT_FOUND');
    });
  });

  describe('save', () => {
    it('preserves CRLF + BOM, writes plaintext edits, backs up, records a revision, and updates projection', () => {
      const original = encodeCfg(ORIGINAL_LF, { bom: true, crlf: true });
      writeDisk(original);
      const loaded = lockAndLoad();
      now = T0 + 1_000;

      const edited = loaded
        .content!.replace(`"${DISK_JOIN}"`, '"edited-join-pw"')
        .replace(`"${DISK_ADMIN}"`, '"edited-ad""min-pw"')
        .replace('maxPlayers = 40', 'maxPlayers = 50')
        .replace('steamQueryPort = 27016', 'steamQueryPort = 27020')
        .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const result = service.save(
        getServer(),
        alice,
        { baseHash: loaded.contentHash!, content: edited },
        logger,
      );

      const disk = readDisk();
      expect(disk.equals(encodeCfg(edited, { bom: true, crlf: true }))).toBe(true);
      expect(disk.toString('utf8')).not.toMatch(/[^\r]\n/);

      const backups = backupFiles();
      expect(backups).toHaveLength(1);
      expect(backups[0]).toMatch(/^serverDZ\.cfg\.bak_/);
      expect(
        fs.readFileSync(path.join(backupRootDir, SERVER_ID, backups[0])).equals(original),
      ).toBe(true);

      expect(result.contentHash).toBe(sha256(disk));
      expect(result.projection).toEqual({
        missionTemplate: 'dayzOffline.enoch',
        steamQueryPort: 27020,
        maxPlayers: 50,
      });
      expect(result.revision).toMatchObject({
        source: 'editor',
        authorUserId: ALICE.id,
        authorName: 'Alice A.',
        contentHash: sha256(disk),
        createdAt: new Date(T0 + 1_000).toISOString(),
      });

      const editorRow = revisionRows().find(row => row.source === 'editor')!;
      expect(editorRow.content).toBe(edited);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: SERVER_ID,
          source: 'editor',
          written: true,
        }),
        'serverDZ.cfg saved',
      );

      const row = getServer();
      expect(row.missionPath).toBe('mpmissions/dayzOffline.chernarusplus');
      expect(row.queryPort).toBe(27020);
      expect(row.maxPlayers).toBe(50);
      expect(row.updatedAt).toEqual(new Date(T0 + 1_000));
    });

    it('keeps LF without BOM, writes deleted password lines as edited, and preserves servers.missionPath when template changes', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      updateServer({ missionPath: 'mpmissions\\dayzOffline.chernarusplus' });
      const loaded = lockAndLoad();
      const edited = loaded
        .content!.replace(/^passwordAdmin = .*\n/m, '')
        .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');

      service.save(getServer(), alice, { baseHash: loaded.contentHash!, content: edited });

      const disk = readDisk();
      expect(disk.subarray(0, 3).equals(UTF8_BOM)).toBe(false);
      expect(disk.toString('utf8')).not.toContain('\r');
      expect(disk.toString('utf8')).not.toContain('passwordAdmin');
      expect(disk.toString('utf8')).toContain(`password = "${DISK_JOIN}";`);
      expect(getServer().missionPath).toBe('mpmissions\\dayzOffline.chernarusplus');
    });

    it('leaves missionPath untouched when the template is unchanged', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      updateServer({ missionPath: 'dayzOffline.chernarusplus' });
      const loaded = lockAndLoad();
      service.save(getServer(), alice, {
        baseHash: loaded.contentHash!,
        content: loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 12'),
      });
      expect(getServer().missionPath).toBe('dayzOffline.chernarusplus');
      expect(getServer().maxPlayers).toBe(12);
    });

    it('prunes revisions to the newest 50 and keeps creation order under a frozen clock', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      for (let i = 0; i < MAX_CONFIG_REVISIONS; i += 1) {
        dbi.db
          .insert(serverConfigRevisions)
          .values({
            id: crypto.randomUUID(),
            serverId: SERVER_ID,
            fileKind: 'server_dz',
            content: `seed ${i}`,
            contentHash: 'f'.repeat(64),
            source: 'external',
            userId: null,
            createdAt: new Date(T0 - 100_000 + i),
          })
          .run();
      }
      const oldestId = revisionRows().sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0].id;

      const loaded = lockAndLoad();
      const first = service.save(getServer(), alice, {
        baseHash: loaded.contentHash!,
        content: loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 41'),
      });
      const second = service.save(getServer(), alice, {
        baseHash: first.contentHash,
        content: loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 42'),
      });

      const rows = revisionRows();
      expect(rows).toHaveLength(MAX_CONFIG_REVISIONS);
      expect(rows.some(row => row.id === oldestId)).toBe(false);
      expect(new Date(second.revision.createdAt).getTime()).toBe(
        new Date(first.revision.createdAt).getTime() + 1,
      );
      const listed = service.listRevisions(SERVER_ID);
      expect(listed).toHaveLength(MAX_CONFIG_REVISIONS);
      expect(listed[0].id).toBe(second.revision.id);
      expect(listed[1].id).toBe(first.revision.id);
      expect(listed[2].source).toBe('external');
    });

    describe('guards refuse with zero mutation', () => {
      let loaded: ReturnType<ServerDzConfigService['load']>;
      let validEdit: string;

      beforeEach(() => {
        writeDisk(encodeCfg(ORIGINAL_LF, { bom: true, crlf: true }));
        loaded = lockAndLoad();
        validEdit = loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 45');
      });

      const attempt = (
        overrides: {
          server?: Partial<Server>;
          actor?: typeof alice;
          baseHash?: string;
          content?: string;
        } = {},
      ) =>
        service.save({ ...getServer(), ...overrides.server }, overrides.actor ?? alice, {
          baseHash: overrides.baseHash ?? loaded.contentHash!,
          content: overrides.content ?? validEdit,
        });

      it.each(['starting', 'running', 'stopping'] as const)(
        'server %s → SERVER_RUNNING_CONFIG_LOCKED',
        status => {
          const before = snapshot();
          const err = expectStorageError(
            () => attempt({ server: { status } }),
            'SERVER_RUNNING_CONFIG_LOCKED',
          );
          expect(err.params).toEqual({ id: SERVER_ID, name: 'Test Server', status });
          expectZeroMutation(before);
        },
      );

      it('lock missing, held by another tab, held by another user, or expired → CONFIG_LOCK_NOT_HELD', () => {
        const before = snapshot();
        expectStorageError(
          () => attempt({ actor: { userId: ALICE.id, sessionToken: TAB_2 } }),
          'CONFIG_LOCK_NOT_HELD',
        );
        expectStorageError(
          () => attempt({ actor: { userId: BOB.id, sessionToken: TAB_1 } }),
          'CONFIG_LOCK_NOT_HELD',
        );
        now = T0 + CONFIG_EDIT_LOCK_TTL_MS;
        expectStorageError(() => attempt(), 'CONFIG_LOCK_NOT_HELD');
        locks.release(SERVER_ID, 'server_dz', alice);
        now = T0;
        expectStorageError(() => attempt(), 'CONFIG_LOCK_NOT_HELD');
        expect(snapshot()).toEqual({ ...before, server: getServer() });
        expect(getServer()).toEqual(before.server);
      });

      it('stale base hash → CONFIG_HASH_MISMATCH', () => {
        const before = snapshot();
        expectStorageError(() => attempt({ baseHash: 'a'.repeat(64) }), 'CONFIG_HASH_MISMATCH');
        expectZeroMutation(before);
      });

      it('validation errors → 422 CONFIG_VALIDATION_FAILED with flat params', () => {
        const before = snapshot();
        const err = expectStorageError(
          () =>
            attempt({
              content: validEdit
                .replace('maxPlayers = 45;', 'maxPlayers = 500;')
                .replace('motd[] = {};', 'motd[] = {'),
            }),
          'CONFIG_VALIDATION_FAILED',
        );
        expect(err.statusCode).toBe(422);
        expect(err.params).toEqual({
          errorCount: expect.any(Number),
          firstLine: 5,
          firstMessage: expect.stringContaining('maxPlayers'),
        });
        expect((err.params as { errorCount: number }).errorCount).toBeGreaterThanOrEqual(2);
        expectZeroMutation(before);
      });

      it('content over 64 KB → 413 CONFIG_FILE_TOO_LARGE', () => {
        const before = snapshot();
        const err = expectStorageError(
          () => attempt({ content: `${validEdit}//${'x'.repeat(SERVER_CONFIG_MAX_BYTES)}` }),
          'CONFIG_FILE_TOO_LARGE',
        );
        expect(err.statusCode).toBe(413);
        expectZeroMutation(before);
      });

      it('content that exceeds 64 KB only after CRLF + BOM restoration → CONFIG_FILE_TOO_LARGE', () => {
        const padding = '//\n'.repeat(
          Math.floor((SERVER_CONFIG_MAX_BYTES - validEdit.length - 10) / 3),
        );
        const content = `${padding}${validEdit}`;
        expect(Buffer.byteLength(content)).toBeLessThanOrEqual(SERVER_CONFIG_MAX_BYTES);
        const before = snapshot();
        expectStorageError(() => attempt({ content }), 'CONFIG_FILE_TOO_LARGE');
        expectZeroMutation(before);
      });

      it('symlinked, non-regular, or escaping target → CONFIG_PATH_INVALID', () => {
        const outside = path.join(tempReal, 'outside');
        fs.mkdirSync(outside);
        const realRealpath = fs.realpathSync.bind(fs);
        const spy = vi
          .spyOn(fs, 'realpathSync')
          .mockImplementation(((p: fs.PathLike, ...rest: []) =>
            String(p) === cfgPath
              ? path.join(outside, 'serverDZ.cfg')
              : realRealpath(p, ...rest)) as typeof fs.realpathSync);
        let before = snapshot();
        expectStorageError(() => attempt(), 'CONFIG_PATH_INVALID');
        expectZeroMutation(before);
        spy.mockRestore();

        fs.rmSync(cfgPath);
        fs.symlinkSync(outside, cfgPath, LINK_TYPE);
        before = snapshot();
        expectStorageError(() => attempt(), 'CONFIG_PATH_INVALID');
        expectZeroMutation(before);
        expect(fs.readdirSync(outside)).toEqual([]);
        fs.rmSync(cfgPath, { recursive: true, force: true });

        fs.mkdirSync(cfgPath);
        before = snapshot();
        expectStorageError(() => attempt(), 'CONFIG_PATH_INVALID');
        expectZeroMutation(before);
      });

      it('installation directory outside the host → CONFIG_PATH_INVALID', () => {
        const before = snapshot();
        expectStorageError(
          () => attempt({ server: { installPath: path.join(tempReal, 'gone') } }),
          'CONFIG_PATH_INVALID',
        );
        expectZeroMutation(before);
      });

      it('file deleted since load → CONFIG_FILE_MISSING', () => {
        fs.rmSync(cfgPath);
        const before = snapshot();
        expectStorageError(() => attempt(), 'CONFIG_FILE_MISSING');
        expectZeroMutation(before);
      });
    });

    it('reports an unrecordable revision after the write and rethrows', () => {
      expect(getServer().maxPlayers).toBe(60);
      writeDisk(encodeCfg(ORIGINAL_LF));
      const loaded = lockAndLoad();
      expect(getServer().maxPlayers).toBe(40);
      dbi.sqlite.exec(
        "CREATE TRIGGER fail_revisions BEFORE INSERT ON server_config_revisions BEGIN SELECT RAISE(ABORT, 'revision store offline'); END;",
      );
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const content = loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 44');

      expect(() =>
        service.save(getServer(), alice, { baseHash: loaded.contentHash!, content }, logger),
      ).toThrow('revision store offline');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ serverId: SERVER_ID, source: 'editor' }),
        'serverDZ.cfg was written but its revision could not be recorded',
      );
      expect(getServer().maxPlayers).toBe(40);
      expect(revisionRows()).toHaveLength(1);

      const second = readDisk();
      expect(() =>
        service.save(getServer(), alice, {
          baseHash: sha256(second),
          content: content.replace('maxPlayers = 44', 'maxPlayers = 43'),
        }),
      ).toThrow('revision store offline');
    });
  });

  describe('restore', () => {
    it('restores a prior plaintext revision through the full save path and syncs queryPort/maxPlayers while preserving missionPath', () => {
      writeDisk(encodeCfg(ORIGINAL_LF, { crlf: true }));
      const loaded = lockAndLoad();
      const externalId = loaded.latestRevision!.id;
      updateServer({ missionPath: 'mpmissions/dayzOffline.sakhal' });
      now = T0 + 10;
      const saved = service.save(getServer(), alice, {
        baseHash: loaded.contentHash!,
        content: loaded
          .content!.replace('maxPlayers = 40', 'maxPlayers = 70')
          .replace('steamQueryPort = 27016', 'steamQueryPort = 27025')
          .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch')
          .replace(`"${DISK_JOIN}"`, '"temp-join-pw"'),
      });
      expect(getServer()).toMatchObject({
        queryPort: 27025,
        maxPlayers: 70,
        missionPath: 'mpmissions/dayzOffline.sakhal',
      });
      now = T0 + 20;

      const restored = service.restore(getServer(), alice, {
        revisionId: externalId,
        baseHash: saved.contentHash,
      });

      expect(readDisk().toString('utf8')).toBe(ORIGINAL_LF.replace(/\n/g, '\r\n'));
      expect(restored.revision).toMatchObject({ source: 'restore', authorName: 'Alice A.' });
      expect(restored.projection).toEqual({
        missionTemplate: 'dayzOffline.chernarusplus',
        steamQueryPort: 27016,
        maxPlayers: 40,
      });
      expect(getServer()).toMatchObject({
        queryPort: 27016,
        maxPlayers: 40,
        missionPath: 'mpmissions/dayzOffline.sakhal',
      });
      expect(backupFiles()).toHaveLength(2);
    });

    it('refuses unknown revisions, running servers, missing locks, and stale hashes with zero mutation', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      const loaded = lockAndLoad();
      const revisionId = loaded.latestRevision!.id;
      const before = snapshot();

      const notFound = expectStorageError(
        () =>
          service.restore(getServer(), alice, {
            revisionId: crypto.randomUUID(),
            baseHash: loaded.contentHash!,
          }),
        'CONFIG_REVISION_NOT_FOUND',
      );
      expect(notFound.statusCode).toBe(404);
      expectStorageError(
        () =>
          service.restore({ ...getServer(), status: 'running' }, alice, {
            revisionId,
            baseHash: loaded.contentHash!,
          }),
        'SERVER_RUNNING_CONFIG_LOCKED',
      );
      expectStorageError(
        () =>
          service.restore(
            getServer(),
            { userId: ALICE.id, sessionToken: TAB_2 },
            { revisionId, baseHash: loaded.contentHash! },
          ),
        'CONFIG_LOCK_NOT_HELD',
      );
      expectStorageError(
        () => service.restore(getServer(), alice, { revisionId, baseHash: 'b'.repeat(64) }),
        'CONFIG_HASH_MISMATCH',
      );
      expectZeroMutation(before);
    });
  });

  describe('bootstrap', () => {
    it('creates the vanilla template with server name, mission, query port, and empty plaintext passwords', () => {
      updateServer({
        name: 'Fresh "Q" Server',
        queryPort: 27030,
      });
      locks.acquire(SERVER_ID, 'server_dz', alice);
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

      const result = service.bootstrap(getServer(), alice, logger);

      const text = readDisk().toString('utf8');
      const lf = text.replace(/\r\n/g, '\n');
      expect(text.includes('\r\n')).toBe(HOST_EOL === 'crlf');
      expect(lf).toContain('hostname = "Fresh ""Q"" Server";');
      expect(lf).toContain('password = "";');
      expect(lf).toContain('passwordAdmin = "";');
      expect(lf).toContain('steamQueryPort = 27030;');
      expect(lf).toContain('\t\ttemplate = "dayzOffline.chernarusplus";');
      expect(result.revision).toMatchObject({ source: 'template', authorUserId: ALICE.id });
      expect(result.contentHash).toBe(sha256(readDisk()));
      expect(revisionRows()[0].content).toContain('passwordAdmin = "";');
      expect(backupFiles()).toEqual([]);
      expect(getServer().queryPort).toBe(27030);
    });

    it('auto-discovers first valid mission with init.c when server missionPath is missing or invalid on disk', () => {
      fs.writeFileSync(
        path.join(installDir, 'mpmissions', 'dayzOffline.enoch', 'init.c'),
        'void main() {}',
      );
      updateServer({ missionPath: 'mpmissions\\dayzOffline.missing' });
      locks.acquire(SERVER_ID, 'server_dz', alice);

      const result = service.bootstrap(getServer(), alice);

      const lf = readDisk().toString('utf8').replace(/\r\n/g, '\n');
      expect(lf).toContain('\t\ttemplate = "dayzOffline.enoch";');
      expect(result.projection.missionTemplate).toBe('dayzOffline.enoch');
      expect(getServer().missionPath).toBe('mpmissions\\dayzOffline.enoch');
    });

    it('refuses when the file already exists, server runs, or lock is missing, with zero mutation', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      locks.acquire(SERVER_ID, 'server_dz', alice);
      const before = snapshot();
      expectStorageError(() => service.bootstrap(getServer(), alice), 'CONFIG_FILE_EXISTS');
      expectStorageError(
        () => service.bootstrap({ ...getServer(), status: 'starting' }, alice),
        'SERVER_RUNNING_CONFIG_LOCKED',
      );
      expectStorageError(
        () => service.bootstrap(getServer(), { userId: BOB.id, sessionToken: TAB_1 }),
        'CONFIG_LOCK_NOT_HELD',
      );
      expectZeroMutation(before);
    });

    it('refuses a symlinked or directory placeholder at the target path', () => {
      locks.acquire(SERVER_ID, 'server_dz', alice);
      fs.mkdirSync(cfgPath);
      const before = snapshot();
      expectStorageError(() => service.bootstrap(getServer(), alice), 'CONFIG_FILE_EXISTS');
      expectZeroMutation(before);
    });

    it('refuses unusable template inputs and failing server checks with 422 and no file', () => {
      locks.acquire(SERVER_ID, 'server_dz', alice);
      const cases: [Partial<Server>, string][] = [
        [{ missionPath: 'mpmissions/' }, "Invalid mission template ''"],
        [
          { name: 'Bad\nName' },
          "Template field 'hostname' must not contain CR, LF, or null characters",
        ],
        [
          { missionPath: 'mpmissions/dayzOffline.missing' },
          'Configuration has 1 validation error(s).',
        ],
        [{ queryPort: 2402 }, 'Configuration has 1 validation error(s).'],
      ];
      for (const [patch, message] of cases) {
        const before = snapshot();
        const err = expectStorageError(
          () => service.bootstrap({ ...getServer(), ...patch }, alice),
          'CONFIG_VALIDATION_FAILED',
        );
        expect(err.statusCode).toBe(422);
        expect(err.message).toBe(message);
        expect(err.params).toMatchObject({ errorCount: 1, firstLine: expect.any(Number) });
        expectZeroMutation(before);
      }
      expect(fs.existsSync(cfgPath)).toBe(false);
    });

    it('rethrows unexpected template rendering failures unchanged', () => {
      locks.acquire(SERVER_ID, 'server_dz', alice);
      vi.mocked(dayzConfigModule.renderServerDzTemplate).mockImplementationOnce(() => {
        throw new TypeError('renderer broke');
      });
      expect(() => service.bootstrap(getServer(), alice)).toThrow(TypeError);
      expect(fs.existsSync(cfgPath)).toBe(false);
    });

    it('refuses an unusable installation directory', () => {
      locks.acquire(SERVER_ID, 'server_dz', alice);
      expectStorageError(
        () =>
          service.bootstrap({ ...getServer(), installPath: path.join(tempReal, 'gone') }, alice),
        'CONFIG_PATH_INVALID',
      );
    });
  });

  describe('revisions', () => {
    it('lists newest first with author names and returns plaintext detail', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      dbi.db.update(users).set({ displayName: null }).where(eq(users.id, ALICE.id)).run();
      const loaded = lockAndLoad();
      now = T0 + 5;
      const saved = service.save(getServer(), alice, {
        baseHash: loaded.contentHash!,
        content: loaded.content!.replace('maxPlayers = 40', 'maxPlayers = 33'),
      });

      const list = service.listRevisions(SERVER_ID);
      expect(list.map(r => [r.source, r.authorName])).toEqual([
        ['editor', 'alice'],
        ['external', null],
      ]);
      const detail = service.getRevision(SERVER_ID, saved.revision.id);
      expect(detail).toMatchObject({
        ...saved.revision,
        content: expect.stringContaining('maxPlayers = 33;'),
      });
      expect(detail.content).toContain(`password = "${DISK_JOIN}";`);
      expect(service.listRevisions(OTHER_SERVER_ID)).toEqual([]);
    });

    it('refuses revisions of another server or unknown ids', () => {
      writeDisk(encodeCfg(ORIGINAL_LF));
      const loaded = service.load(getServer(), { userId: ALICE.id });
      const err = expectStorageError(
        () => service.getRevision(OTHER_SERVER_ID, loaded.latestRevision!.id),
        'CONFIG_REVISION_NOT_FOUND',
      );
      expect(err.params).toEqual({ revisionId: loaded.latestRevision!.id });
    });
  });

  it('defaults clock and platform to the host when not injected', () => {
    writeDisk(encodeCfg(ORIGINAL_LF));
    const hostService = new ServerDzConfigService({ db: dbi.db, sqlite: dbi.sqlite, locks });
    const before = Date.now();
    const result = hostService.load(getServer(), { userId: ALICE.id });
    expect(new Date(result.latestRevision!.createdAt).getTime()).toBeGreaterThanOrEqual(before);
    fs.rmSync(cfgPath);
    expect(hostService.load(getServer(), { userId: ALICE.id }).eol).toBe(HOST_EOL);
  });
});
