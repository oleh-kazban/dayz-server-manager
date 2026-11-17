import type { ReactNode } from 'react';

export interface LifecycleActionTileProps {
  title: string;
  description: string;
  /** The action control, pinned to the bottom so controls line up across tiles. */
  action: ReactNode;
  /**
   * Why the action is unavailable, shown above the control and linked to it with
   * `aria-describedby`. Always visible text: no tooltip, so it also works on touch screens.
   */
  hint?: string | null;
  hintId?: string;
}

/**
 * One action in the Server lifecycle section: what it does, why it is unavailable (if so), then
 * its control. The control is the last element, so buttons align across tiles whatever the hints.
 */
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
      {hint && (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      <div className="mt-auto">{action}</div>
    </div>
  );
}
