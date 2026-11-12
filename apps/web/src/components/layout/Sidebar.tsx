import { useEffect } from 'react';

import { Link, useLocation } from '@tanstack/react-router';
import { ArrowLeft, type LucideIcon, RadioTower, X } from 'lucide-react';

import {
  type NavigationScope,
  useActiveServer,
  useFeatureFlags,
  useLayoutStore,
  useNavigationContext,
} from '@aegis/web/core';
import { useAuth } from '@aegis/web/features/auth';

import { Logo } from './Logo';
import { ServerSelector } from './ServerSelector';
import { UserProfile } from './UserProfile';

/* ====================================================================
PRIMARY NAVIGATION (SIDEBAR)
Architectural Note:
- Responsive: Drawer off-canvas on mobile, fixed rail on desktop.
- Context-Aware: Single polymorphic shell driven by useNavigationContext().
- Modular: Dynamically prunes disabled subsystems based on feature flags and RBAC.
==================================================================== */
interface SidebarSectionItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarSection {
  id: string;
  title: string;
  ariaLabel: string;
  items: SidebarSectionItem[];
}

interface SidebarContentProps {
  scope: NavigationScope;
  activeServer: { id: string; name: string } | null;
  visibleSections: SidebarSection[];
  linkBaseClasses: string;
  linkActiveClasses: string;
  linkInactiveClasses: string;
  onNavigate?: () => void;
}

function SidebarContent({
  scope,
  activeServer,
  visibleSections,
  linkBaseClasses,
  linkActiveClasses,
  linkInactiveClasses,
  onNavigate,
}: SidebarContentProps) {
  const isServer = scope === 'server';

  const resolveItemSearch = () => {
    if (!isServer) {
      return () => ({});
    }
    if (activeServer) {
      return { serverId: activeServer.id };
    }
    return undefined;
  };
  const itemSearch = resolveItemSearch();

  return (
    <>
      {/* Navigation Sections */}
      <div className="space-y-5 flex-1">
        {/* Top Control: Node Selector (Server Scope) vs. Back to Server Button (Appliance & User Scope) */}
        {!isServer ? (
          <Link
            to="/dashboard"
            search={activeServer ? { serverId: activeServer.id } : undefined}
            onClick={onNavigate}
            aria-label="Back to server console"
            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[var(--color-primary)] transition-transform group-hover:-translate-x-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                {scope === 'user' ? 'Operator Scope' : 'Console Scope'}
              </span>
              <span className="font-semibold text-[var(--color-text-main)] truncate text-xs">
                {activeServer ? activeServer.name : 'Server Console'}
              </span>
            </div>
          </Link>
        ) : (
          <ServerSelector />
        )}

        {/* Navigation Sections */}
        <div className="space-y-4">
          {visibleSections.map(section => (
            <nav key={section.id} aria-label={section.ariaLabel} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                {section.title}
              </div>
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    search={itemSearch}
                    activeProps={{ className: linkActiveClasses }}
                    inactiveProps={{ className: linkInactiveClasses }}
                    className={linkBaseClasses}
                    onClick={onNavigate}
                  >
                    <Icon className="w-[17px] h-[17px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          ))}
        </div>
      </div>

      {/* Sidebar Bottom: Support Card & Admin Profile */}
      <div className="space-y-4 pt-6 mt-auto">
        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-2">
          <RadioTower className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[var(--color-text-main)]">
              Operations Guide
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              DayZ dedicated server control plane &amp; diagnostic telemetry.
            </p>
          </div>
        </div>

        <UserProfile />
      </div>
    </>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { isMobileSidebarOpen, closeMobileSidebar } = useLayoutStore();
  const { activeServer } = useActiveServer();
  const { scope, sections } = useNavigationContext();

  const location = useLocation();
  const pathname = location?.pathname;

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  // Handle Escape key
  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  // Body scroll locking
  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  const linkActiveClasses =
    'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium';
  const linkInactiveClasses =
    'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)]';
  const linkBaseClasses =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-sidebar)]';

  const visibleSections = sections
    .map(section => {
      if (section.featureFlag && !isEnabled(section.featureFlag)) {
        return null;
      }

      const visibleItems = section.items.filter(item => {
        if (item.featureFlag && !isEnabled(item.featureFlag)) {
          return false;
        }
        if (item.requiredRole && user?.role !== item.requiredRole) {
          return false;
        }
        return true;
      });

      if (visibleItems.length === 0) {
        return null;
      }

      return {
        ...section,
        items: visibleItems,
      };
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <>
      {/* Mobile Off-Canvas Drawer Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div
            data-testid="mobile-sidebar-backdrop"
            onClick={closeMobileSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
            aria-hidden="true"
          />
          <aside
            id="mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            data-testid="mobile-sidebar-drawer"
            className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] bg-[var(--color-sidebar)] border-r border-[var(--color-border)] shadow-2xl lg:hidden flex flex-col p-4 select-none overflow-y-auto"
          >
            {/* Header with Logo and Close Button */}
            <div className="flex items-center justify-between px-1 py-1 mb-5">
              <Link
                to="/dashboard"
                onClick={closeMobileSidebar}
                aria-label="Aegis Console Dashboard"
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <Logo className="w-[30px] h-[31px] shrink-0" animateOnHover />
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-[18px] tracking-tight text-[var(--color-text-main)]">
                    AEGIS
                  </span>
                  <span className="text-[8px] font-semibold tracking-[0.25em] text-[var(--color-text-muted)] mt-0.5">
                    CONSOLE
                  </span>
                </div>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={closeMobileSidebar}
                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SidebarContent
              scope={scope}
              activeServer={activeServer}
              visibleSections={visibleSections}
              linkBaseClasses={linkBaseClasses}
              linkActiveClasses={linkActiveClasses}
              linkInactiveClasses={linkInactiveClasses}
              onNavigate={closeMobileSidebar}
            />
          </aside>
        </>
      )}

      {/* Desktop Persistent Sidebar Rail */}
      <aside
        id="app-sidebar"
        aria-label="Primary Navigation"
        className="hidden lg:flex w-[228px] min-w-[228px] max-w-[228px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] h-screen sticky top-0 shrink-0 p-4 transition-colors duration-300 z-30 select-none overflow-y-auto"
      >
        <Link
          to="/dashboard"
          aria-label="Aegis Console Dashboard"
          className="flex items-center gap-2.5 px-1 py-1 mb-5 cursor-pointer select-none"
        >
          <Logo className="w-[30px] h-[31px] shrink-0" animateOnHover />
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-[18px] tracking-tight text-[var(--color-text-main)]">
              AEGIS
            </span>
            <span className="text-[8px] font-semibold tracking-[0.25em] text-[var(--color-text-muted)] mt-0.5">
              CONSOLE
            </span>
          </div>
        </Link>

        <SidebarContent
          scope={scope}
          activeServer={activeServer}
          visibleSections={visibleSections}
          linkBaseClasses={linkBaseClasses}
          linkActiveClasses={linkActiveClasses}
          linkInactiveClasses={linkInactiveClasses}
        />
      </aside>
    </>
  );
}
