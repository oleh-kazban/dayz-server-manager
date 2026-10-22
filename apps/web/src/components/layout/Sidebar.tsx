import {
  Archive,
  Box,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  MapIcon,
  RadioTower,
  Server,
  Settings,
  ShieldCheck,
  Terminal,
  Users,
} from 'lucide-react';

import { Logo } from './Logo';
import { UserProfile } from './UserProfile';

/* ====================================================================
PRIMARY NAVIGATION (SIDEBAR)
Architectural Note:
- Responsive: Drawer off-canvas on mobile, fixed rail on desktop.
- Toggleable: Container prepared for future collapse/expand states (e.g. w-[216px] vs w-[64px]).
==================================================================== */
export function Sidebar() {
  return (
    <aside
      id="app-sidebar"
      aria-label="Primary Navigation"
      className="hidden lg:flex w-[216px] min-w-[216px] max-w-[216px] flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-sidebar)] h-screen sticky top-0 shrink-0 p-4 transition-all duration-300 z-30 select-none overflow-y-auto"
    >
      <div className="space-y-6">
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

        {/* Workspace Selector */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary-border)] transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <Server className="w-[18px] h-[18px] text-[var(--color-primary)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                Survival network
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                Pro workspace
              </span>
            </div>
          </div>
          <ChevronsUpDown className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
        </div>

        {/* Navigation: Workspace */}
        {/* Will be fixed later: Replace raw anchor tags with TanStack Router <Link to="..." /> and activeProps when route tree expands */}
        <nav aria-label="Workspace Links" className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
            Workspace
          </div>
          <a
            href="#overview"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium text-xs transition-colors"
          >
            <LayoutDashboard className="w-[17px] h-[17px]" />
            <span className="truncate">Overview</span>
          </a>
          <a
            href="#servers"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Server className="w-[17px] h-[17px]" />
              <span className="truncate">Servers</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">03</span>
          </a>
          <a
            href="#players"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-[17px] h-[17px]" />
              <span className="truncate">Players</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">48</span>
          </a>
          <a
            href="#world-map"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <MapIcon className="w-[17px] h-[17px]" />
            <span className="truncate">World &amp; map</span>
          </a>
          <a
            href="#mods"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Box className="w-[17px] h-[17px]" />
              <span className="truncate">Mods</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">12</span>
          </a>
          <a
            href="#backups"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <Archive className="w-[17px] h-[17px]" />
            <span className="truncate">Backups</span>
          </a>
          <a
            href="#logs"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <Terminal className="w-[17px] h-[17px]" />
            <span className="truncate">Server logs</span>
          </a>
        </nav>

        {/* Navigation: Management */}
        <nav aria-label="Management Links" className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
            Management
          </div>
          <a
            href="#team"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <ShieldCheck className="w-[17px] h-[17px]" />
            <span className="truncate">Team &amp; access</span>
          </a>
          <a
            href="#billing"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <CreditCard className="w-[17px] h-[17px]" />
            <span className="truncate">Billing</span>
          </a>
          <a
            href="#settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] text-xs transition-colors"
          >
            <Settings className="w-[17px] h-[17px]" />
            <span className="truncate">Settings</span>
          </a>
        </nav>
      </div>

      {/* Sidebar Bottom: Support Card & Admin Profile */}
      <div className="space-y-4 pt-6">
        {/* Support Card */}
        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-2">
          <RadioTower className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[var(--color-text-main)]">
              A little backup?
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              Our team is here to keep your world running.
            </p>
          </div>
          <a
            href="#support"
            className="inline-block text-[11px] font-medium text-[var(--color-primary)] hover:underline pt-0.5"
          >
            Contact support ↗
          </a>
        </div>

        {/* Admin Profile */}
        <UserProfile />
      </div>
    </aside>
  );
}
