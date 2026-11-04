import { describe, expect, it } from 'vitest';

import {
  createServerSchema,
  safePathSchema,
  serverDetailSchema,
  serverIdParamSchema,
  serverSummarySchema,
  updateServerSchema,
} from '@dsm/api-contracts';

describe('Server Contracts', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('serverIdParamSchema', () => {
    it('accepts valid UUID v4 string', () => {
      expect(serverIdParamSchema.safeParse({ id: validUuid }).success).toBe(true);
    });

    it('rejects malformed or non-UUID string', () => {
      expect(serverIdParamSchema.safeParse({ id: 'invalid-id' }).success).toBe(false);
      expect(serverIdParamSchema.safeParse({ id: "'; DROP TABLE servers; --" }).success).toBe(
        false,
      );
    });
  });

  describe('safePathSchema', () => {
    it('accepts valid POSIX and Windows absolute and relative paths', () => {
      expect(safePathSchema.safeParse('/opt/dayz-server').success).toBe(true);
      expect(safePathSchema.safeParse('C:\\DayZServer\\instance1').success).toBe(true);
      expect(safePathSchema.safeParse('D:/DayZ/profiles').success).toBe(true);
      expect(safePathSchema.safeParse('mpmissions/dayzOffline.chernarusplus').success).toBe(true);
    });

    it.each([
      {
        path: '/opt/dayz/../../etc/shadow',
        expectedError: 'Path traversal (..) is not permitted',
      },
      {
        path: '/opt/dayz\0/injection',
        expectedError: 'Null bytes are forbidden',
      },
      {
        path: 'C:\\DayZ:Server\\bad',
        expectedError: 'Colons are only permitted in Windows drive letter prefixes',
      },
    ])('rejects invalid path: $path', ({ path, expectedError }) => {
      const res = safePathSchema.safeParse(path);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain(expectedError);
      }
    });
  });

  it('validates a correct server summary', () => {
    const summary = {
      id: validUuid,
      name: 'DayZ Chernarus',
      description: 'Vanilla Survival',
      status: 'running' as const,
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = serverSummarySchema.safeParse(summary);
    expect(parsed.success).toBe(true);
  });

  it('validates a correct server detail', () => {
    const detail = {
      id: validUuid,
      name: 'DayZ Livonia',
      description: null,
      status: 'stopped' as const,
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: false,
      installPath: 'C:\\DayZServer',
      profilePath: 'C:\\DayZServer\\profiles',
      missionPath: 'mpmissions\\dayzOffline.enoch',
      launchParameters: '-cpuCount=4',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const parsed = serverDetailSchema.safeParse(detail);
    expect(parsed.success).toBe(true);
  });

  it('validates createServerSchema with valid inputs', () => {
    const payload = {
      name: 'New Server',
      installPath: '/opt/dayz',
      profilePath: '/opt/dayz/profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
    };

    const parsed = createServerSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it.each([
    {
      caseName: 'gamePort and queryPort collide',
      ports: { gamePort: 2302, queryPort: 2302, rconPort: 2310 },
    },
    {
      caseName: 'gamePort and rconPort collide',
      ports: { gamePort: 2302, queryPort: 27016, rconPort: 2302 },
    },
    {
      caseName: 'queryPort and rconPort collide',
      ports: { gamePort: 2302, queryPort: 27016, rconPort: 27016 },
    },
  ])('rejects createServerSchema when $caseName', ({ ports }) => {
    const payload = {
      name: 'New Server',
      installPath: '/opt/dayz',
      profilePath: '/opt/dayz/profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      ...ports,
    };

    const parsed = createServerSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('must all be distinct ports');
    }
  });

  it('validates updateServerSchema and detects port collisions on partial update', () => {
    const validUpdate = {
      name: 'Renamed Server',
      gamePort: 2402,
      queryPort: 27017,
    };
    expect(updateServerSchema.safeParse(validUpdate).success).toBe(true);

    const collidingUpdate = {
      gamePort: 2402,
      queryPort: 2402,
    };
    const parsed = updateServerSchema.safeParse(collidingUpdate);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('must not conflict');
    }
  });
});
