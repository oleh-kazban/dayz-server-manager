import type { ReactNode, Ref } from 'react';

export type TabsVariant = 'segmented' | 'underline';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Primary label displayed on the tab */
  label: ReactNode;
  /** Optional numeric or string badge counter (e.g. 1248, 16) */
  count?: number | string;
  /** Optional leading icon */
  icon?: ReactNode;
  /** Disables interaction with this specific tab */
  disabled?: boolean;
}

export interface TabsProps {
  /** React 19 ref forwarded to the outer wrapper container */
  ref?: Ref<HTMLDivElement>;

  /** The currently active tab value (controlled mode) */
  value?: string;

  /** Default tab value when initially mounted (uncontrolled mode) */
  defaultValue?: string;

  /** Callback fired when a tab is selected */
  onChange?: (value: string) => void;

  /**
   * Visual style variant.
   * - `segmented`: enclosed surface track with pill triggers (filters/workbenches)
   * - `underline`: transparent track with accent indicator border (page navigation)
   * @default 'segmented'
   */
  variant?: TabsVariant;

  /**
   * Convenience data-driven tab items.
   * When provided, <TabList> and <TabTrigger> elements are automatically generated.
   */
  items?: TabItem[];

  /** Child compound components (<TabList>, <TabContent>) */
  children?: ReactNode;

  /** Stretches tabs to fill the full width of the container */
  fullWidth?: boolean;

  /** Accessible label for the tablist */
  ariaLabel?: string;

  /** Additional classes applied to the outermost container */
  containerClassName?: string;
}

export interface TabListProps {
  /** React 19 ref forwarded to the native tablist container */
  ref?: Ref<HTMLDivElement>;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** Child <TabTrigger> elements */
  children?: ReactNode;
  /** Additional styling classes */
  className?: string;
}

export interface TabTriggerProps {
  /** React 19 ref forwarded to the native <button> */
  ref?: Ref<HTMLButtonElement>;

  /** Unique identifier matching the tab value or panel */
  value: string;

  /** Tab label text or node */
  children?: ReactNode;

  /** Optional leading icon */
  icon?: ReactNode;

  /** Optional count badge (e.g. 24, "New") */
  count?: number | string;

  /** Disables the tab trigger */
  disabled?: boolean;

  /** Additional classes */
  className?: string;
}

export interface TabContentProps {
  /** React 19 ref forwarded to the native tabpanel <div> */
  ref?: Ref<HTMLDivElement>;

  /** Matches the tab value that controls this panel */
  value: string;

  /** Content to render inside the panel */
  children?: ReactNode;

  /** Additional classes */
  className?: string;

  /**
   * If true, mounts the panel in the DOM but hides it when inactive.
   * If false, completely unmounts when inactive.
   * @default false
   */
  forceMount?: boolean;
}
