import { describe, expect, it } from 'vitest';

import {
  ACTIVE_SERVER_STATUSES,
  createServerSchema,
  isServerActiveStatus,
  launchParametersSchema,
  safePathSchema,
  SERVER_STATUS,
  SERVER_STATUS_VALUES,
  serverDetailSchema,
  serverIdParamSchema,
  ServerStatus,
  serverStatusSchema,
  serverSummarySchema,
  updateServerSchema,
} from './server.contract';

describe('Server Contracts (@dsm/api-contracts)', () => {
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

  describe('launchParametersSchema', () => {
    it('accepts valid parameter strings', () => {
      expect(
        launchParametersSchema.safeParse('-config=serverDZ.cfg -port=2302 -BEpath=battleye')
          .success,
      ).toBe(true);
      expect(launchParametersSchema.safeParse('').success).toBe(true);
      expect(launchParametersSchema.safeParse('a'.repeat(1024)).success).toBe(true);
    });

    it('rejects strings exceeding 1024 characters', () => {
      expect(launchParametersSchema.safeParse('a'.repeat(1025)).success).toBe(false);
    });

    it('rejects strings containing null bytes', () => {
      const res = launchParametersSchema.safeParse('-param=val\0');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Null bytes are forbidden');
      }
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
      launchParameters: '-config=serverDZ.cfg -cpuCount=4',
    };

    it('validates a complete detail object', () => {
      const res = serverDetailSchema.safeParse(validDetail);
      expect(res.success).toBe(true);
    });

    it('accepts null or omitted launchParameters', () => {
      expect(serverDetailSchema.safeParse({ ...validDetail, launchParameters: null }).success).toBe(
        true,
      );
      const withoutParams = { ...validDetail };
      delete (withoutParams as Record<string, unknown>).launchParameters;
      expect(serverDetailSchema.safeParse(withoutParams).success).toBe(true);
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
      launchParameters: '-adminlog -freezecheck',
      isDefault: false,
    };

    it('validates a complete payload with distinct ports', () => {
      const res = createServerSchema.safeParse(validCreatePayload);
      expect(res.success).toBe(true);
    });

    it('applies default port values when omitted', () => {
      const minimalPayload = {
        name: validCreatePayload.name,
        description: validCreatePayload.description,
        installPath: validCreatePayload.installPath,
        profilePath: validCreatePayload.profilePath,
        missionPath: validCreatePayload.missionPath,
        rconPassword: validCreatePayload.rconPassword,
        launchParameters: validCreatePayload.launchParameters,
        isDefault: validCreatePayload.isDefault,
      };
      const res = createServerSchema.safeParse(minimalPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.gamePort).toBe(2302);
        expect(res.data.queryPort).toBe(27016);
        expect(res.data.rconPort).toBe(2310);
      }
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
    });
  });

  describe('updateServerSchema', () => {
    it('accepts empty object (partial update)', () => {
      const res = updateServerSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it('accepts partial update with only single port', () => {
      expect(updateServerSchema.safeParse({ gamePort: 2302 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ queryPort: 27016 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ rconPort: 2310 }).success).toBe(true);
    });

    it('accepts partial update with distinct pairs or triples of ports', () => {
      expect(updateServerSchema.safeParse({ gamePort: 2302, queryPort: 27016 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ gamePort: 2302, rconPort: 2310 }).success).toBe(true);
      expect(updateServerSchema.safeParse({ queryPort: 27016, rconPort: 2310 }).success).toBe(true);
      expect(
        updateServerSchema.safeParse({ gamePort: 2302, queryPort: 27016, rconPort: 2310 }).success,
      ).toBe(true);
    });

    it('rejects update with colliding ports', () => {
      // gamePort and queryPort collide
      const res1 = updateServerSchema.safeParse({ gamePort: 2302, queryPort: 2302 });
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error.issues[0].message).toBe(
          'Specified ports must not conflict with one another',
        );
        expect(res1.error.issues[0].path).toEqual(['gamePort']);
      }

      // gamePort and rconPort collide
      const res2 = updateServerSchema.safeParse({ gamePort: 2310, rconPort: 2310 });
      expect(res2.success).toBe(false);

      // queryPort and rconPort collide
      const res3 = updateServerSchema.safeParse({ queryPort: 2310, rconPort: 2310 });
      expect(res3.success).toBe(false);

      // all three collide
      const res4 = updateServerSchema.safeParse({
        gamePort: 2302,
        queryPort: 2302,
        rconPort: 2302,
      });
      expect(res4.success).toBe(false);
    });

    it('accepts nullable optional fields', () => {
      const res = updateServerSchema.safeParse({
        description: null,
        rconPassword: null,
        launchParameters: null,
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid field values on update', () => {
      expect(updateServerSchema.safeParse({ name: '' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ name: 'a'.repeat(65) }).success).toBe(false);
      expect(updateServerSchema.safeParse({ description: 'a'.repeat(257) }).success).toBe(false);
      expect(updateServerSchema.safeParse({ rconPassword: '123' }).success).toBe(false);
      expect(updateServerSchema.safeParse({ gamePort: 999 }).success).toBe(false);
      expect(updateServerSchema.safeParse({ installPath: '../invalid' }).success).toBe(false);
    });
  });
});
