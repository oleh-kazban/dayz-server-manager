import type { ReactNode, Ref } from 'react';

export interface AutosuggestProps<T> {
  /** React 19 ref forwarded directly to the underlying <input> */
  ref?: Ref<HTMLInputElement>;

  /** Form field identity */
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;

  /** Controlled value & change handler */
  value: string;
  onChange: (_value: string) => void;

  /** Suggestions dataset */
  items: T[];

  /** Selection callback */
  onSelect: (_item: T) => void;

  /** Resolution accessors */
  getOptionLabel: (_item: T) => string;
  getOptionKey: (_item: T) => string | number;
  renderOption?: (_item: T, _isHighlighted: boolean) => ReactNode;

  /** Operational states */
  isLoading?: boolean;

  /** Configuration & strings */
  placeholder?: string;
  minChars?: number;
  emptyText?: string;

  /** Accessibility */
  'aria-label'?: string;

  /** Root container className */
  className?: string;

  /** Standard container styling escape hatch */
  containerClassName?: string;

  /** Legacy alias for containerClassName */
  customClassName?: string;
}
