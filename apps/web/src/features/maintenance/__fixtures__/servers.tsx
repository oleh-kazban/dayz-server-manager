import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

import {
  EMPTY_LAUNCH_OPTIONS,
  type LaunchCommandPreviewDto,
  type ServerDetailDto,
  type ServerSummaryDto,
} from '@aegis/api-contracts';
import { serverQueryKeys } from '@aegis/web/core';

export const SERVER_ID = '22222222-2222-4222-8222-222222222222';
export const OTHER_SERVER_ID = '33333333-3333-4333-8333-333333333333';
export const AT = '2026-11-17T10:00:00.000Z';

export const serverSummary = (overrides: Partial<ServerSummaryDto> = {}): ServerSummaryDto => ({
  id: SERVER_ID,
  name: 'Namalsk',
  status: 'stopped',
  gamePort: 2302,
  queryPort: 27016,
  rconPort: 2310,
  isDefault: true,
  lastExit: null,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});

export const serverDetail = (overrides: Partial<ServerDetailDto> = {}): ServerDetailDto => ({
  ...serverSummary(),
  description: null,
  installPath: '/opt/dayz',
  profilePath: 'profiles',
  missionPath: 'mpmissions/dayzOffline.namalsk',
  launchOptions: EMPTY_LAUNCH_OPTIONS,
  maxPlayers: 60,
  rconIp: '127.0.0.1',
  rconPassword: null,
  runtime: null,
  pendingStop: null,
  ...overrides,
});

export const launchPreview = (
  overrides: Partial<LaunchCommandPreviewDto> = {},
): LaunchCommandPreviewDto => ({
  serverId: SERVER_ID,
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
  ...overrides,
});

/** Renders with a fresh query client, optionally seeding the server list. */
export function renderWithQueryClient(ui: ReactNode, list?: ServerSummaryDto[]): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (list) {
    queryClient.setQueryData(serverQueryKeys.list(), list);
  }
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return queryClient;
}
