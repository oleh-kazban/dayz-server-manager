import { useEffect, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router';

import type { ServerSummaryDto } from '@aegis/api-contracts';

import { isServerRoute } from '../navigation';

import { serverQueries } from './server.queries';

export interface SetActiveServerOptions {
  /** Skip the unsaved-changes guard (DSM-00138) when the caller already resolved the edits. */
  ignoreBlocker?: boolean;
}

export interface UseActiveServerResult {
  servers: ServerSummaryDto[];
  activeServer: ServerSummaryDto | null;
  activeServerId: string | null;
  setActiveServerId: (id: string, options?: SetActiveServerOptions) => void;
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

  const location = useLocation();
  const pathname = location?.pathname ?? '';
  const isServer = isServerRoute(pathname);

  const navigate = useNavigate();

  const activeServer = useMemo(() => {
    if (!servers.length) return null;
    if (searchServerId) {
      const found = servers.find(s => s.id === searchServerId);
      if (found) return found;
    }
    return servers.find(s => s.isDefault) ?? servers[0];
  }, [servers, searchServerId]);

  // Synchronize URL search params when servers change or if serverId is invalid/missing.
  // These replace-navigations only normalise the URL, so they never trigger the unsaved-changes guard.
  useEffect(() => {
    if (isLoading) return;

    if (!isServer) {
      if (searchServerId) {
        void navigate({
          search: ((prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.serverId;
            return next;
          }) as never,
          replace: true,
          ignoreBlocker: true,
        });
      }
      return;
    }

    if (activeServer && searchServerId !== activeServer.id) {
      void navigate({
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          serverId: activeServer.id,
        })) as never,
        replace: true,
        ignoreBlocker: true,
      });
    } else if (!activeServer && searchServerId) {
      void navigate({
        search: ((prev: Record<string, unknown>) => {
          const next = { ...prev };
          delete next.serverId;
          return next;
        }) as never,
        replace: true,
        ignoreBlocker: true,
      });
    }
  }, [isLoading, isServer, activeServer, searchServerId, navigate]);

  const setActiveServerId = (id: string, options: SetActiveServerOptions = {}) => {
    void navigate({
      ignoreBlocker: options.ignoreBlocker,
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
