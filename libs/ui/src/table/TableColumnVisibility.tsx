import { type KeyboardEvent as ReactKeyboardEvent, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { ChevronDown, GripVertical, Lock, Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { usePopup } from '../hooks';

import { type TableColumnVisibilityProps } from './Table.types';

export function TableColumnVisibility({
  ref,
  columns,
  onColumnVisibilityChange,
  onReset,
  onShowAll,
  triggerLabel = 'Columns',
  alignment = 'end',
  searchPlaceholder = 'Find a column...',
  popupClassName = '',
  disabled = false,
}: TableColumnVisibilityProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const menuId = useId();
  const searchInputId = `${menuId}-search`;

  const { isOpen, toggle, close, popupPosition, triggerRef, popupRef } =
    usePopup<HTMLButtonElement>(alignment);

  const handleButtonRef = (element: HTMLButtonElement | null) => {
    triggerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLButtonElement | null }).current = element;
    }
  };

  const hiddenCount = useMemo(() => columns.filter(col => !col.isVisible).length, [columns]);

  const filteredColumns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return columns;
    }
    return columns.filter(col => col.label.toLowerCase().includes(query));
  }, [columns, searchQuery]);

  const handleShowAll = () => {
    if (onShowAll) {
      onShowAll();
    } else {
      columns.forEach(col => {
        if (!col.isVisible && col.canHide !== false) {
          onColumnVisibilityChange(col.id, true);
        }
      });
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    }
  };

  const chevronClass = isOpen ? 'rotate-180' : '';

  return (
    <>
      <Button
        ref={handleButtonRef}
        type="button"
        variant="secondary"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className="flex items-center gap-1.5 font-medium"
      >
        <SlidersHorizontal
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-secondary)]"
        />
        <span>{triggerLabel}</span>
        {hiddenCount > 0 && (
          <span
            aria-label={`${hiddenCount} columns hidden`}
            className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
          >
            {hiddenCount}
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-150 ${chevronClass}`}
        />
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={menuId}
            role="dialog"
            aria-label="Toggle column visibility"
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              maxHeight: popupPosition?.maxHeight ?? 400,
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            className={`z-50 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2.5 flex flex-col gap-2 font-sans select-none animate-in fade-in zoom-in-95 duration-100 ${popupClassName}`.trim()}
          >
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="w-3.5 h-3.5 absolute left-2.5 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear column search"
                  className="absolute right-2 p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Column List */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5 pr-0.5">
              {filteredColumns.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  No columns found
                </div>
              ) : (
                filteredColumns.map(col => {
                  const isLocked = col.canHide === false;
                  return (
                    <div
                      key={col.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]/70 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GripVertical
                          aria-hidden="true"
                          className="w-3 h-3 text-[var(--color-text-muted)] opacity-40 group-hover:opacity-80 shrink-0"
                        />
                        <Checkbox
                          id={`col-toggle-${col.id}`}
                          checked={col.isVisible}
                          disabled={isLocked}
                          onChange={e => onColumnVisibilityChange(col.id, e.target.checked)}
                          label={col.label}
                          className="text-xs"
                        />
                      </div>
                      {isLocked && (
                        <span title="Locked column">
                          <Lock
                            aria-label="Locked column"
                            className="w-3 h-3 text-[var(--color-text-muted)] shrink-0 ml-1.5"
                          />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs px-1">
              <button
                type="button"
                onClick={handleShowAll}
                className="text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
              >
                Show all
              </button>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:underline cursor-pointer"
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
