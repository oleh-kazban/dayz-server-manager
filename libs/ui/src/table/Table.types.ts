import {
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';

export type TableDensity = 'compact' | 'comfortable';

export type TableAlign = 'left' | 'center' | 'right';

export type TableSortDirection = 'asc' | 'desc' | false | null;

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** React 19 native ref forwarded to the <table> element */
  ref?: Ref<HTMLTableElement>;

  /** Optional ref forwarded to the outer scrollable container element */
  containerRef?: Ref<HTMLDivElement>;

  /**
   * Row vertical padding and typography scale.
   * 'compact': py-2 px-3, 'comfortable': py-3 px-3.5.
   * @default 'comfortable'
   */
  density?: TableDensity;

  /**
   * Enables alternating row backgrounds.
   * @default false
   */
  striped?: boolean;

  /**
   * Container rendering variant.
   * - 'standalone': includes rounded border, surface background, and shadow.
   * - 'embedded': border-y without rounded corners or shadow, designed for Card/Workbench shells.
   * @default 'standalone'
   */
  variant?: 'standalone' | 'embedded';

  /** Outer card container styling escape hatch */
  containerClassName?: string;

  className?: string;
  children?: ReactNode;
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement>;
  className?: string;
  children?: ReactNode;
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement>;
  className?: string;
  children?: ReactNode;
}

export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {
  ref?: Ref<HTMLTableSectionElement>;
  className?: string;
  children?: ReactNode;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  ref?: Ref<HTMLTableRowElement>;

  /**
   * Whether the row is selected.
   * Applies the Outlive primary tint background.
   */
  isSelected?: boolean;

  /**
   * Enables interactive hover cursor treatment.
   * @default false
   */
  isClickable?: boolean;

  className?: string;
  children?: ReactNode;
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  ref?: Ref<HTMLTableCellElement>;

  /** Content text alignment */
  align?: TableAlign;

  /** Active sort state */
  sortDirection?: TableSortDirection;

  /** Click callback for column header sorting */
  onSort?: () => void;

  className?: string;
  children?: ReactNode;
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  ref?: Ref<HTMLTableCellElement>;

  /** Content text alignment */
  align?: TableAlign;

  className?: string;
  children?: ReactNode;
}

export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  ref?: Ref<HTMLTableCaptionElement>;
  className?: string;
  children?: ReactNode;
}

export interface TableEmptyProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'title'> {
  ref?: Ref<HTMLTableCellElement>;

  /** Number of table columns to span across */
  colSpan: number;

  /** Optional leading illustration or icon */
  icon?: ReactNode;

  /** Primary empty message heading */
  title?: ReactNode;

  /** Secondary guidance text */
  description?: ReactNode;

  /** Optional action slot (e.g. "Clear filters" or "Add item") */
  action?: ReactNode;

  className?: string;
}

export interface TableBulkActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;

  /** Number of currently selected items */
  selectedCount: number;

  /** Action buttons slot */
  children?: ReactNode;

  /** Clear selection callback */
  onClearSelection?: () => void;

  /**
   * Accessible clear button text.
   * @default 'Clear selection'
   */
  clearLabel?: string;

  className?: string;
}

export interface TableColumnItem {
  /** Unique column identifier */
  id: string;

  /** Display label */
  label: string;

  /** Current visibility state */
  isVisible: boolean;

  /**
   * Whether this column can be hidden.
   * If false, column visibility toggle is disabled with a lock icon.
   * @default true
   */
  canHide?: boolean;
}

export interface TableColumnVisibilityProps {
  /**
   * Ref forwarded to the trigger button element.
   */
  ref?: Ref<HTMLButtonElement>;

  /**
   * List of configurable table columns.
   */
  columns: TableColumnItem[];

  /**
   * Callback fired when a column's visibility changes.
   */
  onColumnVisibilityChange: (columnId: string, isVisible: boolean) => void;

  /**
   * Optional callback to reset column visibility to initial defaults.
   */
  onReset?: () => void;

  /**
   * Optional callback to show all columns.
   */
  onShowAll?: () => void;

  /**
   * Trigger button label text.
   * @default 'Columns'
   */
  triggerLabel?: string;

  /**
   * Popover dialog title heading.
   * @default 'Visible columns'
   */
  title?: string;

  /**
   * Popover dialog descriptive subtitle.
   * @default 'Choose what appears in your table.'
   */
  subtitle?: string;

  /**
   * Popover placement alignment relative to trigger.
   * @default 'end'
   */
  alignment?: 'start' | 'end';

  /**
   * Search input placeholder.
   * @default 'Find a column...'
   */
  searchPlaceholder?: string;

  /**
   * Custom CSS class applied to the popover menu container.
   */
  popupClassName?: string;

  /**
   * Disables the column visibility menu trigger.
   */
  disabled?: boolean;
}
