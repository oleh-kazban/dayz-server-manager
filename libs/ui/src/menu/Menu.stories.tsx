import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Download, Power, RefreshCw, Trash2 } from 'lucide-react';

import { DotsFloatingMenu } from './DotsFloatingMenu';
import { FloatingMenu } from './FloatingMenu';

const meta: Meta = {
  title: 'Navigation/Menu',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const DotsActionMenu: StoryObj = {
  render: () => (
    <div className="flex h-48 items-start justify-center p-8">
      <DotsFloatingMenu
        ariaLabel="Server row actions"
        options={[
          {
            label: 'Restart Process',
            icon: <RefreshCw className="h-3.5 w-3.5 text-[var(--color-primary)]" />,
            onSelect: () => console.log('Restart clicked'),
          },
          {
            label: 'Download RPT Logs',
            icon: <Download className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />,
            onSelect: () => console.log('Download logs clicked'),
          },
          {
            label: 'Force Kill (#shutdown)',
            icon: <Power className="h-3.5 w-3.5 text-[var(--color-warning)]" />,
            onSelect: () => console.log('Force kill clicked'),
          },
          {
            label: 'Delete Instance',
            icon: <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />,
            className: 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10',
            onSelect: () => console.log('Delete clicked'),
          },
        ]}
      />
    </div>
  ),
};

function FloatingSelectionDemo() {
  const [status, setStatus] = useState<'online' | 'starting' | 'offline'>('online');

  return (
    <div className="flex h-48 items-start justify-center p-8">
      <FloatingMenu
        ariaLabel="Server status selector"
        value={status}
        onChange={setStatus}
        options={[
          {
            value: 'online',
            label: 'Online',
            indicatorClassName: 'bg-emerald-500',
          },
          {
            value: 'starting',
            label: 'Starting',
            indicatorClassName: 'bg-amber-500',
          },
          {
            value: 'offline',
            label: 'Offline',
            indicatorClassName: 'bg-rose-500',
          },
        ]}
      />
    </div>
  );
}

export const FloatingStatusSelect: StoryObj = {
  render: () => <FloatingSelectionDemo />,
};
