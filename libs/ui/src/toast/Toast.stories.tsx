import { type Toast, Toaster } from 'react-hot-toast';

import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../button';

import { CustomToast } from './CustomToast';
import { showToast } from './toast.utils';

const meta: Meta<typeof CustomToast> = {
  title: 'Feedback/Toast',
  component: CustomToast,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

const MOCK_TOAST: Toast = {
  id: 'preview-toast',
  visible: true,
  dismissed: false,
  pauseDuration: 0,
  duration: 4000,
  ariaProps: { role: 'status', 'aria-live': 'polite' },
  type: 'custom',
  message: '',
  createdAt: Date.now(),
};

export const StaticVariants: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3.5">
      <CustomToast
        t={MOCK_TOAST}
        type="success"
        title="Server Persistence Saved"
        description="Chernarus world data successfully flushed to storage_1."
      />
      <CustomToast
        t={MOCK_TOAST}
        type="info"
        title="Mod Update Available"
        description="DayZ Expansion v1.9.4 is ready for download via SteamCMD."
      />
      <CustomToast
        t={MOCK_TOAST}
        type="warning"
        title="High Memory Usage"
        description="Dedicated server process reached 85% allocated RAM."
      />
      <CustomToast
        t={MOCK_TOAST}
        type="error"
        title="Process Crash Detected"
        description="DayZServer_x64.exe exited unexpectedly with code 0xC0000005."
      />
    </div>
  ),
};

function InteractiveToastDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Toaster position="bottom-right" />
      <p className="text-xs text-[var(--color-text-muted)]">
        Click below to dispatch real animated notifications via shorthand methods:
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={() =>
            showToast.success('Backup Created', 'Snapshot 2026-10-23_18-45 created in 1.4s.')
          }
        >
          Success Toast
        </Button>

        <Button
          variant="primary"
          onClick={() =>
            showToast.info('Player Connected', 'Survivor "Wolfpack" joined (48/50 players).')
          }
        >
          Info Toast
        </Button>

        <Button
          variant="secondary"
          onClick={() =>
            showToast.warning('Scheduled Restart', 'Automatic maintenance restart in 5 minutes.')
          }
        >
          Warning Toast
        </Button>

        <Button
          variant="secondary"
          destructive
          onClick={() =>
            showToast.error('RCON Connection Refused', 'BattlEye port 2306 unreachable on host.')
          }
        >
          Error Toast
        </Button>

        <Button variant="ghost" onClick={() => showToast.dismiss()}>
          Dismiss All
        </Button>
      </div>
    </div>
  );
}

export const InteractiveTrigger: StoryObj = {
  render: () => <InteractiveToastDemo />,
};
