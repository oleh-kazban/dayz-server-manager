import { describe, expect, it } from 'vitest';

import {
  ACTIVE_SERVER_STATUSES,
  isServerActiveStatus,
  SERVER_EXIT_REASON_VALUES,
  SERVER_STATUS_VALUES,
  type ServerStatus,
  serverStatusSchema,
} from '@aegis/api-contracts';

import { enUSTranslations } from '../i18n';

import {
  getServerExitPresentation,
  getServerStatusPresentation,
  SERVER_STATUS_VISUAL_META,
  type ServerStatusPresentation,
} from './server-status';

describe('Server Status Model & Presentation', () => {
  describe('getServerStatusPresentation', () => {
    const EXPECTED_PRESENTATIONS: Record<ServerStatus, ServerStatusPresentation> = {
      running: {
        label: 'Running',
        tagStatus: 'online',
        dotClass: 'bg-[var(--color-success)]',
        textClass: 'text-[var(--color-success)]',
        isActive: true,
      },
      starting: {
        label: 'Starting',
        tagStatus: 'restarting',
        dotClass: 'bg-[var(--color-warning)] animate-pulse',
        textClass: 'text-[var(--color-warning)]',
        isActive: true,
      },
      stopping: {
        label: 'Stopping',
        tagStatus: 'restarting',
        dotClass: 'bg-[var(--color-warning)]',
        textClass: 'text-[var(--color-warning)]',
        isActive: true,
      },
      stopped: {
        label: 'Stopped',
        tagStatus: 'stopped',
        dotClass: 'bg-[var(--color-text-muted)]',
        textClass: 'text-[var(--color-text-muted)]',
        isActive: false,
      },
      failed: {
        label: 'Failed',
        tagStatus: 'danger',
        dotClass: 'bg-[var(--color-danger)]',
        textClass: 'text-[var(--color-danger)]',
        isActive: false,
      },
    };

    it.each(SERVER_STATUS_VALUES)(
      'returns complete visual presentation metadata for status "%s"',
      status => {
        const presentation = getServerStatusPresentation(status);
        expect(presentation).toEqual(EXPECTED_PRESENTATIONS[status]);
      },
    );
  });

  describe('isServerActiveStatus', () => {
    it.each(ACTIVE_SERVER_STATUSES)('returns true for active lifecycle status "%s"', status => {
      expect(isServerActiveStatus(status)).toBe(true);
    });

    it.each(['stopped', 'failed'] as const)(
      'returns false for inactive lifecycle status "%s"',
      status => {
        expect(isServerActiveStatus(status)).toBe(false);
      },
    );
  });

  describe('Contract Drift Guards', () => {
    it.each(SERVER_STATUS_VALUES)(
      'ensures "%s" has a non-empty localized translation entry in enUSTranslations',
      status => {
        const translation = enUSTranslations.serverStatus[status];
        expect(translation).toBeDefined();
        expect(typeof translation).toBe('string');
        expect(translation.trim().length).toBeGreaterThan(0);
      },
    );

    it.each(SERVER_STATUS_VALUES)(
      'ensures "%s" has an entry in SERVER_STATUS_VISUAL_META',
      status => {
        const visualMeta = SERVER_STATUS_VISUAL_META[status];
        expect(visualMeta).toBeDefined();
        expect(visualMeta.tagStatus).toBeDefined();
        expect(visualMeta.dotClass.trim().length).toBeGreaterThan(0);
        expect(visualMeta.textClass.trim().length).toBeGreaterThan(0);
      },
    );

    it('ensures SERVER_STATUS_VISUAL_META contains exactly the members of SERVER_STATUS_VALUES', () => {
      const metaKeys = Object.keys(SERVER_STATUS_VISUAL_META).sort();
      const expectedKeys = [...SERVER_STATUS_VALUES].sort();
      expect(metaKeys).toEqual(expectedKeys);
    });

    it('ensures enUSTranslations.serverStatus contains exactly the members of SERVER_STATUS_VALUES', () => {
      const translationKeys = Object.keys(enUSTranslations.serverStatus).sort();
      const expectedKeys = [...SERVER_STATUS_VALUES].sort();
      expect(translationKeys).toEqual(expectedKeys);
    });
  });

  describe('getServerExitPresentation (DSM-00164)', () => {
    const at = '2026-11-17T10:00:00.000Z';
    const localAt = new Date(at).toLocaleString();

    it('explains a failed server with reason, exit code or signal, and time', () => {
      expect(
        getServerExitPresentation('failed', { reason: 'crashed', exitCode: 1, signal: null, at }),
      ).toEqual({
        label: 'Crashed (exit 1)',
        description: `Crashed (exit 1) at ${localAt}`,
      });
      expect(
        getServerExitPresentation('failed', {
          reason: 'crashed',
          exitCode: null,
          signal: 'SIGSEGV',
          at,
        }),
      ).toMatchObject({ label: 'Crashed (SIGSEGV)' });
      expect(
        getServerExitPresentation('failed', {
          reason: 'exited_while_offline',
          exitCode: null,
          signal: null,
          at,
        }),
      ).toMatchObject({ label: 'Exited while DSM was offline' });
    });

    it('returns null for other statuses or without a recorded exit', () => {
      const lastExit = { reason: 'force_stopped', exitCode: null, signal: null, at } as const;
      expect(getServerExitPresentation('stopped', lastExit)).toBeNull();
      expect(getServerExitPresentation('running', lastExit)).toBeNull();
      expect(getServerExitPresentation('failed', null)).toBeNull();
    });

    it('has an en-US label for every exit reason', () => {
      expect(Object.keys(enUSTranslations.serverExitReason).sort()).toEqual(
        [...SERVER_EXIT_REASON_VALUES].sort(),
      );
    });
  });

  describe('serverStatusSchema validation', () => {
    it.each(SERVER_STATUS_VALUES)('successfully validates canonical status "%s"', status => {
      const result = serverStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    });

    it.each(['unknown', 'idle', 'PAUSED', 'RUNNING', '', '   ', null, undefined, 123, true, {}])(
      'rejects invalid or unknown status value: %j',
      invalidStatus => {
        const result = serverStatusSchema.safeParse(invalidStatus);
        expect(result.success).toBe(false);
      },
    );
  });
});
