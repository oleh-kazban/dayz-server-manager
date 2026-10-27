import { type MouseEvent, type SyntheticEvent, useEffect, useId, useRef, useState } from 'react';

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

import { Button } from '../button';

import type { ConfirmationProps, ConfirmationVariant } from './Confirmation.types';

export type { ConfirmationProps, ConfirmationVariant };

function VariantIcon({ variant }: { variant: ConfirmationVariant }) {
  switch (variant) {
    case 'danger':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    case 'warning':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-status-warning-light)] text-[var(--color-status-warning)]">
          <AlertCircle className="h-5 w-5" />
        </div>
      );
    case 'primary':
    default:
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <Info className="h-5 w-5" />
        </div>
      );
  }
}

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
  const [prevTimerValue, setPrevTimerValue] = useState(timerValue);
  const [remainingTime, setRemainingTime] = useState(timerValue);

  if (timerValue !== prevTimerValue) {
    setPrevTimerValue(timerValue);
    setRemainingTime(timerValue);
  }

  const isConfirmDisabled = remainingTime > 0 || isLoading;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (timerValue <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerValue]);

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (isLoading) return;
    if (event.currentTarget.returnValue === 'confirm') {
      onConfirm();
    } else {
      onCancel();
    }
  };

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (isLoading) return;
    if (event.target === event.currentTarget) {
      dialogRef.current?.close('cancel');
    }
  };

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => {
        if (isLoading) {
          event.preventDefault();
        }
      }}
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
            onClick={() => dialogRef.current?.close('cancel')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            variant="secondary"
            autoFocus
            disabled={isLoading}
            onClick={() => dialogRef.current?.close('cancel')}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            destructive={variant === 'danger' || variant === 'warning'}
            isLoading={isLoading}
            disabled={isConfirmDisabled}
            onClick={() => dialogRef.current?.close('confirm')}
          >
            {remainingTime > 0 ? `${confirmLabel} (${remainingTime}s)` : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
