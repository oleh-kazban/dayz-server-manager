import { useEffect, useRef, useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Check, ChevronsUpDown, Plus, Search, Server as ServerIcon } from 'lucide-react';

import type { ServerStatus, ServerSummaryDto } from '@dsm/api-contracts';
import { useActiveServer } from '@dsm/web/core';
import { useAuth } from '@dsm/web/features/auth';

function getStatusBadge(status: ServerStatus) {
  switch (status) {
    case 'running':
      return {
        label: 'Connected',
        dotClass: 'bg-[var(--color-success)]',
        textClass: 'text-[var(--color-success)]',
      };
    case 'starting':
      return {
        label: 'Starting',
        dotClass: 'bg-[var(--color-warning)] animate-pulse',
        textClass: 'text-[var(--color-warning)]',
      };
    case 'stopping':
      return {
        label: 'Stopping',
        dotClass: 'bg-[var(--color-warning)]',
        textClass: 'text-[var(--color-warning)]',
      };
    case 'failed':
      return {
        label: 'Failed',
        dotClass: 'bg-[var(--color-danger)]',
        textClass: 'text-[var(--color-danger)]',
      };
    case 'stopped':
    default:
      return {
        label: 'Stopped',
        dotClass: 'bg-[var(--color-text-muted)]',
        textClass: 'text-[var(--color-text-muted)]',
      };
  }
}

export function ServerSelector() {
  const { servers, activeServer, setActiveServerId, isLoading } = useActiveServer();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close popover on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredServers = servers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeBadge = activeServer ? getStatusBadge(activeServer.status) : null;

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Trigger Button */}
      <button
        type="button"
        aria-label="Select DayZ server instance"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ServerIcon className="w-[18px] h-[18px] text-[var(--color-primary)] shrink-0" />
          <div className="flex flex-col min-w-0">
            {isLoading && !activeServer ? (
              <div className="h-3.5 w-24 bg-[var(--color-border)] rounded animate-pulse my-0.5" />
            ) : (
              <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                {activeServer ? activeServer.name : 'No server registered'}
              </span>
            )}
            {activeBadge && (
              <span
                className={`text-[10px] ${activeBadge.textClass} truncate flex items-center gap-1`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeBadge.dotClass}`} />
                {activeBadge.label}
              </span>
            )}
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Server instances"
          className="absolute left-0 right-0 mt-1.5 z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Bar if > 3 servers */}
          {servers.length > 3 && (
            <div className="px-2.5 py-1.5 border-b border-[var(--color-border)] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Filter servers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none"
                autoFocus
              />
            </div>
          )}

          {/* Server List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredServers.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] text-center">
                No servers found
              </div>
            ) : (
              filteredServers.map((server: ServerSummaryDto) => {
                const isSelected = activeServer?.id === server.id;
                const badge = getStatusBadge(server.status);

                return (
                  <button
                    key={server.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setActiveServerId(server.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[var(--color-surface-hover)] text-left ${
                      isSelected
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                        : 'text-[var(--color-text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotClass}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{server.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          Port: {server.gamePort}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Add Server Action for Admins */}
          {isAdmin && (
            <div className="border-t border-[var(--color-border)] pt-1 px-1">
              <Link
                to="/settings/server"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add new server</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
