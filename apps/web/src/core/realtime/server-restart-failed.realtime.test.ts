import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { serverQueries, serverQueryKeys } from '../server/server.queries';

import { applyServerRestartFailed } from './server-restart-failed.realtime';

const ID = '22222222-2222-4222-8222-222222222222';

describe('applyServerRestartFailed', () => {
  it('keeps the failure and its phase for that server', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T18:05:00.000Z'));
    try {
      const queryClient = new QueryClient();
      applyServerRestartFailed(queryClient, {
        serverId: ID,
        phase: 'start',
        errorCode: 'SERVER_START_FAILED',
        message: 'ENOENT',
      });
      expect(queryClient.getQueryData(serverQueryKeys.restartFailure(ID))).toEqual({
        phase: 'start',
        errorCode: 'SERVER_START_FAILED',
        message: 'ENOENT',
        at: '2026-11-17T18:05:00.000Z',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['not an object', 42],
    ['unknown phase', { serverId: ID, phase: 'boot', errorCode: 'X', message: 'y' }],
    ['missing phase', { serverId: ID, errorCode: 'X', message: 'y' }],
  ])('ignores an invalid payload (%s)', (_label, payload) => {
    const queryClient = new QueryClient();
    applyServerRestartFailed(queryClient, payload);
    expect(queryClient.getQueryData(serverQueryKeys.restartFailure(ID))).toBeUndefined();
  });

  it('is a client-only cache entry that starts empty and never fetches', async () => {
    const options = serverQueries.restartFailure(ID);
    expect(options.initialData).toBeNull();
    const queryFn = options.queryFn as () => unknown;
    await expect(Promise.resolve(queryFn())).resolves.toBeNull();
  });
});
