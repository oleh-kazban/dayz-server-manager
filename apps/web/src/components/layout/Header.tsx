import { Link, useLocation } from '@tanstack/react-router';
import { Bell, ChevronRight, HelpCircle, Menu, Search } from 'lucide-react';

import { useActiveServer } from '@dsm/web/core';
import { ThemeToggleButton } from '@dsm/web/features';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/system': 'System telemetry',
  '/players': 'Players',
  '/mods': 'Mods',
  '/maintenance': 'Maintenance',
  '/audit': 'Audit log',
  '/logs/rpt': 'Server logs',
  '/logs/crash': 'Crash dumps',
  '/world/map': 'Tactical map',
  '/world/loot': 'Loot heatmap',
  '/economy/types': 'Types workbench',
  '/settings/server': 'Server settings',
  '/settings/discord': 'Discord webhooks',
  '/settings/app': 'Appliance settings',
  '/settings/operators': 'Console operators',
  '/profile': 'Operator profile',
};

function renderServerBreadcrumbTrail(
  isLoading: boolean,
  isDashboard: boolean,
  activeServer: { id: string; name: string } | null,
  subpageLabel?: string,
) {
  if (isLoading) {
    return (
      <span
        data-testid="breadcrumb-server-skeleton"
        className="inline-block w-28 h-3.5 bg-[var(--color-surface-subtle)] animate-pulse rounded"
      />
    );
  }

  if (isDashboard) {
    return (
      <span aria-current="page" className="font-semibold text-[var(--color-text-main)] truncate">
        {activeServer?.name ?? 'No server selected'}
      </span>
    );
  }

  return (
    <>
      <Link
        to="/dashboard"
        search={activeServer ? { serverId: activeServer.id } : undefined}
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer truncate transition-colors"
      >
        {activeServer?.name ?? 'Servers'}
      </Link>
      <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
      <span aria-current="page" className="font-semibold text-[var(--color-text-main)] truncate">
        {subpageLabel}
      </span>
    </>
  );
}

/* Workspace Top Header Bar */
export function Header() {
  const { activeServer, isLoading } = useActiveServer();
  const location = useLocation();
  const pathname = location?.pathname ?? '/dashboard';
  const isDashboard = pathname === '/' || pathname === '/dashboard';
  const subpageLabel =
    ROUTE_LABELS[pathname] ?? (pathname.startsWith('/settings') ? 'Settings' : undefined);

  return (
    <header className="h-16 lg:h-[76px] bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Breadcrumbs + Mobile Menu Trigger */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Sidebar toggle button (mobile / future desktop collapse hook) */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors mr-1"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
          <Link
            to="/dashboard"
            search={activeServer ? { serverId: activeServer.id } : undefined}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
          >
            Workspace
          </Link>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
          <Link
            to="/dashboard"
            search={activeServer ? { serverId: activeServer.id } : undefined}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
          >
            Servers
          </Link>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />

          {renderServerBreadcrumbTrail(isLoading, isDashboard, activeServer, subpageLabel)}
        </nav>
      </div>

      {/* Header Controls: Search, Notifications, Help */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* Search Input Box */}
        <div className="hidden sm:flex items-center gap-2 w-48 md:w-56 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-muted)] focus-within:border-[var(--color-primary)] transition-colors">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 truncate">Search anything…</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
            ⌘ K
          </kbd>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors"
        >
          <Bell className="w-[19px] h-[19px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-surface)]" />
        </button>

        <ThemeToggleButton />
        {/* Help / Docs */}
        <button
          type="button"
          aria-label="Documentation and help"
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors"
        >
          <HelpCircle className="w-[19px] h-[19px]" />
        </button>
      </div>
    </header>
  );
}
