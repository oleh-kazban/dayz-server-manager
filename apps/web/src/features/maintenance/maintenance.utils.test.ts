import { describe, expect, it } from 'vitest';

import type { LaunchCommandPreviewDto } from '@aegis/api-contracts';

import {
  formatCountdown,
  formatDelayPreset,
  formatRuntime,
  getForceStopBlocker,
  getStartBlocker,
  getStopBlocker,
} from './maintenance.utils';

const ready: LaunchCommandPreviewDto = {
  serverId: '22222222-2222-4222-8222-222222222222',
  platform: 'linux',
  mods: { modFolders: [], serverModFolders: [], missingFolderCount: 0 },
  command: {
    ready: true,
    executable: '/opt/dayz/DayZServer',
    cwd: '/opt/dayz',
    args: [],
    commandLine: '',
    segments: [],
    issues: [],
  },
  editLock: null,
};

describe('getStartBlocker', () => {
  it('allows a stopped or failed server with a ready launch command', () => {
    expect(getStartBlocker({ status: 'stopped', preview: ready, previewFailed: false })).toBeNull();
    expect(getStartBlocker({ status: 'failed', preview: ready, previewFailed: false })).toBeNull();
  });

  it.each([
    ['running', 'The server is already running.'],
    ['starting', 'The server is already starting.'],
    ['stopping', 'The server is stopping. Wait until it has stopped.'],
  ] as const)('explains a %s server', (status, reason) => {
    expect(getStartBlocker({ status, preview: ready, previewFailed: false })).toBe(reason);
  });

  it('waits for the readiness check, but does not block when it failed', () => {
    expect(getStartBlocker({ status: 'stopped', preview: undefined, previewFailed: false })).toBe(
      'Checking whether the server can start…',
    );
    expect(
      getStartBlocker({ status: 'stopped', preview: undefined, previewFailed: true }),
    ).toBeNull();
  });

  it('names the holder of a serverDZ.cfg edit lock', () => {
    expect(
      getStartBlocker({
        status: 'stopped',
        preview: { ...ready, editLock: { holderName: 'Oleh', acquiredAt: '2026-11-17T10:00:00Z' } },
        previewFailed: false,
      }),
    ).toBe('serverDZ.cfg is being edited by Oleh. Start is available once editing ends.');
  });

  it('shows the first launch error, or a generic reason without one', () => {
    const notReady = (issues: LaunchCommandPreviewDto['command']['issues']) => ({
      ...ready,
      command: { ...ready.command, ready: false, issues },
    });
    expect(
      getStartBlocker({
        status: 'stopped',
        preview: notReady([
          { severity: 'warning', code: 'LAUNCH_SCRIPT_DEBUG_ENABLED', message: 'debug on' },
          {
            severity: 'error',
            code: 'LAUNCH_INSTALL_PATH_INVALID',
            message: 'Installation path must be absolute.',
          },
        ]),
        previewFailed: false,
      }),
    ).toBe('The launch command is not ready: Installation path must be absolute.');
    expect(
      getStartBlocker({ status: 'stopped', preview: notReady([]), previewFailed: false }),
    ).toBe('The launch command is not ready.');
  });
});

describe('formatRuntime', () => {
  it('shows the PID and the local start time', () => {
    const startedAt = '2026-11-17T10:00:00.000Z';
    expect(formatRuntime({ pid: 4242, startedAt })).toBe(
      `PID 4242 · started ${new Date(startedAt).toLocaleString()}`,
    );
  });
});

describe('getForceStopBlocker', () => {
  it.each(['starting', 'running', 'stopping'] as const)('allows a %s server', status => {
    expect(getForceStopBlocker(status)).toBeNull();
  });

  it.each(['stopped', 'failed'] as const)('explains a %s server', status => {
    expect(getForceStopBlocker(status)).toBe('The server is not running.');
  });
});

describe('getStopBlocker', () => {
  const pendingStop = {
    executeAt: '2026-11-17T18:05:00.000Z',
    requestedAt: '2026-11-17T18:00:00.000Z',
  };

  it('allows a running server without a scheduled stop', () => {
    expect(getStopBlocker('running', null)).toBeNull();
    expect(getStopBlocker('running', undefined)).toBeNull();
  });

  it.each([
    ['starting', 'The server is still starting. Wait until it is running.'],
    ['stopping', 'The server is already stopping.'],
    ['stopped', 'The server is not running.'],
    ['failed', 'The server is not running.'],
  ] as const)('explains a %s server', (status, reason) => {
    expect(getStopBlocker(status, null)).toBe(reason);
  });

  it('asks to cancel a scheduled stop first', () => {
    expect(getStopBlocker('running', pendingStop)).toBe(
      'A stop is already scheduled. Cancel it to choose another time.',
    );
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [-5_000, '0:00'],
    [1, '0:01'],
    [65_000, '1:05'],
    [600_000, '10:00'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});

describe('formatDelayPreset', () => {
  it('labels the presets', () => {
    expect([0, 60, 300, 1800].map(formatDelayPreset)).toEqual(['Now', '1 min', '5 min', '30 min']);
  });
});
