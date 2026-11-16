import { useNavigate } from '@tanstack/react-router';

import { EmptyServersState, PageContainer } from '@aegis/web/components';
import { useActiveServer } from '@aegis/web/core';

import { ServerLifecycleCard } from './components/ServerLifecycleCard';

/** Maintenance & Lifecycle page (DSM-00169): lifecycle actions for the active server. */
export function MaintenanceView() {
  const navigate = useNavigate();
  const { servers, activeServer, isLoading } = useActiveServer();

  if (isLoading && !activeServer) {
    return (
      <PageContainer>
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-subtle)]" />
      </PageContainer>
    );
  }

  if (servers.length === 0 || !activeServer) {
    return (
      <PageContainer>
        <EmptyServersState onAddServer={() => void navigate({ to: '/settings/server' })} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="border-b border-[var(--color-border)] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            Maintenance &amp; Lifecycle
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Control the DayZ server process for{' '}
            <span className="font-semibold text-[var(--color-text-main)]">{activeServer.name}</span>
            .
          </p>
        </div>
        <ServerLifecycleCard server={activeServer} />
      </div>
    </PageContainer>
  );
}
