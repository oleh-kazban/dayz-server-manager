import { type Toast, Toaster } from 'react-hot-toast';

import type { Meta, StoryObj } from '@storybook/react';

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
        Click below to dispatch real animated notifications:
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() =>
            showToast({
              type: 'success',
              title: 'Backup Created',
              description: 'Snapshot 2026-10-23_18-45 created in 1.4s.',
            })
          }
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          Success Toast
        </button>

        <button
          type="button"
          onClick={() =>
            showToast({
              type: 'info',
              title: 'Player Connected',
              description: 'Survivor "Wolfpack" joined (48/50 players).',
            })
          }
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Info Toast
        </button>

        <button
          type="button"
          onClick={() =>
            showToast({
              type: 'warning',
              title: 'Scheduled Restart',
              description: 'Automatic maintenance restart in 5 minutes.',
            })
          }
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
        >
          Warning Toast
        </button>

        <button
          type="button"
          onClick={() =>
            showToast({
              type: 'error',
              title: 'RCON Connection Refused',
              description: 'BattlEye port 2306 unreachable on host.',
            })
          }
          className="rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Error Toast
        </button>
      </div>
    </div>
  );
}

export const InteractiveTrigger: StoryObj = {
  render: () => <InteractiveToastDemo />,
};
