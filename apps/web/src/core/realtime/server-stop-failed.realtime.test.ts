import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { serverQueries, serverQueryKeys } from '../server/server.queries';

import { applyServerStopFailed } from './server-stop-failed.realtime';

const ID = '22222222-2222-4222-8222-222222222222';

describe('applyServerStopFailed', () => {
  it('keeps the failure for that server with the time it arrived', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T18:05:00.000Z'));
    try {
      const queryClient = new QueryClient();
      applyServerStopFailed(queryClient, {
        serverId: ID,
        errorCode: 'SERVER_RCON_UNREACHABLE',
        message: 'No RCON login response.',
      });
      expect(queryClient.getQueryData(serverQueryKeys.stopFailure(ID))).toEqual({
        errorCode: 'SERVER_RCON_UNREACHABLE',
        message: 'No RCON login response.',
        at: '2026-11-17T18:05:00.000Z',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['not an object', 'boom'],
    ['bad id', { serverId: 'nope', errorCode: 'X', message: 'y' }],
    ['missing message', { serverId: ID, errorCode: 'X' }],
  ])('ignores an invalid payload (%s)', (_label, payload) => {
    const queryClient = new QueryClient();
    applyServerStopFailed(queryClient, payload);
    expect(queryClient.getQueryData(serverQueryKeys.stopFailure(ID))).toBeUndefined();
  });

  it('is a client-only cache entry that starts empty and never fetches', async () => {
    const options = serverQueries.stopFailure(ID);
    expect(options.initialData).toBeNull();
    expect(options.staleTime).toBe(Infinity);
    const queryFn = options.queryFn as () => unknown;
    await expect(Promise.resolve(queryFn())).resolves.toBeNull();
  });
});
