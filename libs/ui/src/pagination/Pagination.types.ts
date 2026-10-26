import { type HTMLAttributes, type ReactNode, type Ref } from 'react';

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * React 19 ref forwarded directly to the root `<nav>` element.
   */
  ref?: Ref<HTMLElement>;

  /**
   * Current active page number (1-based index).
   */
  page: number;

  /**
   * Total number of pages.
   */
  totalPages: number;

  /**
   * Callback fired when page selection changes.
   */
  onPageChange: (page: number) => void;

  /**
   * Total number of items across all pages.
   * Required when range info is displayed.
   */
  totalItems?: number;

  /**
   * Current number of items displayed per page.
   */
  pageSize?: number;

  /**
   * Available page size choices for the rows-per-page selector.
   * @default [10, 25, 50, 100]
   */
  pageSizeOptions?: number[];

  /**
   * Callback fired when the rows-per-page selection changes.
   */
  onPageSizeChange?: (pageSize: number) => void;

  /**
   * Number of adjacent sibling page buttons to show on either side of the active page.
   * @default 1
   */
  siblingCount?: number;

  /**
   * Whether to render quick First (<<) and Last (>>) page navigation buttons.
   * @default false
   */
  showFirstLast?: boolean;

  /**
   * Whether to render the rows-per-page dropdown selector.
   * @default true if onPageSizeChange is provided
   */
  showPageSize?: boolean;

  /**
   * Whether to render the item range summary ("Showing 1 to 25 of 142 items").
   * @default true if totalItems is provided
   */
  showItemCount?: boolean;

  /**
   * Custom format function to customize the items count summary.
   */
  formatItemCount?: (from: number, to: number, total: number) => ReactNode;

  /**
   * Label for the rows-per-page selector.
   * @default 'Rows per page:'
   */
  pageSizeLabel?: string;

  /**
   * Disables all interactive pagination controls.
   * @default false
   */
  disabled?: boolean;
}
