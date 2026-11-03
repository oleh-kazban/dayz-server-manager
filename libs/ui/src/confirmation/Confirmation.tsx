import { useId } from 'react';

import { X } from 'lucide-react';

import { Button } from '../button';

import type { ConfirmationProps, ConfirmationVariant } from './Confirmation.types';
import { useCountdownTimer } from './useCountdownTimer';
import { useDialogLifecycle } from './useDialogLifecycle';
import { VariantIcon } from './VariantIcon';

export type { ConfirmationProps, ConfirmationVariant };

export function Confirmation({
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  variant = 'primary',
  timerValue = 0,
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmationProps) {
  const { remainingTime } = useCountdownTimer(timerValue);
  const { dialogRef, closeDialog, handleClose, handleDialogClick, handleCancelEvent } =
    useDialogLifecycle({ isLoading, onCancel, onConfirm });

  const isConfirmDisabled = remainingTime > 0 || isLoading;
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancelEvent}
      onClose={handleClose}
      onClick={handleDialogClick}
      className="m-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text-main)] shadow-[var(--shadow-card)] backdrop:bg-black/50 backdrop:backdrop-blur-xs"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <VariantIcon variant={variant} />
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold leading-tight text-[var(--color-text-main)]"
              >
                {title}
              </h2>
              {description && (
                <div
                  id={descriptionId}
                  className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]"
                >
                  {description}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            disabled={isLoading}
            onClick={() => closeDialog('cancel')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            variant="secondary"
            autoFocus
            disabled={isLoading}
            onClick={() => closeDialog('cancel')}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            destructive={variant === 'danger' || variant === 'warning'}
            isLoading={isLoading}
            disabled={isConfirmDisabled}
            onClick={() => closeDialog('confirm')}
          >
            {remainingTime > 0 ? `${confirmLabel} (${remainingTime}s)` : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
