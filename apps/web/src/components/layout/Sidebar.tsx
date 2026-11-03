import { Link } from '@tanstack/react-router';
import {
  Activity,
  Bell,
  Box,
  ChevronsUpDown,
  Cpu,
  FileCode2,
  Flame,
  LayoutDashboard,
  MapIcon,
  RadioTower,
  Server,
  ShieldCheck,
  Sliders,
  Terminal,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';

import { useFeatureFlag } from '@dsm/web/core';
import { useAuth } from '@dsm/web/features/auth';

import { Logo } from './Logo';
import { UserProfile } from './UserProfile';

/* ====================================================================
PRIMARY NAVIGATION (SIDEBAR)
Architectural Note:
- Responsive: Drawer off-canvas on mobile, fixed rail on desktop.
- Type-Safe: Integrated with TanStack Router `<Link>` components.
- Modular: Dynamically prunes disabled subsystems based on feature flags.
==================================================================== */
export function Sidebar() {
  const { user } = useAuth();
  const isMapEnabled = useFeatureFlag('worldMap');
  const isEconomyEnabled = useFeatureFlag('economyWorkbench');
  const isModsEnabled = useFeatureFlag('modsManager');
  const isDiscordEnabled = useFeatureFlag('discordNotifications');

  const isAdmin = user?.role === 'admin';

  const linkActiveClasses =
    'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium';
  const linkInactiveClasses =
    'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)]';

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
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary-border)] transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <Server className="w-[18px] h-[18px] text-[var(--color-primary)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                dayz (local)
              </span>
              <span className="text-[10px] text-[var(--color-success)] truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                Connected
              </span>
            </div>
          </div>
          <ChevronsUpDown className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {/* Section: OVERVIEW */}
          <nav aria-label="Overview Navigation" className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              Overview
            </div>
            <Link
              to="/dashboard"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <LayoutDashboard className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Dashboard</span>
            </Link>
            <Link
              to="/system"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Activity className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">System telemetry</span>
            </Link>
          </nav>

          {/* Section: OPERATIONS */}
          <nav aria-label="Operations Navigation" className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              Operations
            </div>
            <Link
              to="/players"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Users className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Players</span>
            </Link>
            {isModsEnabled && (
              <Link
                to="/mods"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <Box className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Mods</span>
              </Link>
            )}
            <Link
              to="/maintenance"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Wrench className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Maintenance</span>
            </Link>
          </nav>

          {/* Section: OBSERVABILITY */}
          <nav aria-label="Observability Navigation" className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              Observability
            </div>
            <Link
              to="/audit"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <ShieldCheck className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Audit log</span>
            </Link>
            <Link
              to="/logs/rpt"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Terminal className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Server logs</span>
            </Link>
          </nav>

          {/* Section: WORLD (Gated by worldMap) */}
          {isMapEnabled && (
            <nav aria-label="World Navigation" className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                World
              </div>
              <Link
                to="/world/map"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <MapIcon className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Tactical map</span>
              </Link>
              <Link
                to="/world/loot"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <Flame className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Loot heatmap</span>
              </Link>
            </nav>
          )}

          {/* Section: CONFIGURATION */}
          <nav aria-label="Configuration Navigation" className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              Configuration
            </div>
            {isEconomyEnabled && (
              <Link
                to="/economy/types"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <FileCode2 className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Types workbench</span>
              </Link>
            )}
            <Link
              to="/settings/server"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Sliders className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Server settings</span>
            </Link>
            {isDiscordEnabled && (
              <Link
                to="/settings/discord"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <Bell className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Discord webhooks</span>
              </Link>
            )}
            <Link
              to="/settings/app"
              activeProps={{ className: linkActiveClasses }}
              inactiveProps={{ className: linkInactiveClasses }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
            >
              <Cpu className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">Appliance settings</span>
            </Link>
            {isAdmin && (
              <Link
                to="/settings/operators"
                activeProps={{ className: linkActiveClasses }}
                inactiveProps={{ className: linkInactiveClasses }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <UserCheck className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">Console operators</span>
              </Link>
            )}
          </nav>
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
