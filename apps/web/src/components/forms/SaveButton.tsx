import type { MouseEvent } from 'react';

import { Button, type ButtonProps, Tooltip } from '@aegis/ui';

export const NO_CHANGES_HINT = 'No changes to save';

export interface SaveButtonProps extends Omit<ButtonProps, 'disabled' | 'isLoading'> {
  /** False while the form matches its saved values; the button is then inert. */
  hasChanges: boolean;
  isPending: boolean;
}

/**
 * Submit control for update forms (DSM-00137 REQ-01/03). While nothing has changed it is
 * `aria-disabled` rather than `disabled`, so it stays focusable and can explain itself.
 */
export function SaveButton({ hasChanges, isPending, onClick, ...props }: SaveButtonProps) {
  const isInert = !hasChanges;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInert) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Tooltip content={NO_CHANGES_HINT} disabled={!isInert}>
      <Button
        variant="primary"
        {...props}
        isLoading={isPending}
        aria-disabled={isInert || undefined}
        onClick={handleClick}
      />
    </Tooltip>
  );
}
