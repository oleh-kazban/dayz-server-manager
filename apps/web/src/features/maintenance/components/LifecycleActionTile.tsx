import type { ReactNode } from 'react';

export interface LifecycleActionTileProps {
  title: string;
  description: string;
  /** The action control, pinned to the bottom of the tile. */
  action: ReactNode;
  /** Why the action is unavailable; shown under the control (not only in a tooltip). */
  hint?: string | null;
  hintId?: string;
}

/** One action in the Server lifecycle section: what it does, then its control. */
export function LifecycleActionTile({
  title,
  description,
  action,
  hint,
  hintId,
}: LifecycleActionTileProps) {
  return (
    <div className="flex h-full flex-col gap-4 py-4 md:px-5 md:first:pl-0 md:last:pr-0">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--color-text-main)]">{title}</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <div className="mt-auto space-y-2">
        {action}
        {hint && (
          <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
