import { useEffect, useState } from 'react';

import { Plus, Server, ShieldCheck } from 'lucide-react';

import { apiClient } from '@dsm/api-client';
import type { HealthResponseDto } from '@dsm/api-contracts';
import { Button, PageContainer } from '@dsm/web/components';
import { useActiveServer } from '@dsm/web/core';

import { useAuth } from '../auth';
import { CreateServerModal } from '../server-settings';

export function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponseDto | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { servers, activeServer, isLoading: isServersLoading } = useActiveServer();

  useEffect(() => {
    apiClient.health
      .get()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)]">
              Dashboard
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Welcome back,{' '}
              <strong className="text-[var(--color-text-main)]">{user?.username}</strong>.
            </p>
          </div>

          {!isServersLoading && servers.length > 0 && (
            <Button variant="secondary" leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
              Add DayZ Server
            </Button>
          )}
        </div>

        {!isServersLoading && servers.length === 0 && (
          <div
            data-testid="zero-state-banner"
            className="p-8 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <Server className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                No DayZ Servers Registered
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Your DayZ Server Manager control plane is initialized with zero servers. Register
                your first DayZ Dedicated Server instance to manage missions, ports, mods, and
                supervise execution.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" leftIcon={Plus} onClick={() => setIsCreateModalOpen(true)}>
                Add DayZ Server
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="ui-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
              <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
              <span>Authentication Status</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Role: <span className="font-mono font-medium">{user?.role}</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Session User ID: <span className="font-mono text-[11px]">{user?.id}</span>
            </p>
          </div>

          <div className="ui-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
              <Server className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Backend Connectivity</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Status:{' '}
              <span className="font-semibold text-[var(--color-success)]">
                {health?.status ?? 'Connecting...'}
              </span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Server Uptime:{' '}
              <span className="font-mono">{health ? `${Math.floor(health.uptime)}s` : '—'}</span>
            </p>
            {activeServer && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Active Console:{' '}
                <span className="font-semibold text-[var(--color-text-main)]">
                  {activeServer.name}
                </span>{' '}
                ({activeServer.status})
              </p>
            )}
          </div>
        </div>

        <CreateServerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Legacy Mock Dashboard Code (Temporarily commented out for E2E Sign In flow)
// ============================================================================
// export function LegacyMockDashboard() {
//   /* Previous static mockup with Chernarus panorama, KPI cards, and mod list */
// }
