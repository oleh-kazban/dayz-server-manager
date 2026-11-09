import { useEffect } from 'react';

import { Link, useLocation, useMatches } from '@tanstack/react-router';
import { Bell, ChevronRight, HelpCircle, Menu, Search, Settings } from 'lucide-react';

import { useActiveServer, useLayoutStore, useNavigationContext } from '@aegis/web/core';
import { FaqModal, ThemeToggleButton, useFaqStore } from '@aegis/web/features';

interface BreadcrumbTrailProps {
  isLoading: boolean;
  isDashboard: boolean;
  activeServer: { id: string; name: string } | null;
  subpageLabel?: string;
  isAppliance?: boolean;
}

function renderBreadcrumbTrail({
  isLoading,
  isDashboard,
  activeServer,
  subpageLabel,
  isAppliance,
}: BreadcrumbTrailProps) {
  if (isAppliance) {
    return (
      <>
        <Link
          to="/settings/steam"
          search={() => ({})}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
        >
          Appliance Administration
        </Link>
        {subpageLabel && subpageLabel !== 'Appliance Administration' && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
            <span
              aria-current="page"
              className="font-semibold text-[var(--color-text-main)] truncate"
            >
              {subpageLabel}
            </span>
          </>
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Link
          to="/dashboard"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
        >
          Servers
        </Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
        <span
          data-testid="breadcrumb-server-skeleton"
          className="inline-block w-28 h-3.5 bg-[var(--color-surface-subtle)] animate-pulse rounded"
        />
        {!isDashboard && subpageLabel && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
            <span
              aria-current="page"
              className="font-semibold text-[var(--color-text-main)] truncate"
            >
              {subpageLabel}
            </span>
          </>
        )}
      </>
    );
  }

  if (activeServer) {
    if (isDashboard) {
      return (
        <>
          <Link
            to="/dashboard"
            search={{ serverId: activeServer.id }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
          >
            Servers
          </Link>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
          <span
            aria-current="page"
            className="font-semibold text-[var(--color-text-main)] truncate"
          >
            {activeServer.name}
          </span>
        </>
      );
    }

    return (
      <>
        <Link
          to="/dashboard"
          search={{ serverId: activeServer.id }}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
        >
          Servers
        </Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
        <Link
          to="/dashboard"
          search={{ serverId: activeServer.id }}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer truncate transition-colors"
        >
          {activeServer.name}
        </Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
        <span aria-current="page" className="font-semibold text-[var(--color-text-main)] truncate">
          {subpageLabel}
        </span>
      </>
    );
  }

  // When no server is selected (e.g. zero servers registered)
  if (isDashboard) {
    return (
      <span aria-current="page" className="font-semibold text-[var(--color-text-main)] truncate">
        Servers
      </span>
    );
  }

  return (
    <>
      <Link
        to="/dashboard"
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer transition-colors"
      >
        Servers
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
  const { isMobileSidebarOpen, toggleMobileSidebar } = useLayoutStore();
  const { activeServer, isLoading } = useActiveServer();
  const { isAppliance } = useNavigationContext();
  const { isOpen: isFaqOpen, toggleModal: toggleFaqModal } = useFaqStore();
  const location = useLocation();
  const matches = useMatches();
  const pathname = location?.pathname ?? '/dashboard';
  const isDashboard = pathname === '/' || pathname === '/dashboard';
  const matchedBreadcrumb = [...(matches ?? [])]
    .reverse()
    .find(match => Boolean(match.staticData?.breadcrumb))?.staticData?.breadcrumb;
  const subpageLabel =
    matchedBreadcrumb ?? (pathname.startsWith('/settings') ? 'Settings' : undefined);

  // GUARD-02: Keyboard Shortcut Input Collision Guard
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        const target = event.target as HTMLElement | null;
        const isInteractiveInput =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          Boolean(target?.isContentEditable) ||
          target?.getAttribute('role') === 'textbox' ||
          target?.getAttribute('role') === 'searchbox';

        if (isInteractiveInput) {
          return;
        }

        event.preventDefault();
        toggleFaqModal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [toggleFaqModal]);

  return (
    <>
      <header className="h-16 lg:h-[76px] bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        {/* Breadcrumbs + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Sidebar toggle button (mobile / future desktop collapse hook) */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileSidebarOpen}
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors mr-1 cursor-pointer"
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

            {renderBreadcrumbTrail({
              isLoading,
              isDashboard,
              activeServer,
              subpageLabel,
              isAppliance,
            })}
          </nav>
        </div>

        {/* Header Controls: Search, Notifications, Appliance Settings, Theme, Help */}
        <div className="flex items-center gap-1.5 shrink-0">
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

          {/* Appliance Administration Gear */}
          <Link
            to="/settings/steam"
            search={() => ({})}
            aria-label="Appliance administration"
            title="Appliance Administration"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isAppliance
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <Settings className="w-[19px] h-[19px]" />
          </Link>

          <ThemeToggleButton />
          {/* Help / Docs */}
          <button
            type="button"
            aria-label="Documentation and help"
            aria-expanded={isFaqOpen}
            onClick={() => toggleFaqModal()}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-[19px] h-[19px]" />
          </button>
        </div>
      </header>
      <FaqModal />
    </>
  );
}
