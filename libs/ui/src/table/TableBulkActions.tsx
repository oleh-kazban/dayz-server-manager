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
      className={`flex items-center justify-between gap-4 px-5 py-2.5 bg-[#edf5fd] dark:bg-[var(--color-primary)]/10 border-y border-[#d0e4f7] dark:border-[var(--color-primary)]/20 text-xs font-sans transition-all ${className}`.trim()}
      {...props}
    >
      <div className="flex items-center gap-6 min-w-0">
        <span className="font-semibold text-[var(--color-primary)] whitespace-nowrap">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>

        {children && <div className="flex items-center gap-2 whitespace-nowrap">{children}</div>}
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
