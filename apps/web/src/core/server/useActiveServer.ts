import { useEffect, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';

import type { ServerSummaryDto } from '@dsm/api-contracts';

import { serverQueries } from './server.queries';

export interface UseActiveServerResult {
  servers: ServerSummaryDto[];
  activeServer: ServerSummaryDto | null;
  activeServerId: string | null;
  setActiveServerId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
}

export function useActiveServer(): UseActiveServerResult {
  const { data: servers = [], isLoading, error } = useQuery(serverQueries.list());

  let searchServerId: string | undefined;
  try {
    const search = useSearch({ strict: false }) as { serverId?: string };
    searchServerId = search?.serverId;
  } catch {
    searchServerId = undefined;
  }

  const navigate = useNavigate();

  const activeServer = useMemo(() => {
    if (!servers.length) return null;
    if (searchServerId) {
      const found = servers.find(s => s.id === searchServerId);
      if (found) return found;
    }
    return servers.find(s => s.isDefault) ?? servers[0];
  }, [servers, searchServerId]);

  // Synchronize URL search params when servers change or if serverId is invalid/missing
  useEffect(() => {
    if (isLoading) return;

    if (activeServer && searchServerId !== activeServer.id) {
      navigate({
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          serverId: activeServer.id,
        })) as never,
        replace: true,
      });
    } else if (!activeServer && searchServerId) {
      navigate({
        search: ((prev: Record<string, unknown>) => {
          const next = { ...prev };
          delete next.serverId;
          return next;
        }) as never,
        replace: true,
      });
    }
  }, [isLoading, activeServer, searchServerId, navigate]);

  const setActiveServerId = (id: string) => {
    navigate({
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        serverId: id,
      })) as never,
    });
  };

  return {
    servers,
    activeServer,
    activeServerId: activeServer?.id ?? null,
    setActiveServerId,
    isLoading,
    error: error as Error | null,
  };
}
