import { useMemo } from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import {
  type TableAlign,
  type TableBodyProps,
  type TableCaptionProps,
  type TableCellProps,
  type TableEmptyProps,
  type TableFooterProps,
  type TableHeaderProps,
  type TableHeadProps,
  type TableProps,
  type TableRowProps,
  type TableSortDirection,
} from './Table.types';
import { TableContext, useTableContext } from './TableContext';

function getTextAlignmentClass(align: TableAlign = 'left'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function getFlexJustifyClass(align: TableAlign = 'left'): string {
  if (align === 'center') return 'justify-center';
  if (align === 'right') return 'justify-end';
  return 'justify-start';
}

function getRowSelectionClass(isSelected: boolean, striped: boolean): string {
  if (isSelected) {
    return 'bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10';
  }
  if (striped) {
    return 'odd:bg-transparent even:bg-[var(--color-surface-subtle)]/30 hover:bg-[var(--color-surface-subtle)]/60';
  }
  return 'hover:bg-[var(--color-surface-subtle)]/50';
}

function getAriaSort(sortDirection?: TableSortDirection): 'ascending' | 'descending' | undefined {
  if (sortDirection === 'asc') return 'ascending';
  if (sortDirection === 'desc') return 'descending';
  return undefined;
}

function renderSortIcon(sortDirection?: TableSortDirection) {
  if (sortDirection === 'asc') {
    return (
      <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
    );
  }
  if (sortDirection === 'desc') {
    return (
      <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
    );
  }
  if (sortDirection === false) {
    return (
      <ArrowUpDown
        aria-hidden="true"
        className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
      />
    );
  }
  return null;
}

export function Table({
  ref,
  containerRef,
  density = 'comfortable',
  striped = false,
  containerClassName = '',
  className = '',
  children,
  ...props
}: TableProps) {
  const contextValue = useMemo(() => ({ density, striped }), [density, striped]);

  return (
    <TableContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs ${containerClassName}`.trim()}
      >
        <div className="w-full overflow-x-auto">
          <table
            ref={ref}
            className={`w-full caption-bottom text-xs font-sans border-collapse text-left ${className}`.trim()}
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    </TableContext.Provider>
  );
}

export function TableHeader({ ref, className = '', children, ...props }: TableHeaderProps) {
  return (
    <thead
      ref={ref}
      className={`bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] ${className}`.trim()}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ ref, className = '', children, ...props }: TableBodyProps) {
  return (
    <tbody
      ref={ref}
      className={`divide-y divide-[var(--color-border)]/50 ${className}`.trim()}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableFooter({ ref, className = '', children, ...props }: TableFooterProps) {
  return (
    <tfoot
      ref={ref}
      className={`border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)] font-medium text-[var(--color-text-secondary)] ${className}`.trim()}
      {...props}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  ref,
  isSelected = false,
  isClickable = false,
  className = '',
  children,
  ...props
}: TableRowProps) {
  const { striped } = useTableContext();
  const selectionClass = getRowSelectionClass(isSelected, striped);
  const cursorClass = isClickable ? 'cursor-pointer' : '';

  return (
    <tr
      ref={ref}
      aria-selected={isSelected || undefined}
      className={`transition-colors border-b border-[var(--color-border)]/50 last:border-b-0 ${selectionClass} ${cursorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  ref,
  align = 'left',
  sortDirection,
  onSort,
  className = '',
  children,
  ...props
}: TableHeadProps) {
  const { density } = useTableContext();
  const paddingClass = density === 'compact' ? 'py-2 px-3' : 'py-3 px-3.5';
  const textAlignClass = getTextAlignmentClass(align);
  const justifyClass = getFlexJustifyClass(align);
  const isSortable = Boolean(onSort || sortDirection !== undefined);
  const sortIcon = renderSortIcon(sortDirection);
  const ariaSort = getAriaSort(sortDirection);

  return (
    <th
      ref={ref}
      scope="col"
      aria-sort={ariaSort}
      onClick={onSort}
      className={`font-semibold text-xs text-[var(--color-text-secondary)] select-none whitespace-nowrap ${paddingClass} ${textAlignClass} ${
        isSortable
          ? 'cursor-pointer group hover:text-[var(--color-text-main)] transition-colors'
          : ''
      } ${className}`.trim()}
      {...props}
    >
      <div className={`flex items-center gap-1.5 ${justifyClass}`}>
        <span>{children}</span>
        {sortIcon}
      </div>
    </th>
  );
}

export function TableCell({
  ref,
  align = 'left',
  className = '',
  children,
  ...props
}: TableCellProps) {
  const { density } = useTableContext();
  const paddingClass = density === 'compact' ? 'py-2 px-3' : 'py-3 px-3.5';
  const textAlignClass = getTextAlignmentClass(align);

  return (
    <td
      ref={ref}
      className={`align-middle text-xs font-sans text-[var(--color-text-main)] ${paddingClass} ${textAlignClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({ ref, className = '', children, ...props }: TableCaptionProps) {
  return (
    <caption
      ref={ref}
      className={`mt-4 text-xs text-[var(--color-text-muted)] text-left ${className}`.trim()}
      {...props}
    >
      {children}
    </caption>
  );
}

export function TableEmpty({
  ref,
  colSpan,
  icon,
  title = 'No records found',
  description,
  action,
  className = '',
  ...props
}: TableEmptyProps) {
  return (
    <tr className="hover:bg-transparent">
      <td
        ref={ref}
        colSpan={colSpan}
        className={`py-12 px-4 text-center ${className}`.trim()}
        {...props}
      >
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
          {icon && (
            <div className="p-2.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50">
              {icon}
            </div>
          )}
          {title && (
            <h5 className="text-xs font-semibold text-[var(--color-text-main)]">{title}</h5>
          )}
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</p>
          )}
          {action && <div className="pt-2">{action}</div>}
        </div>
      </td>
    </tr>
  );
}
