import { describe, expect, it } from 'vitest';

import { EMPTY_LAUNCH_OPTIONS } from './launch.contract';
import {
  ACTIVE_SERVER_STATUSES,
  createServerSchema,
  discoveredMissionSchema,
  isServerActiveStatus,
  rconIpSchema,
  rconPasswordSchema,
  safePathSchema,
  SERVER_FS_CHECK_STATUS,
  SERVER_FS_CHECK_STATUS_VALUES,
  SERVER_FS_ISSUE_CODE_VALUES,
  SERVER_FS_ISSUE_SEVERITY,
  SERVER_FS_ISSUE_SEVERITY_VALUES,
  SERVER_FS_PATH_TARGET,
  SERVER_FS_PATH_TARGET_VALUES,
  SERVER_STATUS,
  SERVER_STATUS_VALUES,
  serverDetailSchema,
  serverFsCheckStatusSchema,
  serverFsDiagnosticIssueSchema,
  serverFsIssueCodeSchema,
  serverFsIssueSeveritySchema,
  serverFsPathStatusSchema,
  serverFsPathTargetSchema,
  serverIdParamSchema,
  serverNameSchema,
  ServerStatus,
  serverStatusSchema,
  serverSummarySchema,
  updateServerSchema,
  validateServerPathsRequestSchema,
  validateServerPathsResponseSchema,
} from './server.contract';

describe('Server Contracts (@aegis/api-contracts)', () => {
  describe('SERVER_STATUS and SERVER_STATUS_VALUES', () => {
    it('defines canonical server statuses', () => {
      expect(SERVER_STATUS).toEqual({
        STOPPED: 'stopped',
        STARTING: 'starting',
        RUNNING: 'running',
        STOPPING: 'stopping',
        FAILED: 'failed',
      });
      expect(SERVER_STATUS_VALUES).toEqual([
        'stopped',
        'starting',
        'running',
        'stopping',
        'failed',
      ]);
    });

    it('defines active server statuses subset', () => {
      expect(ACTIVE_SERVER_STATUSES).toEqual(['running', 'starting', 'stopping']);
    });
  });

  describe('serverStatusSchema', () => {
    it.each(SERVER_STATUS_VALUES)('accepts valid status %s', status => {
      const parsed = serverStatusSchema.safeParse(status);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe(status);
      }
    });

    it('rejects invalid statuses and non-string types', () => {
      expect(serverStatusSchema.safeParse('crashed').success).toBe(false);
      expect(serverStatusSchema.safeParse('updating').success).toBe(false);
      expect(serverStatusSchema.safeParse('').success).toBe(false);
      expect(serverStatusSchema.safeParse(123).success).toBe(false);
      expect(serverStatusSchema.safeParse(null).success).toBe(false);
      expect(serverStatusSchema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('isServerActiveStatus', () => {
    it('returns true for all active server statuses', () => {
      expect(isServerActiveStatus(SERVER_STATUS.RUNNING)).toBe(true);
      expect(isServerActiveStatus(SERVER_STATUS.STARTING)).toBe(true);
      expect(isServerActiveStatus(SERVER_STATUS.STOPPING)).toBe(true);
    });

    it('returns false for inactive server statuses', () => {
      expect(isServerActiveStatus(SERVER_STATUS.STOPPED)).toBe(false);
      expect(isServerActiveStatus(SERVER_STATUS.FAILED)).toBe(false);
    });

    it('returns false for arbitrary unrecognised statuses', () => {
      expect(isServerActiveStatus('unknown' as ServerStatus)).toBe(false);
      expect(isServerActiveStatus('' as ServerStatus)).toBe(false);
      expect(isServerActiveStatus(undefined as unknown as ServerStatus)).toBe(false);
    });
  });

  describe('safePathSchema', () => {
    it('accepts valid POSIX and relative paths', () => {
      expect(safePathSchema.safeParse('/opt/dayz/server.x86_64').success).toBe(true);
      expect(safePathSchema.safeParse('relative/path/to/server').success).toBe(true);
      expect(safePathSchema.safeParse('server_data').success).toBe(true);
    });

    it('accepts valid Windows paths with drive letter prefixes', () => {
      expect(safePathSchema.safeParse('C:/DayZServer/server.exe').success).toBe(true);
      expect(safePathSchema.safeParse('d:\\games\\dayz').success).toBe(true);
      expect(safePathSchema.safeParse('Z:/server').success).toBe(true);
    });

    it('rejects empty strings and paths exceeding 512 characters', () => {
      expect(safePathSchema.safeParse('').success).toBe(false);
      expect(safePathSchema.safeParse('a'.repeat(512)).success).toBe(true);
      expect(safePathSchema.safeParse('a'.repeat(513)).success).toBe(false);
    });

    it('rejects null bytes', () => {
      const res = safePathSchema.safeParse('path/with/\0null');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Null bytes are forbidden');
      }
    });

    it('rejects directory traversal tokens', () => {
      const res = safePathSchema.safeParse('../secret/path');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Path traversal (..) is not permitted');
      }
      expect(safePathSchema.safeParse('some/path/../other').success).toBe(false);
    });

    it('rejects forbidden filesystem characters (< > " | ? *)', () => {
      ['<', '>', '"', '|', '?', '*'].forEach(char => {
        const res = safePathSchema.safeParse(`path/with/${char}/invalid`);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error.issues[0].message).toBe('Path contains invalid filesystem characters');
        }
      });
    });

    it('rejects control characters with charCode < 32', () => {
      const res = safePathSchema.safeParse('path/with/\n/newline');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Path contains invalid filesystem characters');
      }
      expect(safePathSchema.safeParse('path/with/\t/tab').success).toBe(false);
      expect(safePathSchema.safeParse('path/with/\r/cr').success).toBe(false);
    });

    it('handles Windows drive letter colons correctly and rejects invalid colon usages', () => {
      // Valid drive letters: single letter at index 0 followed by colon at index 1
      expect(safePathSchema.safeParse('C:/valid').success).toBe(true);
      expect(safePathSchema.safeParse('c:/valid').success).toBe(true);

      // Colon not at index 1
      expect(safePathSchema.safeParse(':invalid').success).toBe(false);
      expect(safePathSchema.safeParse('path:invalid').success).toBe(false);

      // Colon at index 1 but character at index 0 is not a letter
      expect(safePathSchema.safeParse('1:invalid').success).toBe(false);
      expect(safePathSchema.safeParse('_:invalid').success).toBe(false);

      // Multiple colons
      expect(safePathSchema.safeParse('C:invalid:path').success).toBe(false);
      expect(safePathSchema.safeParse('C:/path:stream').success).toBe(false);
    });
  });

  describe('serverIdParamSchema', () => {
    it('accepts valid UUID v4', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = serverIdParamSchema.safeParse({ id: validUuid });
      expect(res.success).toBe(true);
    });

    it('rejects invalid UUID formats', () => {
      const res = serverIdParamSchema.safeParse({ id: 'not-a-uuid' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Invalid server ID format. Must be a valid UUID.');
      }
      expect(serverIdParamSchema.safeParse({ id: '' }).success).toBe(false);
      expect(serverIdParamSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('serverSummarySchema', () => {
    const validSummary = {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'DayZ Test Server',
      description: 'Community vanilla server',
      status: SERVER_STATUS.RUNNING,
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: false,
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-02T15:30:00.000Z',
    };

    it('validates a complete valid summary object with ISO date strings', () => {
      const res = serverSummarySchema.safeParse(validSummary);
      expect(res.success).toBe(true);
    });

    it('validates a complete valid summary object with Date instances', () => {
      const res = serverSummarySchema.safeParse({
        ...validSummary,
        createdAt: new Date('2026-11-01T12:00:00.000Z'),
        updatedAt: new Date('2026-11-02T15:30:00.000Z'),
      });
      expect(res.success).toBe(true);
    });

    it('handles nullable and optional description', () => {
      const withNull = { ...validSummary, description: null };
      expect(serverSummarySchema.safeParse(withNull).success).toBe(true);

      const withoutDesc = { ...validSummary };
      delete (withoutDesc as Record<string, unknown>).description;
      expect(serverSummarySchema.safeParse(withoutDesc).success).toBe(true);
    });

    it('rejects out of range port numbers', () => {
      expect(serverSummarySchema.safeParse({ ...validSummary, gamePort: 1023 }).success).toBe(
        false,
      );
      expect(serverSummarySchema.safeParse({ ...validSummary, gamePort: 65536 }).success).toBe(
        false,
      );
      expect(serverSummarySchema.safeParse({ ...validSummary, gamePort: 2302.5 }).success).toBe(
        false,
      );
      expect(serverSummarySchema.safeParse({ ...validSummary, queryPort: 1000 }).success).toBe(
        false,
      );
      expect(serverSummarySchema.safeParse({ ...validSummary, rconPort: 70000 }).success).toBe(
        false,
      );
    });

    it('rejects missing or invalid required fields', () => {
      expect(serverSummarySchema.safeParse({ ...validSummary, id: 'invalid-id' }).success).toBe(
        false,
      );
      expect(serverSummarySchema.safeParse({ ...validSummary, name: '' }).success).toBe(false);
      expect(serverSummarySchema.safeParse({ ...validSummary, name: 'a'.repeat(65) }).success).toBe(
        false,
      );
      expect(
        serverSummarySchema.safeParse({ ...validSummary, status: 'invalid-status' }).success,
      ).toBe(false);
      expect(serverSummarySchema.safeParse({ ...validSummary, isDefault: 'true' }).success).toBe(
        false,
      );
      expect(
        serverSummarySchema.safeParse({ ...validSummary, createdAt: 'not-a-date' }).success,
      ).toBe(false);
    });
  });

  describe('serverDetailSchema', () => {
    const validDetail = {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'DayZ Test Server',
      description: 'Community vanilla server',
      status: SERVER_STATUS.RUNNING,
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-02T15:30:00.000Z',
      installPath: 'C:/DayZServer',
      profilePath: 'C:/DayZServer/profiles',
      missionPath: 'C:/DayZServer/mpmissions/dayzOffline.chernarusplus',
      launchOptions: { ...EMPTY_LAUNCH_OPTIONS, cpuCount: 4 },
      maxPlayers: 60,
      rconIp: '127.0.0.1',
      rconPassword: 'secretPassword123',
    };

    it('validates a complete detail object', () => {
      const res = serverDetailSchema.safeParse(validDetail);
      expect(res.success).toBe(true);
    });

    it('rejects out-of-range maxPlayers and invalid RCON IP in detail schema', () => {
      expect(serverDetailSchema.safeParse({ ...validDetail, maxPlayers: 0 }).success).toBe(false);
      expect(serverDetailSchema.safeParse({ ...validDetail, maxPlayers: 201 }).success).toBe(false);
      expect(serverDetailSchema.safeParse({ ...validDetail, rconIp: '999.0.0.1' }).success).toBe(
        false,
      );
    });

    it('strips legacy gameplay fields that now live in serverDZ.cfg', () => {
      const res = serverDetailSchema.safeParse({
        ...validDetail,
        disable3rdPerson: true,
        verifySignatures: false,
        serverTime: 'not-validated-anymore',
        serverTimeAcceleration: 999,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).not.toHaveProperty('disable3rdPerson');
        expect(res.data).not.toHaveProperty('verifySignatures');
        expect(res.data).not.toHaveProperty('serverTime');
        expect(res.data).not.toHaveProperty('serverTimeAcceleration');
      }
    });

    it('requires rconPassword (string | null) without legacy admin/join flags', () => {
      const withoutRconPassword: Record<string, unknown> = { ...validDetail };
      delete withoutRconPassword.rconPassword;
      expect(serverDetailSchema.safeParse(withoutRconPassword).success).toBe(false);

      const nullRcon = serverDetailSchema.safeParse({
        ...validDetail,
        rconPassword: null,
      });
      expect(nullRcon.success).toBe(true);
    });

    it('requires launchOptions and rejects unknown option keys', () => {
      const withoutOptions = { ...validDetail } as Record<string, unknown>;
      delete withoutOptions.launchOptions;
      expect(serverDetailSchema.safeParse(withoutOptions).success).toBe(false);
      expect(
        serverDetailSchema.safeParse({
          ...validDetail,
          launchOptions: { ...EMPTY_LAUNCH_OPTIONS, extra: true },
        }).success,
      ).toBe(false);
    });

    it('rejects invalid path fields in detail schema', () => {
      expect(
        serverDetailSchema.safeParse({ ...validDetail, installPath: '../invalid' }).success,
      ).toBe(false);
      expect(
        serverDetailSchema.safeParse({ ...validDetail, profilePath: 'has/\0/null' }).success,
      ).toBe(false);
      expect(serverDetailSchema.safeParse({ ...validDetail, missionPath: '' }).success).toBe(false);
    });
  });

  describe('createServerSchema', () => {
    const validCreatePayload = {
      name: 'Chernarus Vanilla',
      description: 'Official settings clone',
      installPath: 'C:/DayZServer',
      profilePath: 'C:/DayZServer/profiles',
      missionPath: 'C:/DayZServer/mpmissions/dayzOffline.chernarusplus',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      rconPassword: 'secretPassword123',
      launchOptions: { adminLog: true, freezeCheck: true },
      isDefault: false,
    };

    it('validates a complete payload with distinct ports', () => {
      const res = createServerSchema.safeParse(validCreatePayload);
      expect(res.success).toBe(true);
    });

    it('applies default gamePort, rconPort, and rconIp while keeping auto-resolved fields undefined and stripping removed fields', () => {
      const legacyAdminValue = ['legacy', 'admin'].join('-');
      const legacyJoinValue = ['legacy', 'join'].join('-');
      const minimalPayload = {
        name: validCreatePayload.name,
        installPath: validCreatePayload.installPath,
        disable3rdPerson: true,
        serverTime: '2026/06/15/14/30',
        passwordAdmin: legacyAdminValue,
        serverPassword: legacyJoinValue,
      };
      const res = createServerSchema.safeParse(minimalPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.gamePort).toBe(2302);
        expect(res.data.rconPort).toBe(2310);
        expect(res.data.rconIp).toBe('127.0.0.1');
        expect(res.data.profilePath).toBeUndefined();
        expect(res.data.missionPath).toBeUndefined();
        expect(res.data.queryPort).toBeUndefined();
        expect(res.data.maxPlayers).toBeUndefined();
        expect(res.data).not.toHaveProperty('disable3rdPerson');
        expect(res.data).not.toHaveProperty('serverTime');
        expect(res.data).not.toHaveProperty('passwordAdmin');
        expect(res.data).not.toHaveProperty('serverPassword');
      }

      const withMission = createServerSchema.safeParse({
        name: validCreatePayload.name,
        installPath: validCreatePayload.installPath,
        missionPath: 'mpmissions\\dayzOffline.enoch',
      });
      expect(withMission.success).toBe(true);
      expect(
        createServerSchema.safeParse({
          name: validCreatePayload.name,
          installPath: validCreatePayload.installPath,
          missionPath: '../escape',
        }).success,
      ).toBe(false);
    });

    it('allows omitted queryPort when gamePort is 27016 and rejects gamePort === rconPort', () => {
      expect(
        createServerSchema.safeParse({
          name: 'Custom Game Port',
          installPath: 'C:/DayZServer',
          gamePort: 27016,
          rconPort: 2310,
        }).success,
      ).toBe(true);

      expect(
        createServerSchema.safeParse({
          name: 'Colliding Game And RCON',
          installPath: 'C:/DayZServer',
          gamePort: 2310,
          rconPort: 2310,
        }).success,
      ).toBe(false);
    });

    it('rejects port collision between gamePort and queryPort', () => {
      const res = createServerSchema.safeParse({
        ...validCreatePayload,
        gamePort: 2302,
        queryPort: 2302,
        rconPort: 2310,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'gamePort, queryPort, and rconPort must all be distinct ports',
        );
        expect(res.error.issues[0].path).toEqual(['gamePort']);
      }
    });

    it('rejects port collision between gamePort and rconPort', () => {
      const res = createServerSchema.safeParse({
        ...validCreatePayload,
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2302,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'gamePort, queryPort, and rconPort must all be distinct ports',
        );
      }
    });

    it('rejects port collision between queryPort and rconPort', () => {
      const res = createServerSchema.safeParse({
        ...validCreatePayload,
        gamePort: 2302,
        queryPort: 2310,
        rconPort: 2310,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'gamePort, queryPort, and rconPort must all be distinct ports',
        );
      }
    });

    it('validates optional fields can be omitted or have optional boundaries', () => {
      const minimal = {
        name: 'Min Server',
        installPath: 'C:/DayZServer',
        profilePath: 'C:/DayZServer/profiles',
        missionPath: 'C:/DayZServer/mpmissions/dayzOffline.chernarusplus',
      };
      expect(createServerSchema.safeParse(minimal).success).toBe(true);

      // rconPassword min 6
      expect(createServerSchema.safeParse({ ...minimal, rconPassword: '12345' }).success).toBe(
        false,
      );
      expect(createServerSchema.safeParse({ ...minimal, rconPassword: '123456' }).success).toBe(
        true,
      );

      // name empty
      expect(createServerSchema.safeParse({ ...minimal, name: '' }).success).toBe(false);

      // description > 256
      expect(
        createServerSchema.safeParse({ ...minimal, description: 'a'.repeat(257) }).success,
      ).toBe(false);

      // maxPlayers boundaries 1..200
      expect(createServerSchema.safeParse({ ...minimal, maxPlayers: 0 }).success).toBe(false);
      expect(createServerSchema.safeParse({ ...minimal, maxPlayers: 1 }).success).toBe(true);
      expect(createServerSchema.safeParse({ ...minimal, maxPlayers: 200 }).success).toBe(true);
      expect(createServerSchema.safeParse({ ...minimal, maxPlayers: 201 }).success).toBe(false);
      expect(createServerSchema.safeParse({ ...minimal, maxPlayers: 60.5 }).success).toBe(false);
    });
  });

  describe('Server Credential & Network Field Schemas', () => {
    it('validates serverNameSchema and rejects CR/LF/null control chars', () => {
      expect(serverNameSchema.safeParse('DayZ Chernarus #1').success).toBe(true);
      expect(serverNameSchema.safeParse('').success).toBe(false);
      expect(serverNameSchema.safeParse('a'.repeat(65)).success).toBe(false);
      expect(serverNameSchema.safeParse('Bad\nName').success).toBe(false);
      expect(serverNameSchema.safeParse('Bad\rName').success).toBe(false);
      expect(serverNameSchema.safeParse('Bad\0Name').success).toBe(false);
    });

    it('validates rconIpSchema as IPv4 only', () => {
      expect(rconIpSchema.safeParse('127.0.0.1').success).toBe(true);
      expect(rconIpSchema.safeParse('0.0.0.0').success).toBe(true);
      expect(rconIpSchema.safeParse('255.255.255.255').success).toBe(true);
      expect(rconIpSchema.safeParse('256.0.0.1').success).toBe(false);
      expect(rconIpSchema.safeParse('192.168.1').success).toBe(false);
      expect(rconIpSchema.safeParse('localhost').success).toBe(false);
      expect(rconIpSchema.safeParse('::1').success).toBe(false);
    });

    it('validates rconPasswordSchema 6-32 printable ASCII without quotes, spaces, or backslashes', () => {
      expect(rconPasswordSchema.safeParse('Abc!23#_9').success).toBe(true);
      expect(rconPasswordSchema.safeParse('a'.repeat(6)).success).toBe(true);
      expect(rconPasswordSchema.safeParse('a'.repeat(32)).success).toBe(true);
      expect(rconPasswordSchema.safeParse('a'.repeat(5)).success).toBe(false);
      expect(rconPasswordSchema.safeParse('a'.repeat(33)).success).toBe(false);
      expect(rconPasswordSchema.safeParse('pass word').success).toBe(false);
      expect(rconPasswordSchema.safeParse('pass"word').success).toBe(false);
      expect(rconPasswordSchema.safeParse("pass'word").success).toBe(false);
      expect(rconPasswordSchema.safeParse('pass\\word').success).toBe(false);
      expect(rconPasswordSchema.safeParse('pass\nword').success).toBe(false);
      expect(rconPasswordSchema.safeParse('пароль12').success).toBe(false);
    });
  });

  describe('updateServerSchema', () => {
    it('accepts empty object (partial update)', () => {
      const res = updateServerSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it('accepts partial update with only a single port or distinct game/RCON ports', () => {
      expect(updateServerSchema.safeParse({ gamePort: 2302 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ rconPort: 2310 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ gamePort: 2302, rconPort: 2310 }).success).toBe(true);
    });

    it('rejects update when gamePort and rconPort collide', () => {
      const res = updateServerSchema.safeParse({ gamePort: 2310, rconPort: 2310 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'Specified ports must not conflict with one another',
        );
        expect(res.error.issues[0].path).toEqual(['gamePort']);
      }
    });

    it('accepts safe missionPath on update and rejects traversal or empty missionPath', () => {
      const valid = updateServerSchema.safeParse({
        missionPath: 'mpmissions\\dayzOffline.enoch',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.missionPath).toBe('mpmissions\\dayzOffline.enoch');
      }

      expect(updateServerSchema.safeParse({ missionPath: '../not-validated' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ missionPath: '' }).success).toBe(false);
    });

    it('strips file-owned and removed fields so they never collide or persist', () => {
      const legacyAdminValue = ['legacy', 'admin'].join('-');
      const legacyJoinValue = ['legacy', 'join'].join('-');
      const res = updateServerSchema.safeParse({
        gamePort: 2302,
        queryPort: 2302,
        maxPlayers: 999,
        profilePath: 'custom-profiles',
        passwordAdmin: legacyAdminValue,
        serverPassword: legacyJoinValue,
        serverTime: '2026/02/30/00/00',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toEqual({ gamePort: 2302 });
      }
      expect(updateServerSchema.safeParse({ queryPort: 2310, rconPort: 2310 }).success).toBe(true);
    });

    it('accepts null rconPassword clearing on update and rejects the empty string', () => {
      const res = updateServerSchema.safeParse({
        description: null,
        rconPassword: null,
        launchOptions: EMPTY_LAUNCH_OPTIONS,
      });
      expect(res.success).toBe(true);

      const clearViaEmptyString = updateServerSchema.safeParse({
        rconPassword: '',
      });
      expect(clearViaEmptyString.success).toBe(false);
      expect(updateServerSchema.safeParse({ rconPassword: 'ValidPass!1' }).success).toBe(true);
    });

    it('rejects invalid field values on update', () => {
      expect(updateServerSchema.safeParse({ name: '' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ name: 'a'.repeat(65) }).success).toBe(false);
      expect(updateServerSchema.safeParse({ name: 'Line\nBreak' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ description: 'a'.repeat(257) }).success).toBe(false);
      expect(updateServerSchema.safeParse({ rconPassword: '123' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ rconPassword: 'bad pass' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ rconIp: 'bad-ip' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ gamePort: 999 }).success).toBe(false);
      expect(updateServerSchema.safeParse({ rconPort: 65536 }).success).toBe(false);
      expect(updateServerSchema.safeParse({ installPath: '../invalid' }).success).toBe(false);
    });
  });

  describe('Server Filesystem Inspection Contracts', () => {
    const validReport = {
      serverId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      valid: true,
      platform: 'win32',
      checkedAt: '2026-11-14T12:00:00.000Z',
      paths: {
        installPath: {
          target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
          configuredPath: 'C:\\DayZServer',
          resolvedPath: 'C:\\DayZServer',
          status: SERVER_FS_CHECK_STATUS.VALID,
          exists: true,
          isDirectory: true,
          executablePath: 'C:\\DayZServer\\DayZServer_x64.exe',
          executablePresent: true,
          executableRunnable: true,
        },
        profilePath: {
          target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
          configuredPath: 'profiles',
          resolvedPath: 'C:\\DayZServer\\profiles',
          status: SERVER_FS_CHECK_STATUS.VALID,
          exists: true,
          isDirectory: true,
          writable: true,
        },
        battleyePath: {
          target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
          configuredPath: 'C:\\DayZServer\\profiles\\BattlEye',
          resolvedPath: 'C:\\DayZServer\\profiles\\BattlEye',
          status: SERVER_FS_CHECK_STATUS.WARNING,
          exists: false,
          isDirectory: false,
          writable: false,
        },
        missionPath: {
          target: SERVER_FS_PATH_TARGET.MISSION_PATH,
          configuredPath: 'mpmissions\\dayzOffline.chernarusplus',
          resolvedPath: 'C:\\DayZServer\\mpmissions\\dayzOffline.chernarusplus',
          status: SERVER_FS_CHECK_STATUS.VALID,
          exists: true,
          isDirectory: true,
          hasInitScript: true,
          hasEconomyDb: true,
        },
      },
      discoveredMissions: [
        {
          name: 'dayzOffline.chernarusplus',
          relativePath: 'mpmissions/dayzOffline.chernarusplus',
          resolvedPath: 'C:\\DayZServer\\mpmissions\\dayzOffline.chernarusplus',
          hasInitScript: true,
          hasEconomyDb: true,
        },
      ],
      issues: [
        {
          target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
          severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
          code: 'BATTLEYE_DIR_MISSING',
          message: 'BattlEye directory does not exist yet.',
          path: 'C:\\DayZServer\\profiles\\BattlEye',
        },
      ],
    };

    it('exposes canonical filesystem enum constants and schemas', () => {
      expect(SERVER_FS_PATH_TARGET_VALUES).toEqual([
        'installPath',
        'profilePath',
        'battleyePath',
        'missionPath',
      ]);
      expect(SERVER_FS_CHECK_STATUS_VALUES).toEqual(['valid', 'warning', 'error', 'skipped']);
      expect(SERVER_FS_ISSUE_SEVERITY_VALUES).toEqual(['error', 'warning']);
      expect(SERVER_FS_ISSUE_CODE_VALUES).toHaveLength(24);
      expect(SERVER_FS_ISSUE_CODE_VALUES).toEqual(
        expect.arrayContaining([
          'PROFILE_PATH_NOT_RELATIVE',
          'PROFILE_SYMLINK_ESCAPE',
          'MISSION_PATH_NOT_RELATIVE',
        ]),
      );

      expect(serverFsPathTargetSchema.safeParse('unknownTarget').success).toBe(false);
      expect(serverFsCheckStatusSchema.safeParse('pending').success).toBe(false);
      expect(serverFsIssueSeveritySchema.safeParse('info').success).toBe(false);
      expect(serverFsIssueCodeSchema.safeParse('UNKNOWN_FS_CODE').success).toBe(false);

      for (const code of SERVER_FS_ISSUE_CODE_VALUES) {
        expect(serverFsIssueCodeSchema.safeParse(code).success).toBe(true);
      }
    });

    it('accepts empty, partial, and full override payloads in validateServerPathsRequestSchema', () => {
      expect(validateServerPathsRequestSchema.safeParse({}).success).toBe(true);
      expect(
        validateServerPathsRequestSchema.safeParse({
          missionPath: 'mpmissions/dayzOffline.enoch',
        }).success,
      ).toBe(true);
      expect(
        validateServerPathsRequestSchema.safeParse({
          installPath: '/opt/dayz',
          profilePath: 'profiles',
          missionPath: 'dayzOffline.chernarusplus',
        }).success,
      ).toBe(true);
    });

    it('rejects lexical violations and non-object inputs in validateServerPathsRequestSchema', () => {
      expect(validateServerPathsRequestSchema.safeParse(null).success).toBe(false);
      expect(validateServerPathsRequestSchema.safeParse('not-an-object').success).toBe(false);
      expect(
        validateServerPathsRequestSchema.safeParse({ installPath: 'C:\\DayZ\\..\\evil' }).success,
      ).toBe(false);
      expect(
        validateServerPathsRequestSchema.safeParse({ profilePath: 'profiles\0bad' }).success,
      ).toBe(false);
      expect(
        validateServerPathsRequestSchema.safeParse({ missionPath: 'mpmissions/<bad>' }).success,
      ).toBe(false);
      expect(validateServerPathsRequestSchema.safeParse({ installPath: '' }).success).toBe(false);
      expect(
        validateServerPathsRequestSchema.safeParse({ installPath: 'a'.repeat(513) }).success,
      ).toBe(false);
      expect(
        validateServerPathsRequestSchema.safeParse({ profilePath: 'bad:colon:path' }).success,
      ).toBe(false);
    });

    it('validates complete diagnostic responses, path statuses, issues, and discovered missions', () => {
      expect(validateServerPathsResponseSchema.safeParse(validReport).success).toBe(true);
      expect(
        serverFsPathStatusSchema.safeParse({
          target: 'installPath',
          configuredPath: 'bad',
          resolvedPath: null,
          status: 'error',
          exists: false,
          isDirectory: null,
          executablePath: null,
          executablePresent: false,
          executableRunnable: false,
        }).success,
      ).toBe(true);
      expect(
        serverFsDiagnosticIssueSchema.safeParse({
          target: 'missionPath',
          severity: 'error',
          code: 'MISSION_INIT_SCRIPT_MISSING',
          message: 'Missing init.c',
          path: null,
        }).success,
      ).toBe(true);
      expect(
        discoveredMissionSchema.safeParse({
          name: 'dayzOffline.enoch',
          relativePath: 'mpmissions/dayzOffline.enoch',
          resolvedPath: '/opt/dayz/mpmissions/dayzOffline.enoch',
          hasInitScript: true,
          hasEconomyDb: false,
        }).success,
      ).toBe(true);
    });

    it('rejects malformed diagnostic response fields and unknown issue/status codes', () => {
      expect(
        validateServerPathsResponseSchema.safeParse({
          ...validReport,
          serverId: 'not-a-uuid',
        }).success,
      ).toBe(false);
      expect(
        validateServerPathsResponseSchema.safeParse({
          ...validReport,
          checkedAt: 'not-iso-datetime',
        }).success,
      ).toBe(false);
      expect(
        validateServerPathsResponseSchema.safeParse({
          ...validReport,
          platform: '',
        }).success,
      ).toBe(false);
      expect(
        serverFsDiagnosticIssueSchema.safeParse({
          target: 'installPath',
          severity: 'error',
          code: 'NON_EXISTENT_CODE',
          message: 'Bad code',
        }).success,
      ).toBe(false);
      expect(
        serverFsDiagnosticIssueSchema.safeParse({
          target: 'installPath',
          severity: 'critical',
          code: 'INSTALL_DIR_MISSING',
          message: 'Bad severity',
        }).success,
      ).toBe(false);
      expect(
        discoveredMissionSchema.safeParse({
          name: '',
          relativePath: 'mpmissions/foo',
          resolvedPath: '/opt/dayz/mpmissions/foo',
          hasInitScript: true,
          hasEconomyDb: true,
        }).success,
      ).toBe(false);
    });
  });
});
