import { Button, Notice } from '@aegis/ui';

import type { ConfigEditorMode } from './server-config.types';
import { formatConfigTimestamp } from './server-config.utils';

export interface ConfigLockBannerProps {
  mode: ConfigEditorMode;
  currentHolderName: string | null;
  isBusy: boolean;
  onTakeOver: () => void;
  onDismissLockLost: () => void;
}

export function ConfigLockBanner({
  mode,
  currentHolderName,
  isBusy,
  onTakeOver,
  onDismissLockLost,
}: ConfigLockBannerProps) {
  switch (mode.kind) {
    case 'running':
      return (
        <Notice variant="warning" title="Stop the server to edit">
          serverDZ.cfg is read-only while the server is running.
        </Notice>
      );
    case 'locked-by-other':
      return (
        <Notice
          variant="info"
          title={`Being edited by ${mode.holderName} since ${formatConfigTimestamp(mode.acquiredAt)}`}
          action={
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onTakeOver}>
              Take over
            </Button>
          }
        >
          The file is read-only for you until the other session finishes or you take over.
        </Notice>
      );
    case 'lock-lost':
      return (
        <Notice
          variant="danger"
          title="Edit lock lost"
          onClose={onDismissLockLost}
          closeLabel="Dismiss"
        >
          {currentHolderName
            ? `${currentHolderName} took over editing.`
            : 'Your edit session expired.'}{' '}
          Unsaved changes were not written; they stay visible read-only until you dismiss this.
        </Notice>
      );
    case 'missing':
      return (
        <Notice variant="warning" title="serverDZ.cfg does not exist">
          {mode.serverRunning
            ? 'Stop the server to create the file from the DSM template.'
            : 'Create it from the DSM template, then review and save your settings.'}
        </Notice>
      );
    case 'viewing':
    case 'editing':
      return null;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}
