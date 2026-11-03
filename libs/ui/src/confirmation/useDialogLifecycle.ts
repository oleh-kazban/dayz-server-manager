import { type MouseEvent, type RefObject, type SyntheticEvent, useEffect, useRef } from 'react';

export interface UseDialogLifecycleOptions {
  isLoading?: boolean;
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
  onCancel,
  onConfirm,
}: UseDialogLifecycleOptions): UseDialogLifecycleReturn {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isUnmountingRef = useRef(false);

  const closeDialog = (returnValue: 'confirm' | 'cancel' = 'cancel') => {
    dialogRef.current?.close(returnValue);
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (isLoading || isUnmountingRef.current) return;
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

  const handleCancelEvent = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (isLoading) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    isUnmountingRef.current = false;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      isUnmountingRef.current = true;
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return {
    dialogRef,
    closeDialog,
    handleClose,
    handleDialogClick,
    handleCancelEvent,
  };
}
