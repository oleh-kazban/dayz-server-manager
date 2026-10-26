import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ChevronDown, GripVertical, Lock, Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { usePopup } from '../hooks';

import { type TableColumnItem, type TableColumnVisibilityProps } from './Table.types';

interface ColumnItemRowProps {
  col: TableColumnItem;
  canReorder: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  dragOverPosition: 'above' | 'below';
  onVisibilityChange: (columnId: string, isVisible: boolean) => void;
  onDragStart: (e: ReactDragEvent, colId: string) => void;
  onDragOver: (e: ReactDragEvent, colId: string) => void;
  onDragLeave: (colId: string) => void;
  onDrop: (e: ReactDragEvent, targetId: string) => void;
  onDragEnd: () => void;
  onMoveColumn: (colId: string, direction: 'up' | 'down') => void;
}

function ColumnRowTrailingIcon({
  isLocked,
  canReorder,
  label,
  colId,
  onMoveColumn,
}: {
  isLocked: boolean;
  canReorder: boolean;
  label: string;
  colId: string;
  onMoveColumn: (colId: string, direction: 'up' | 'down') => void;
}) {
  if (isLocked) {
    return (
      <span title="Locked column">
        <Lock
          aria-label="Locked column"
          className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-60 shrink-0"
        />
      </span>
    );
  }

  if (canReorder) {
    return (
      <button
        type="button"
        aria-label={`Reorder ${label} column`}
        title={`Drag or use arrow keys to reorder ${label}`}
        onKeyDown={e => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            onMoveColumn(colId, 'up');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onMoveColumn(colId, 'down');
          }
        }}
        className="p-1 -mr-1 rounded hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] opacity-40 group-hover:opacity-80 shrink-0"
      >
        <GripVertical aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
    );
  }

  return null;
}

function getDropIndicatorClass(isDragOver: boolean, position: 'above' | 'below'): string {
  if (!isDragOver) {
    return '';
  }
  return position === 'above'
    ? 'border-t-2 border-[var(--color-primary)]'
    : 'border-b-2 border-[var(--color-primary)]';
}

function ColumnItemRow({
  col,
  canReorder,
  isDragging,
  isDragOver,
  dragOverPosition,
  onVisibilityChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveColumn,
}: ColumnItemRowProps) {
  const isLocked = col.canHide === false;
  const isDraggable = !isLocked && canReorder;
  const dropIndicatorClass = getDropIndicatorClass(isDragOver, dragOverPosition);
  const draggingClass = isDragging ? 'opacity-40 bg-[var(--color-surface-subtle)]' : '';

  const dragHandlers = isDraggable
    ? {
        draggable: true,
        onDragStart: (e: ReactDragEvent) => onDragStart(e, col.id),
        onDragOver: (e: ReactDragEvent) => onDragOver(e, col.id),
        onDragLeave: () => onDragLeave(col.id),
        onDrop: (e: ReactDragEvent) => onDrop(e, col.id),
        onDragEnd,
      }
    : {};

  return (
    <div
      {...dragHandlers}
      className={`flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]/70 transition-all group ${dropIndicatorClass} ${draggingClass}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Checkbox
          id={`col-toggle-${col.id}`}
          checked={col.isVisible}
          disabled={isLocked}
          onChange={e => onVisibilityChange(col.id, e.target.checked)}
          label={col.label}
          className="text-xs"
        />
      </div>
      <ColumnRowTrailingIcon
        isLocked={isLocked}
        canReorder={canReorder}
        label={col.label}
        colId={col.id}
        onMoveColumn={onMoveColumn}
      />
    </div>
  );
}

export function TableColumnVisibility({
  ref,
  columns,
  onColumnVisibilityChange,
  onColumnsReorder,
  onReset,
  onShowAll,
  triggerLabel = 'Columns',
  title = 'Visible columns',
  subtitle = 'Choose what appears in your table.',
  alignment = 'end',
  searchPlaceholder = 'Find a column...',
  popupClassName = '',
  disabled = false,
}: TableColumnVisibilityProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below'>('above');
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

  const handleDragStart = (e: ReactDragEvent, colId: string) => {
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(colId);
  };

  const handleDragOver = (e: ReactDragEvent, colId: string) => {
    if (!draggedId || draggedId === colId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';

    setDragOverId(colId);
    setDragOverPosition(position);
  };

  const handleDragLeave = (colId: string) => {
    if (dragOverId === colId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: ReactDragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !onColumnsReorder) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceIndex = columns.findIndex(c => c.id === draggedId);
    let targetIndex = columns.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (dragOverPosition === 'below' && sourceIndex > targetIndex) {
      targetIndex += 1;
    } else if (dragOverPosition === 'above' && sourceIndex < targetIndex) {
      targetIndex -= 1;
    }

    const next = [...columns];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    onColumnsReorder(next);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleMoveColumn = (colId: string, direction: 'up' | 'down') => {
    if (!onColumnsReorder) return;
    const index = columns.findIndex(c => c.id === colId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    if (targetIndex === 0 && columns[0].canHide === false) return;

    const next = [...columns];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onColumnsReorder(next);
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
            className={`z-50 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-3 flex flex-col gap-2.5 font-sans select-none animate-in fade-in zoom-in-95 duration-100 ${popupClassName}`.trim()}
          >
            {/* Header matching Editor.png */}
            <div className="flex flex-col gap-0.5 px-0.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-main)]">{title}</span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                  {columns.length - hiddenCount} of {columns.length}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">{subtitle}</p>
            </div>

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
            <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5 pr-0.5">
              {filteredColumns.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  No columns found
                </div>
              ) : (
                filteredColumns.map(col => (
                  <ColumnItemRow
                    key={col.id}
                    col={col}
                    canReorder={Boolean(onColumnsReorder)}
                    isDragging={draggedId === col.id}
                    isDragOver={dragOverId === col.id}
                    dragOverPosition={dragOverPosition}
                    onVisibilityChange={onColumnVisibilityChange}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onMoveColumn={handleMoveColumn}
                  />
                ))
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
