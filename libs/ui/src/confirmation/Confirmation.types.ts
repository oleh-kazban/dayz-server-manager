import type { ReactNode } from 'react';

export type ConfirmationVariant = 'primary' | 'warning' | 'danger';

export interface ConfirmationProps {
  /**
   * Main dialog headline.
   */
  title: string;

  /**
   * Explanatory text or content for the confirmation.
   */
  description?: ReactNode;

  /**
   * Cancel button label.
   * @default 'Cancel'
   */
  cancelLabel?: string;

  /**
   * Confirm button label.
   * @default 'Confirm'
   */
  confirmLabel?: string;

  /**
   * Semantic visual treatment.
   * @default 'primary'
   */
  variant?: ConfirmationVariant;

  /**
   * Lockout countdown in seconds before confirmation button is enabled.
   * @default 0
   */
  timerValue?: number;

  /**
   * Displays loading spinner and locks dialog during asynchronous operations.
   * @default false
   */
  isLoading?: boolean;

  /**
   * Callback fired when dialog is dismissed or canceled.
   */
  onCancel: () => void;

  /**
   * Callback fired when confirmed.
   */
  onConfirm: () => void;
}
