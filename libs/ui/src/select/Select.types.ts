import { type ComponentType, type ReactNode, type Ref } from 'react';

import { type LucideIcon } from 'lucide-react';

export interface SelectOption<T = string> {
  /** Unique value of the option */
  value: T;

  /** Display label for the option */
  label: string;

  /** Optional secondary description or hint */
  description?: string;

  /** Whether this individual option is disabled */
  disabled?: boolean;

  /** Optional leading icon */
  icon?: ReactNode;

  /** Optional badge or counter */
  badge?: string | number;
}

export interface SelectProps<T = string> {
  /** React 19 native DOM ref forwarded to the trigger button */
  ref?: Ref<HTMLButtonElement>;

  /** Form field identity */
  id?: string;
  name?: string;

  /** Label displayed above the select field */
  label?: string;

  /** Validation error message; renders field in danger state and sets aria-invalid */
  error?: string;

  /** Supporting helper text displayed below the field */
  helperText?: string;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Whether the field is required */
  required?: boolean;

  /** Text displayed when no option is selected */
  placeholder?: string;

  /** Enables an inline clear button when a value is selected */
  clearable?: boolean;

  /** Leading icon rendered inside the trigger */
  leftIcon?: LucideIcon | ComponentType<{ className?: string }>;

  /** Options list */
  options: SelectOption<T>[];

  /** Controlled value */
  value?: T | null;

  /** Uncontrolled default value */
  defaultValue?: T | null;

  /** Selection change callback */
  onChange?: (value: T | null, option: SelectOption<T> | null) => void;

  /** Custom option renderer */
  renderOption?: (
    option: SelectOption<T>,
    isSelected: boolean,
    isHighlighted: boolean,
  ) => ReactNode;

  /** Custom selected value renderer in trigger */
  renderValue?: (option: SelectOption<T> | null) => ReactNode;

  /** Message rendered when options array is empty */
  emptyText?: string;

  /** Accessibility label for screen readers when visible label is absent */
  'aria-label'?: string;

  /** Trigger button styling escape hatch */
  className?: string;

  /** Dropdown menu popup styling escape hatch */
  popupClassName?: string;

  /** Outer wrapper container styling escape hatch */
  containerClassName?: string;

  /** Legacy container className alias */
  customClassName?: string;
}
