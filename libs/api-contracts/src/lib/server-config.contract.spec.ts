import { describe, expect, it } from 'vitest';

import {
  acquireConfigLockRequestSchema,
  bootstrapServerDzConfigRequestSchema,
  CONFIG_DIAGNOSTIC_CODE_VALUES,
  CONFIG_FILE_KIND,
  CONFIG_REVISION_SOURCE_VALUES,
  configContentHashSchema,
  configDiagnosticSchema,
  configDiagnosticSeveritySchema,
  configEolSchema,
  configFileKindSchema,
  configLockResponseSchema,
  configLockSessionRequestSchema,
  configRevisionDetailSchema,
  configRevisionListSchema,
  configRevisionParamSchema,
  configRevisionSourceSchema,
  configRevisionSummarySchema,
  configSessionTokenSchema,
  getServerDzConfigQuerySchema,
  releaseConfigLockResponseSchema,
  restoreConfigRevisionRequestSchema,
  saveServerDzConfigRequestSchema,
  saveServerDzConfigResponseSchema,
  SERVER_CONFIG_MAX_BYTES,
  serverConfigContentSchema,
  serverDzConfigResponseSchema,
  serverDzProjectionSchema,
  syncBattlEyeConfigResponseSchema,
  validateServerDzConfigRequestSchema,
  validateServerDzConfigResponseSchema,
} from './server-config.contract';

const SERVER_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
const REVISION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const SESSION_TOKEN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const HASH = 'a'.repeat(64);
const ISO = '2026-11-14T12:00:00.000Z';

const DIAGNOSTIC = {
  severity: 'error',
  code: 'MISSING_SEMICOLON',
  message: "Missing ';' at the end of the statement",
  line: 3,
  column: 15,
  endLine: 3,
  endColumn: 15,
} as const;

const PROJECTION = {
  missionTemplate: 'dayzOffline.chernarusplus',
  steamQueryPort: 2305,
  maxPlayers: 60,
};

const REVISION = {
  id: REVISION_ID,
  source: 'editor',
  authorUserId: 'user-1',
  authorName: 'admin',
  contentHash: HASH,
  createdAt: ISO,
} as const;

const LOCK = {
  holderUserId: 'user-1',
  holderName: 'admin',
  acquiredAt: ISO,
  expiresAt: '2026-11-14T12:02:00.000Z',
  heldByYou: true,
};

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

describe('server config enums', () => {
  it('exposes the canonical file kind, EOL, revision source and severity values', () => {
    expect(CONFIG_FILE_KIND.SERVER_DZ).toBe('server_dz');
    expect(configFileKindSchema.options).toEqual(['server_dz']);
    expect(configEolSchema.options).toEqual(['crlf', 'lf']);
    expect(CONFIG_REVISION_SOURCE_VALUES).toEqual(['editor', 'restore', 'template', 'external']);
    expect(configDiagnosticSeveritySchema.options).toEqual(['error', 'warning']);
  });

  it('rejects values outside each enum', () => {
    expect(configFileKindSchema.safeParse('beserver').success).toBe(false);
    expect(configEolSchema.safeParse('cr').success).toBe(false);
    expect(configRevisionSourceSchema.safeParse('import').success).toBe(false);
    expect(configDiagnosticSeveritySchema.safeParse('info').success).toBe(false);
  });
});

describe('configDiagnosticSchema', () => {
  it('accepts a diagnostic with every known code', () => {
    for (const code of CONFIG_DIAGNOSTIC_CODE_VALUES) {
      expect(configDiagnosticSchema.safeParse({ ...DIAGNOSTIC, code }).success).toBe(true);
    }
  });

  it.each([
    ['an unknown code', { code: 'TYPO' }],
    ['an unknown severity', { severity: 'info' }],
    ['an empty message', { message: '' }],
    ['a zero line', { line: 0 }],
    ['a zero column', { column: 0 }],
    ['a fractional endLine', { endLine: 1.5 }],
    ['a zero endColumn', { endColumn: 0 }],
  ])('rejects %s', (_, override) => {
    expect(configDiagnosticSchema.safeParse({ ...DIAGNOSTIC, ...override }).success).toBe(false);
  });

  it('rejects a diagnostic missing its end position', () => {
    const withoutEnd = { ...DIAGNOSTIC, endLine: undefined };
    expect(configDiagnosticSchema.safeParse(withoutEnd).success).toBe(false);
  });
});

describe('serverConfigContentSchema — 64 KB UTF-8 byte limit', () => {
  it('uses a 65536-byte limit', () => {
    expect(SERVER_CONFIG_MAX_BYTES).toBe(65536);
  });

  it.each([
    ['1-byte ASCII', 'a', 65536],
    ['2-byte Cyrillic', 'ж', 32768],
    ['3-byte Euro sign', '€', 21845],
    ['4-byte emoji', '😀', 16384],
  ])('counts %s characters by UTF-8 bytes at the boundary', (_, char, count) => {
    const filler = 'a'.repeat(SERVER_CONFIG_MAX_BYTES - utf8Bytes(char.repeat(count)));
    const atLimit = char.repeat(count) + filler;
    expect(utf8Bytes(atLimit)).toBe(SERVER_CONFIG_MAX_BYTES);
    expect(serverConfigContentSchema.safeParse(atLimit).success).toBe(true);

    const overLimit = `${atLimit}a`;
    const res = serverConfigContentSchema.safeParse(overLimit);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Configuration must not exceed 65536 bytes');
    }
  });

  it('rejects text under the character limit but over the byte limit', () => {
    const text = 'ж'.repeat(32769);
    expect(text.length).toBeLessThan(SERVER_CONFIG_MAX_BYTES);
    expect(serverConfigContentSchema.safeParse(text).success).toBe(false);
  });

  it('counts a lone surrogate as the 3 bytes it encodes to', () => {
    const text = `\uD800${'a'.repeat(SERVER_CONFIG_MAX_BYTES - 3)}`;
    expect(utf8Bytes(text)).toBe(SERVER_CONFIG_MAX_BYTES);
    expect(serverConfigContentSchema.safeParse(text).success).toBe(true);
    expect(serverConfigContentSchema.safeParse(`${text}a`).success).toBe(false);
  });

  it('accepts empty content', () => {
    expect(serverConfigContentSchema.safeParse('').success).toBe(true);
  });
});

describe('scalar config schemas', () => {
  it('accepts only lowercase 64-character SHA-256 hex digests', () => {
    expect(configContentHashSchema.safeParse(HASH).success).toBe(true);
    expect(configContentHashSchema.safeParse('A'.repeat(64)).success).toBe(false);
    expect(configContentHashSchema.safeParse('a'.repeat(63)).success).toBe(false);
    expect(configContentHashSchema.safeParse('g'.repeat(64)).success).toBe(false);
  });

  it('accepts only UUID session tokens', () => {
    expect(configSessionTokenSchema.safeParse(SESSION_TOKEN).success).toBe(true);
    const res = configSessionTokenSchema.safeParse('tab-1');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('Session token must be a valid UUID');
    }
  });

  it('bounds the projection to valid ports and player counts', () => {
    expect(serverDzProjectionSchema.safeParse(PROJECTION).success).toBe(true);
    expect(
      serverDzProjectionSchema.safeParse({ ...PROJECTION, missionTemplate: null }).success,
    ).toBe(true);
    expect(serverDzProjectionSchema.safeParse({ ...PROJECTION, missionTemplate: '' }).success).toBe(
      false,
    );
    expect(
      serverDzProjectionSchema.safeParse({ ...PROJECTION, steamQueryPort: 1023 }).success,
    ).toBe(false);
    expect(
      serverDzProjectionSchema.safeParse({ ...PROJECTION, steamQueryPort: 65536 }).success,
    ).toBe(false);
    expect(serverDzProjectionSchema.safeParse({ ...PROJECTION, maxPlayers: 0 }).success).toBe(
      false,
    );
    expect(serverDzProjectionSchema.safeParse({ ...PROJECTION, maxPlayers: 201 }).success).toBe(
      false,
    );
  });
});

describe('lock schemas', () => {
  it('validates lock responses with ISO timestamps', () => {
    expect(configLockResponseSchema.safeParse(LOCK).success).toBe(true);
    expect(configLockResponseSchema.safeParse({ ...LOCK, expiresAt: 'soon' }).success).toBe(false);
    expect(configLockResponseSchema.safeParse({ ...LOCK, holderName: '' }).success).toBe(false);
  });

  it('accepts acquire requests with an optional boolean takeover flag', () => {
    expect(acquireConfigLockRequestSchema.safeParse({ sessionToken: SESSION_TOKEN }).success).toBe(
      true,
    );
    expect(
      acquireConfigLockRequestSchema.safeParse({ sessionToken: SESSION_TOKEN, takeover: true })
        .success,
    ).toBe(true);
    expect(
      acquireConfigLockRequestSchema.safeParse({ sessionToken: SESSION_TOKEN, takeover: 'yes' })
        .success,
    ).toBe(false);
    expect(acquireConfigLockRequestSchema.safeParse({ takeover: true }).success).toBe(false);
  });

  it('requires a UUID session token for heartbeat, release and bootstrap', () => {
    for (const schema of [configLockSessionRequestSchema, bootstrapServerDzConfigRequestSchema]) {
      expect(schema.safeParse({ sessionToken: SESSION_TOKEN }).success).toBe(true);
      expect(schema.safeParse({ sessionToken: 'x' }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    }
  });

  it('validates release responses', () => {
    expect(releaseConfigLockResponseSchema.safeParse({ released: false }).success).toBe(true);
    expect(releaseConfigLockResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('revision schemas', () => {
  it('accepts editor and authorless external revisions', () => {
    expect(configRevisionSummarySchema.safeParse(REVISION).success).toBe(true);
    expect(
      configRevisionSummarySchema.safeParse({
        ...REVISION,
        source: 'external',
        authorUserId: null,
        authorName: null,
      }).success,
    ).toBe(true);
  });

  it('rejects malformed revision summaries', () => {
    expect(configRevisionSummarySchema.safeParse({ ...REVISION, id: 'r1' }).success).toBe(false);
    expect(configRevisionSummarySchema.safeParse({ ...REVISION, source: 'manual' }).success).toBe(
      false,
    );
    expect(configRevisionSummarySchema.safeParse({ ...REVISION, contentHash: 'abc' }).success).toBe(
      false,
    );
    expect(configRevisionSummarySchema.safeParse({ ...REVISION, authorName: '' }).success).toBe(
      false,
    );
  });

  it('validates revision lists and requires content on revision details', () => {
    expect(configRevisionListSchema.safeParse([REVISION, REVISION]).success).toBe(true);
    expect(
      configRevisionListSchema.safeParse([{ ...REVISION, createdAt: 'yesterday' }]).success,
    ).toBe(false);
    expect(
      configRevisionDetailSchema.safeParse({ ...REVISION, content: 'hostname = "x";' }).success,
    ).toBe(true);
    expect(configRevisionDetailSchema.safeParse(REVISION).success).toBe(false);
  });

  it('validates revision route params with explicit messages', () => {
    expect(
      configRevisionParamSchema.safeParse({ id: SERVER_ID, revisionId: REVISION_ID }).success,
    ).toBe(true);
    const res = configRevisionParamSchema.safeParse({ id: 'srv', revisionId: 'rev' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.map(issue => issue.message)).toEqual([
        'Invalid server ID format. Must be a valid UUID.',
        'Invalid revision ID format. Must be a valid UUID.',
      ]);
    }
  });
});

describe('serverDzConfigResponseSchema', () => {
  const loaded = {
    exists: true,
    content: 'hostname = "x";\n',
    contentHash: HASH,
    eol: 'crlf',
    hasBom: false,
    sizeBytes: 17,
    projection: PROJECTION,
    serverRunning: false,
    lock: LOCK,
    latestRevision: REVISION,
  };

  it('accepts a loaded file and a missing file', () => {
    expect(serverDzConfigResponseSchema.safeParse(loaded).success).toBe(true);
    expect(
      serverDzConfigResponseSchema.safeParse({
        ...loaded,
        exists: false,
        content: null,
        contentHash: null,
        eol: 'lf',
        sizeBytes: 0,
        projection: null,
        lock: null,
        latestRevision: null,
      }).success,
    ).toBe(true);
  });

  it('rejects malformed load responses', () => {
    expect(serverDzConfigResponseSchema.safeParse({ ...loaded, sizeBytes: -1 }).success).toBe(
      false,
    );
    expect(serverDzConfigResponseSchema.safeParse({ ...loaded, eol: 'CRLF' }).success).toBe(false);
    expect(serverDzConfigResponseSchema.safeParse({ ...loaded, contentHash: 'abc' }).success).toBe(
      false,
    );
    const withoutRunning = { ...loaded, serverRunning: undefined };
    expect(serverDzConfigResponseSchema.safeParse(withoutRunning).success).toBe(false);
  });

  it('accepts an optional UUID session token query', () => {
    expect(getServerDzConfigQuerySchema.safeParse({}).success).toBe(true);
    expect(getServerDzConfigQuerySchema.safeParse({ sessionToken: SESSION_TOKEN }).success).toBe(
      true,
    );
    expect(getServerDzConfigQuerySchema.safeParse({ sessionToken: '1' }).success).toBe(false);
  });
});

describe('validate / save / restore schemas', () => {
  const oversized = 'a'.repeat(SERVER_CONFIG_MAX_BYTES + 1);

  it('validates validate requests and responses', () => {
    expect(validateServerDzConfigRequestSchema.safeParse({ content: 'a=1;' }).success).toBe(true);
    expect(validateServerDzConfigRequestSchema.safeParse({ content: oversized }).success).toBe(
      false,
    );
    expect(
      validateServerDzConfigResponseSchema.safeParse({ valid: false, diagnostics: [DIAGNOSTIC] })
        .success,
    ).toBe(true);
    expect(
      validateServerDzConfigResponseSchema.safeParse({
        valid: true,
        diagnostics: [{ ...DIAGNOSTIC, line: 0 }],
      }).success,
    ).toBe(false);
  });

  it('requires session token, base hash and bounded content on save', () => {
    const save = { sessionToken: SESSION_TOKEN, baseHash: HASH, content: 'a=1;' };
    expect(saveServerDzConfigRequestSchema.safeParse(save).success).toBe(true);
    expect(saveServerDzConfigRequestSchema.safeParse({ ...save, content: oversized }).success).toBe(
      false,
    );
    expect(saveServerDzConfigRequestSchema.safeParse({ ...save, baseHash: 'x' }).success).toBe(
      false,
    );
    expect(saveServerDzConfigRequestSchema.safeParse({ ...save, sessionToken: 'x' }).success).toBe(
      false,
    );
  });

  it('validates save responses', () => {
    const response = {
      contentHash: HASH,
      projection: PROJECTION,
      diagnostics: [],
      revision: REVISION,
    };
    expect(saveServerDzConfigResponseSchema.safeParse(response).success).toBe(true);
    expect(
      saveServerDzConfigResponseSchema.safeParse({ ...response, projection: null }).success,
    ).toBe(false);
  });

  it('requires session token and base hash on restore', () => {
    expect(
      restoreConfigRevisionRequestSchema.safeParse({ sessionToken: SESSION_TOKEN, baseHash: HASH })
        .success,
    ).toBe(true);
    expect(
      restoreConfigRevisionRequestSchema.safeParse({ sessionToken: SESSION_TOKEN }).success,
    ).toBe(false);
  });
});

describe('syncBattlEyeConfigResponseSchema', () => {
  const sync = {
    serverId: SERVER_ID,
    syncedAt: ISO,
    battleyeCfgPath: 'C:/DayZServer/profiles/BattlEye/BEServer_x64.cfg',
    battleyeCfgWritten: true,
    staleActiveFilesRemoved: ['BEServer_x64_active_1.cfg'],
    backupPaths: [],
  };

  it('accepts a BattlEye-only sync result and strips serverDZ.cfg fields', () => {
    const res = syncBattlEyeConfigResponseSchema.safeParse({
      ...sync,
      serverCfgPath: 'C:/DayZServer/serverDZ.cfg',
      serverCfgWritten: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual(sync);
    }
  });

  it('rejects malformed sync results', () => {
    expect(
      syncBattlEyeConfigResponseSchema.safeParse({ ...sync, battleyeCfgPath: '' }).success,
    ).toBe(false);
    expect(syncBattlEyeConfigResponseSchema.safeParse({ ...sync, serverId: 'srv' }).success).toBe(
      false,
    );
    expect(syncBattlEyeConfigResponseSchema.safeParse({ ...sync, syncedAt: 'now' }).success).toBe(
      false,
    );
  });
});
