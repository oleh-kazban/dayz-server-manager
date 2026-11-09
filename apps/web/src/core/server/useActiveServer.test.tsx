import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';

import { useActiveServer } from './useActiveServer';

vi.mock('@aegis/api-client', () => ({
  apiClient: {
    servers: {
      list: vi.fn(),
    },
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

describe('useActiveServer', () => {
  let queryClient: QueryClient;
  const navigateMock = vi.fn();

  const mockServers: ServerSummaryDto[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'DayZ Chernarus',
      description: null,
      status: 'running',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'DayZ Livonia',
      description: null,
      status: 'stopped',
      gamePort: 2402,
      queryPort: 27017,
      rconPort: 2311,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    navigateMock.mockImplementation(
      (opts: { search?: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        if (typeof opts?.search === 'function') {
          opts.search({ existingParam: 'val', serverId: 'old-id' });
        }
      },
    );
    vi.mocked(useNavigate).mockReturnValue(navigateMock as never);
    vi.mocked(useSearch).mockReturnValue({});
    vi.mocked(apiClient.servers.list).mockResolvedValue(mockServers);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('selects the default server when searchServerId is absent', async () => {
    const { result } = renderHook(() => useActiveServer(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.servers).toHaveLength(2);
    });

    expect(result.current.activeServer?.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.current.activeServerId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('respects searchServerId when present in the router search', async () => {
    vi.mocked(useSearch).mockReturnValue({
      serverId: '22222222-2222-2222-2222-222222222222',
    });

    const { result } = renderHook(() => useActiveServer(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.servers).toHaveLength(2);
    });

    expect(result.current.activeServer?.id).toBe('22222222-2222-2222-2222-222222222222');
    expect(result.current.activeServer?.name).toBe('DayZ Livonia');
  });

  it('navigates with updated search when setActiveServerId is called', async () => {
    const { result } = renderHook(() => useActiveServer(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.servers).toHaveLength(2);
    });

    result.current.setActiveServerId('22222222-2222-2222-2222-222222222222');

    expect(navigateMock).toHaveBeenCalled();
  });

  it('handles empty servers array without throwing', async () => {
    vi.mocked(apiClient.servers.list).mockResolvedValue([]);

    const { result } = renderHook(() => useActiveServer(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.servers).toHaveLength(0);
    expect(result.current.activeServer).toBeNull();
    expect(result.current.activeServerId).toBeNull();
  });

  it('cleans up search params when active server is deleted/missing and searchServerId was present', async () => {
    vi.mocked(apiClient.servers.list).mockResolvedValue([]);
    vi.mocked(useSearch).mockReturnValue({ serverId: 'stale-id' });

    const { result } = renderHook(() => useActiveServer(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replace: true,
      }),
    );
  });
});
