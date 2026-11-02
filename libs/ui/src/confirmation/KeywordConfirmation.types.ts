import type { ReactNode } from 'react';

import type { ConfirmationVariant } from './Confirmation.types';

export interface KeywordConfirmationProps {
  /**
   * Keyword the user must type exactly to confirm the action.
   */
  keyword: string;

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
   * @default 'danger'
   */
  variant?: ConfirmationVariant;

  /**
   * Lockout countdown in seconds before confirmation input and button unlock.
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
