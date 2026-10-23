import { useState } from 'react';

import { Eye, EyeOff, Lock } from 'lucide-react';

import { Input, type InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightAction'> {
  showToggle?: boolean;
}

export function PasswordInput({
  leftIcon = Lock,
  showToggle = true,
  ...props
}: PasswordInputProps & { ref?: React.Ref<HTMLInputElement> }) {
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
            onClick={() => setShow(prev => !prev)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer shrink-0"
          >
            {show ? (
              <EyeOff className="w-[17px] h-[17px]" />
            ) : (
              <Eye className="w-[17px] h-[17px]" />
            )}
          </button>
        ) : undefined
      }
    />
  );
}
