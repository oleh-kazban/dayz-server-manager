import { describe, expect, it } from 'vitest';

import { ApiError } from '@aegis/api-client';
import type { ConfigDiagnosticDto, ServerDzConfigResponseDto } from '@aegis/api-contracts';

import type { ConfigEditSession } from './server-config.types';
import {
  countDiagnostics,
  deriveEditorMode,
  formatConfigTimestamp,
  isApiErrorCode,
  isSessionDirty,
  revisionSourceLabel,
} from './server-config.utils';

const BASE_CONFIG: ServerDzConfigResponseDto = {
  exists: true,
  content: 'hostname = "Aegis";\nmaxPlayers = 60;\n',
  contentHash: 'a'.repeat(64),
  eol: 'crlf',
  hasBom: false,
  sizeBytes: 36,
  projection: {
    missionTemplate: 'dayzOffline.chernarusplus',
    steamQueryPort: 27016,
    maxPlayers: 60,
  },
  serverRunning: false,
  lock: null,
  latestRevision: null,
};

describe('server-config.utils', () => {
  describe('isApiErrorCode', () => {
    it('returns true only when error is an ApiError matching the given errorCode', () => {
      const lockError = new ApiError('Locked', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'CONFIG_LOCK_NOT_HELD',
        message: 'Lock lost',
      });

      expect(isApiErrorCode(lockError, 'CONFIG_LOCK_NOT_HELD')).toBe(true);
      expect(isApiErrorCode(lockError, 'CONFIG_HASH_MISMATCH')).toBe(false);
      expect(isApiErrorCode(new Error('CONFIG_LOCK_NOT_HELD'), 'CONFIG_LOCK_NOT_HELD')).toBe(false);
      expect(isApiErrorCode({ errorCode: 'CONFIG_LOCK_NOT_HELD' }, 'CONFIG_LOCK_NOT_HELD')).toBe(
        false,
      );
      expect(isApiErrorCode(null, 'CONFIG_LOCK_NOT_HELD')).toBe(false);
    });
  });

  describe('deriveEditorMode', () => {
    const editingSession: ConfigEditSession = {
      status: 'editing',
      baseHash: 'b'.repeat(64),
      baseContent: 'hostname = "Aegis";',
      draft: 'hostname = "Aegis";',
    };

    const otherLock = {
      holderUserId: 'usr-2',
      holderName: 'Operator B',
      acquiredAt: '2026-11-14T10:00:00.000Z',
      expiresAt: '2026-11-14T10:02:00.000Z',
      heldByYou: false,
    };

    it('prioritizes editing and lost session states over server config metadata', () => {
      expect(
        deriveEditorMode(
          { ...BASE_CONFIG, serverRunning: true, lock: otherLock },
          editingSession,
          true,
        ),
      ).toEqual({ kind: 'editing' });
      expect(deriveEditorMode(BASE_CONFIG, { status: 'lost', draft: 'edited' }, false)).toEqual({
        kind: 'lock-lost',
      });
    });

    it('returns missing mode with effective serverRunning flag when config does not exist', () => {
      const missing = { ...BASE_CONFIG, exists: false, content: null, contentHash: null };
      expect(deriveEditorMode(missing, { status: 'idle' }, false)).toEqual({
        kind: 'missing',
        serverRunning: false,
      });
      expect(deriveEditorMode(missing, { status: 'idle' }, true)).toEqual({
        kind: 'missing',
        serverRunning: true,
      });
      expect(
        deriveEditorMode({ ...missing, serverRunning: true }, { status: 'idle' }, false),
      ).toEqual({
        kind: 'missing',
        serverRunning: true,
      });
    });

    it('returns running mode when server is active either locally or on backend', () => {
      expect(deriveEditorMode(BASE_CONFIG, { status: 'idle' }, true)).toEqual({ kind: 'running' });
      expect(
        deriveEditorMode({ ...BASE_CONFIG, serverRunning: true }, { status: 'idle' }, false),
      ).toEqual({ kind: 'running' });
    });

    it('returns locked-by-other when another user/session holds the lock and viewing otherwise', () => {
      expect(
        deriveEditorMode({ ...BASE_CONFIG, lock: otherLock }, { status: 'idle' }, false),
      ).toEqual({
        kind: 'locked-by-other',
        holderName: 'Operator B',
        acquiredAt: '2026-11-14T10:00:00.000Z',
      });
      expect(
        deriveEditorMode(
          { ...BASE_CONFIG, lock: { ...otherLock, heldByYou: true } },
          { status: 'idle' },
          false,
        ),
      ).toEqual({ kind: 'viewing' });
      expect(deriveEditorMode(BASE_CONFIG, { status: 'acquiring' }, false)).toEqual({
        kind: 'viewing',
      });
    });
  });

  describe('isSessionDirty', () => {
    it('is true only in editing state when draft differs from baseContent', () => {
      expect(isSessionDirty({ status: 'idle' })).toBe(false);
      expect(isSessionDirty({ status: 'acquiring' })).toBe(false);
      expect(isSessionDirty({ status: 'lost', draft: 'x' })).toBe(false);
      expect(
        isSessionDirty({
          status: 'editing',
          baseHash: 'a'.repeat(64),
          baseContent: 'a = 1;',
          draft: 'a = 1;',
        }),
      ).toBe(false);
      expect(
        isSessionDirty({
          status: 'editing',
          baseHash: 'a'.repeat(64),
          baseContent: 'a = 1;',
          draft: 'a = 2;',
        }),
      ).toBe(true);
    });
  });

  describe('countDiagnostics', () => {
    it('counts errors and warnings separately', () => {
      const diagnostics: ConfigDiagnosticDto[] = [
        {
          severity: 'error',
          code: 'UNEXPECTED_TOKEN',
          message: 'Bad syntax',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 5,
        },
        {
          severity: 'warning',
          code: 'UNKNOWN_SETTING',
          message: 'Unknown setting',
          line: 2,
          column: 1,
          endLine: 2,
          endColumn: 10,
        },
        {
          severity: 'warning',
          code: 'DUPLICATE_SETTING',
          message: 'Duplicate setting',
          line: 3,
          column: 1,
          endLine: 3,
          endColumn: 10,
        },
      ];

      expect(countDiagnostics([])).toEqual({ errors: 0, warnings: 0 });
      expect(countDiagnostics(diagnostics)).toEqual({ errors: 1, warnings: 2 });
    });
  });

  describe('formatConfigTimestamp', () => {
    it('formats valid ISO strings via toLocaleString and returns invalid timestamps verbatim', () => {
      const iso = '2026-11-14T10:15:00.000Z';
      expect(formatConfigTimestamp(iso)).toBe(new Date(iso).toLocaleString());
      expect(formatConfigTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
    });
  });

  describe('revisionSourceLabel', () => {
    it('maps every revision source enum to human-readable UI labels', () => {
      expect(revisionSourceLabel('editor')).toBe('Saved in editor');
      expect(revisionSourceLabel('restore')).toBe('Restored revision');
      expect(revisionSourceLabel('template')).toBe('Created from template');
      expect(revisionSourceLabel('external')).toBe('Modified outside DSM');
    });
  });
});
