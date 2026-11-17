import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  EMPTY_LAUNCH_OPTIONS,
  type ServerDetailDto,
  type ServerSummaryDto,
} from '@aegis/api-contracts';

import { serverQueryKeys } from '../server/server.queries';

import { applyServerStatusChanged } from './server-status.realtime';

const ID = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const AT = '2026-11-17T10:00:00.000Z';

const summary = (id: string, status: ServerSummaryDto['status']): ServerSummaryDto => ({
  id,
  name: id === ID ? 'Namalsk' : 'Chernarus',
  status,
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: false,
  lastExit: null,
  createdAt: AT,
  updatedAt: AT,
});

const detail = (status: ServerDetailDto['status']): ServerDetailDto => ({
  ...summary(ID, status),
  description: null,
  installPath: 'C:\\DayZServer',
  profilePath: 'profiles',
  missionPath: 'mpmissions/dayzOffline.namalsk',
  launchOptions: EMPTY_LAUNCH_OPTIONS,
  maxPlayers: 60,
  rconIp: '127.0.0.1',
  rconPassword: null,
  runtime: { pid: 4242, startedAt: AT },
  pendingStop: null,
  lastExit: null,
});

function seededClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(serverQueryKeys.list(), [
    summary(ID, 'running'),
    summary(OTHER, 'running'),
  ]);
  queryClient.setQueryData(serverQueryKeys.detail(ID), detail('running'));
  return queryClient;
}

describe('applyServerStatusChanged', () => {
  it('updates list and detail, clears runtime once the process is gone, and refetches the detail', () => {
    const queryClient = seededClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const lastExit = { reason: 'crashed', exitCode: 1, signal: null, at: AT } as const;

    applyServerStatusChanged(queryClient, {
      serverId: ID,
      status: 'failed',
      lastExit,
      pendingStop: null,
    });

    expect(
      queryClient
        .getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())
        ?.map(s => [s.status, s.lastExit]),
    ).toEqual([
      ['failed', lastExit],
      ['running', null],
    ]);
    expect(queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(ID))).toMatchObject({
      status: 'failed',
      lastExit,
      runtime: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(ID), exact: true });
  });

  it.each(['starting', 'running', 'stopping'] as const)(
    'keeps the runtime while the process is %s',
    status => {
      const queryClient = seededClient();
      applyServerStatusChanged(queryClient, {
        serverId: ID,
        status,
        lastExit: null,
        pendingStop: null,
      });
      expect(
        queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(ID))?.runtime,
      ).toEqual({ pid: 4242, startedAt: AT });
    },
  );

  it('applies a scheduled and a cancelled stop to the detail (DSM-00167)', () => {
    const queryClient = seededClient();
    const pendingStop = { executeAt: AT, requestedAt: AT };

    applyServerStatusChanged(queryClient, {
      serverId: ID,
      status: 'running',
      lastExit: null,
      pendingStop,
    });
    expect(
      queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(ID))?.pendingStop,
    ).toEqual(pendingStop);

    applyServerStatusChanged(queryClient, {
      serverId: ID,
      status: 'running',
      lastExit: null,
      pendingStop: null,
    });
    expect(
      queryClient.getQueryData<ServerDetailDto>(serverQueryKeys.detail(ID))?.pendingStop,
    ).toBeNull();
  });

  it('leaves never-loaded caches untouched', () => {
    const queryClient = new QueryClient();
    applyServerStatusChanged(queryClient, {
      serverId: ID,
      status: 'stopped',
      lastExit: null,
      pendingStop: null,
    });
    expect(queryClient.getQueryData(serverQueryKeys.list())).toBeUndefined();
    expect(queryClient.getQueryData(serverQueryKeys.detail(ID))).toBeUndefined();
  });

  it.each([
    ['not an object', 'running'],
    ['unknown status', { serverId: ID, status: 'crashed', lastExit: null }],
    ['bad id', { serverId: 'nope', status: 'running', lastExit: null }],
  ])('ignores an invalid payload (%s)', (_label, payload) => {
    const queryClient = seededClient();
    const before = queryClient.getQueryData(serverQueryKeys.list());
    applyServerStatusChanged(queryClient, payload);
    expect(queryClient.getQueryData(serverQueryKeys.list())).toBe(before);
  });
});
