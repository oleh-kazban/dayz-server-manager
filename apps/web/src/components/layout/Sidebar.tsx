import { Link } from '@tanstack/react-router';
import { RadioTower } from 'lucide-react';

import { NAVIGATION_SECTIONS, useFeatureFlags } from '@dsm/web/core';
import { useAuth } from '@dsm/web/features/auth';

import { Logo } from './Logo';
import { ServerSelector } from './ServerSelector';
import { UserProfile } from './UserProfile';

/* ====================================================================
PRIMARY NAVIGATION (SIDEBAR)
Architectural Note:
- Responsive: Drawer off-canvas on mobile, fixed rail on desktop.
- Type-Safe: Driven by declarative NAVIGATION_SECTIONS manifest.
- Modular: Dynamically prunes disabled subsystems based on feature flags and RBAC.
==================================================================== */
export function Sidebar() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();

  const linkActiveClasses =
    'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium';
  const linkInactiveClasses =
    'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)]';
  const linkBaseClasses =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-sidebar)]';

  const visibleSections = NAVIGATION_SECTIONS.map(section => {
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
  }).filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary Navigation"
      className="hidden lg:flex w-[228px] min-w-[228px] max-w-[228px] flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-sidebar)] h-screen sticky top-0 shrink-0 p-4 transition-all duration-300 z-30 select-none overflow-y-auto"
    >
      <div className="space-y-5">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 px-1 py-1">
          <Logo className="w-[30px] h-[31px] shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-[18px] tracking-tight text-[var(--color-text-main)]">
              OUTLIVE
            </span>
            <span className="text-[8px] font-semibold tracking-[0.25em] text-[var(--color-text-muted)] mt-0.5">
              PROJECT
            </span>
          </div>
        </div>

        {/* Node Selector */}
        <ServerSelector />

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
                    activeProps={{ className: linkActiveClasses }}
                    inactiveProps={{ className: linkInactiveClasses }}
                    className={linkBaseClasses}
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
      <div className="space-y-4 pt-6">
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

        {/* Operator Profile */}
        <UserProfile />
      </div>
    </aside>
  );
}
