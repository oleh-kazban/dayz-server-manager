import { useState } from 'react';

import { Eye, EyeOff, Lock } from 'lucide-react';

import { Input, type InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightAction'> {
  /**
   * Whether to display the show/hide password toggle button.
   * @default true
   */
  showToggle?: boolean;
}

export function PasswordInput({
  leftIcon = Lock,
  showToggle = true,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      leftIcon={leftIcon}
      rightAction={
        showToggle ? (
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => setShow(prev => !prev)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="cursor-pointer rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : undefined
      }
    />
  );
}
