import type { ReactNode, Ref } from 'react';

import type { Alignment } from '../hooks';

export interface FloatingMenuOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
  className?: string;
  indicatorClassName?: string;
}

export interface FloatingMenuProps<T extends string> {
  options: FloatingMenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  alignment?: Alignment;
  disabled?: boolean;
  customClassName?: string;
  ref?: Ref<HTMLButtonElement>;
}

export interface DotsFloatingMenuOption {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}

export interface DotsFloatingMenuProps {
  options: DotsFloatingMenuOption[];
  ariaLabel: string;
  alignment?: Alignment;
  disabled?: boolean;
  icon?: ReactNode;
  customClassName?: string;
  ref?: Ref<HTMLButtonElement>;
}
