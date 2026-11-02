import type { ComponentType, InputHTMLAttributes, ReactNode, Ref } from 'react';

import type { LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label displayed above the input field */
  label?: string;

  /** Validation error message; switches field to error treatment and links aria-describedby */
  error?: string;

  /** Leading icon component */
  leftIcon?: LucideIcon | ComponentType<{ className?: string }>;

  /** Trailing slot for action buttons or indicators */
  rightAction?: ReactNode;

  /** Root container styling escape hatch */
  customClassName?: string;

  /** Standard container styling escape hatch */
  containerClassName?: string;

  /** React 19 native DOM ref */
  ref?: Ref<HTMLInputElement>;
}

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon | ComponentType<{ className?: string }>;
  customClassName?: string;
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
  showToggle?: boolean;
}
