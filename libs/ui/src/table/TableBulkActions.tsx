import { type TableBulkActionsProps } from './Table.types';

export function TableBulkActions({
  ref,
  selectedCount,
  children,
  onClearSelection,
  clearLabel = 'Clear selection',
  className = '',
  ...props
}: TableBulkActionsProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Table bulk actions"
      className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-t-xl bg-[var(--color-primary)]/10 border-b border-[var(--color-primary)]/20 text-xs font-sans transition-all ${className}`.trim()}
      {...props}
    >
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-semibold text-[var(--color-primary)] whitespace-nowrap">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>

        {children && <div className="flex items-center gap-1.5 overflow-x-auto">{children}</div>}
      </div>

      {onClearSelection && (
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded px-1"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
