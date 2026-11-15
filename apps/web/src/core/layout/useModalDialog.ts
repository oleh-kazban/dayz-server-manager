import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * True while a native modal <dialog> outside this modal is open on top of it. Checked
 * regardless of the event target: focus can sit on <body> (e.g. after tabbing past the
 * dialog's last control), and the stacked dialog must still own Escape and Tab.
 */
function hasStackedDialog(modal: HTMLElement | null): boolean {
  return Array.from(document.querySelectorAll('dialog[open]')).some(
    dialog => !modal?.contains(dialog),
  );
}

export interface UseModalDialogOptions {
  onClose: () => void;
  isBusy?: boolean;
}

export function useModalDialog({ onClose, isBusy = false }: UseModalDialogOptions) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isBusyRef = useRef(isBusy);

  useEffect(() => {
    onCloseRef.current = onClose;
    isBusyRef.current = isBusy;
  });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      // A native <dialog> stacked on top (e.g. "Discard unsaved changes?") owns its own
      // Escape and focus handling; the modal underneath must not react to it.
      if (hasStackedDialog(dialogRef.current)) {
        return;
      }

      if (event.key === 'Escape') {
        if (!isBusyRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter(el => !el.closest('[hidden]') && el.getAttribute('aria-hidden') !== 'true');

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (activeElement === firstElement || !dialogRef.current.contains(activeElement)) {
            event.preventDefault();
            lastElement.focus();
          }
        } else if (activeElement === lastElement || !dialogRef.current.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBusy && e.target === e.currentTarget) {
      onClose();
    }
  };

  return {
    dialogRef,
    handleBackdropClick,
  };
}
