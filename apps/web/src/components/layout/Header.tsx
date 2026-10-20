import { Bell, ChevronRight, HelpCircle, Menu, Search } from 'lucide-react';

import { ThemeToggleButton } from '@dsm/features';

/* Workspace Top Header Bar */
export function Header() {
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
          <span className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer">
            Workspace
          </span>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] cursor-pointer">
            Servers
          </span>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
          <span className="font-semibold text-[var(--color-text-main)] truncate">
            Chernarus Survival
          </span>
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
