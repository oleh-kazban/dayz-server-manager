import { useId, useMemo } from 'react';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { type PaginationProps } from './Pagination.types';
import { getPaginationItems } from './pagination.utils';

function renderDefaultItemCount(from: number, to: number, total: number) {
  if (total === 0) {
    return 'Showing 0 items';
  }
  return `Showing ${from.toLocaleString()} to ${to.toLocaleString()} of ${total.toLocaleString()} items`;
}

export function Pagination({
  ref,
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  siblingCount = 1,
  showFirstLast = false,
  showPageSize = Boolean(onPageSizeChange),
  showItemCount = totalItems !== undefined,
  formatItemCount = renderDefaultItemCount,
  pageSizeLabel = 'Rows per page:',
  disabled = false,
  className = '',
  ...props
}: PaginationProps) {
  const selectId = useId();

  const safePage = Math.max(1, Math.min(page, Math.max(1, totalPages)));

  const paginationItems = useMemo(
    () => getPaginationItems(safePage, totalPages, siblingCount),
    [safePage, totalPages, siblingCount],
  );

  const isFirstPage = safePage <= 1;
  const isLastPage = safePage >= totalPages || totalPages === 0;

  const fromItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toItem =
    totalItems !== undefined ? Math.min(safePage * pageSize, totalItems) : safePage * pageSize;

  const navButtonBase =
    'inline-flex items-center justify-center h-8 min-w-8 px-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
  const navButtonInteractive =
    'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] active:bg-[var(--color-surface-subtle)] cursor-pointer';
  const navButtonDisabled = 'opacity-40 cursor-not-allowed';

  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-between gap-4 text-xs font-sans text-[var(--color-text-secondary)] ${className}`.trim()}
      {...props}
    >
      {/* Left section: Item range counter */}
      {showItemCount && totalItems !== undefined ? (
        <div className="text-[var(--color-text-muted)] select-none shrink-0">
          {formatItemCount(fromItem, toItem, totalItems)}
        </div>
      ) : (
        <div />
      )}

      {/* Right section: Page size selector and page buttons */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Rows per page selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor={selectId}
              className="text-xs text-[var(--color-text-muted)] select-none"
            >
              {pageSizeLabel}
            </label>
            <select
              id={selectId}
              value={pageSize}
              disabled={disabled}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-2xs hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation button group */}
        <div className="flex items-center gap-1">
          {/* Quick First page button */}
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={disabled || isFirstPage}
              aria-label="Go to first page"
              className={`${navButtonBase} ${
                disabled || isFirstPage ? navButtonDisabled : navButtonInteractive
              }`}
            >
              <ChevronsLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Previous page button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={disabled || isFirstPage}
            aria-label="Go to previous page"
            className={`${navButtonBase} ${
              disabled || isFirstPage ? navButtonDisabled : navButtonInteractive
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Numbered page buttons & Ellipses */}
          {paginationItems.map(item => {
            if (typeof item === 'string') {
              return (
                <span
                  key={item}
                  aria-hidden="true"
                  className="inline-flex items-center justify-center h-8 min-w-8 px-1 text-xs text-[var(--color-text-muted)] select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = item === safePage;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={disabled}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={`inline-flex items-center justify-center h-8 min-w-8 px-2 text-xs font-mono font-medium rounded-lg border transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isCurrent
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] active:bg-[var(--color-surface-subtle)] cursor-pointer'
                } ${disabled ? navButtonDisabled : ''}`}
              >
                {item}
              </button>
            );
          })}

          {/* Next page button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={disabled || isLastPage}
            aria-label="Go to next page"
            className={`${navButtonBase} ${
              disabled || isLastPage ? navButtonDisabled : navButtonInteractive
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Quick Last page button */}
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={disabled || isLastPage}
              aria-label="Go to last page"
              className={`${navButtonBase} ${
                disabled || isLastPage ? navButtonDisabled : navButtonInteractive
              }`}
            >
              <ChevronsRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
