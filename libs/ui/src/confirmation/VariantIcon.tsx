import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

import type { ConfirmationVariant } from './Confirmation.types';

export interface VariantIconProps {
  variant: ConfirmationVariant;
}

export function VariantIcon({ variant }: VariantIconProps) {
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
