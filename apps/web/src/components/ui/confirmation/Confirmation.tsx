import {
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ConfirmationVariant = 'primary' | 'warning' | 'danger';

export interface ConfirmationProps {
  title: string;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  variant?: ConfirmationVariant;
  timerValue?: number;
  confirmClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const VARIANT_CONFIRM_CLASSES: Record<ConfirmationVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:opacity-90',
  warning: 'bg-[var(--color-warning)] text-white hover:opacity-90',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
};

function VariantIcon({ variant }: { variant: ConfirmationVariant }) {
  switch (variant) {
    case 'danger':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    case 'warning':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
          <AlertCircle className="h-5 w-5" />
        </div>
      );
    case 'primary':
    default:
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
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
  confirmClassName,
  onCancel,
  onConfirm,
}: ConfirmationProps) {
  const [remainingTime, setRemainingTime] = useState(timerValue);
  const isConfirmDisabled = remainingTime > 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.currentTarget.returnValue === 'confirm') {
      onConfirm();
    } else {
      onCancel();
    }
  };

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
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
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => dialogRef.current?.close('cancel')}
            className="rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close('cancel')}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close('confirm')}
            disabled={isConfirmDisabled}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmClassName ?? VARIANT_CONFIRM_CLASSES[variant]
            }`}
          >
            {isConfirmDisabled ? `${confirmLabel} (${remainingTime}s)` : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
