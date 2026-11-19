import { type MouseEvent, type RefObject, type SyntheticEvent, useEffect, useRef } from 'react';

export interface UseDialogLifecycleOptions {
  isLoading?: boolean;
  /** Focused right after showModal(); React's `autoFocus` fires while the dialog is still closed. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface UseDialogLifecycleReturn {
  dialogRef: RefObject<HTMLDialogElement | null>;
  closeDialog: (returnValue?: 'confirm' | 'cancel') => void;
  handleClose: (event: SyntheticEvent<HTMLDialogElement>) => void;
  handleDialogClick: (event: MouseEvent<HTMLDialogElement>) => void;
  handleCancelEvent: (event: SyntheticEvent<HTMLDialogElement>) => void;
}

export function useDialogLifecycle({
  isLoading = false,
  initialFocusRef,
  onCancel,
  onConfirm,
}: UseDialogLifecycleOptions): UseDialogLifecycleReturn {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isMountedRef = useRef(false);

  const closeDialog = (returnValue: 'confirm' | 'cancel' = 'cancel') => {
    dialogRef.current?.close(returnValue);
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (isLoading || !isMountedRef.current || event.currentTarget.returnValue === 'cleanup') return;
    if (event.currentTarget.returnValue === 'confirm') {
      onConfirm();
    } else {
      onCancel();
    }
  };

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (isLoading) return;
    if (event.target === event.currentTarget) {
      closeDialog('cancel');
    }
  };

  const handleCancelEvent = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (isLoading) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    }
    return () => {
      isMountedRef.current = false;
      if (dialog && dialog.open) {
        dialog.close('cleanup');
      }
    };
  }, [initialFocusRef]);

  return {
    dialogRef,
    closeDialog,
    handleClose,
    handleDialogClick,
    handleCancelEvent,
  };
}
