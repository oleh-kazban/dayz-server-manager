import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Globe } from 'lucide-react';

import { FloatingMenu } from './FloatingMenu';

const meta: Meta<typeof FloatingMenu> = {
  title: 'Navigation/FloatingMenu',
  component: FloatingMenu,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

function StatusSelectionDemo() {
  const [status, setStatus] = useState<'online' | 'starting' | 'offline'>('online');

  return (
    <div className="flex h-56 flex-col items-center justify-start gap-4 p-8">
      <FloatingMenu
        ariaLabel="Server status selector"
        value={status}
        onChange={setStatus}
        options={[
          {
            value: 'online',
            label: 'Online',
            indicatorClassName: 'bg-[var(--color-status-success)]',
          },
          {
            value: 'starting',
            label: 'Starting',
            indicatorClassName: 'bg-[var(--color-status-warning)]',
          },
          {
            value: 'offline',
            label: 'Offline',
            indicatorClassName: 'bg-[var(--color-status-danger)]',
          },
        ]}
      />
      <span className="text-xs text-[var(--color-text-muted)]">
        Active status: <span className="font-semibold text-[var(--color-text-main)]">{status}</span>
      </span>
    </div>
  );
}

export const StatusSelector: StoryObj = {
  render: () => <StatusSelectionDemo />,
};

function RegionSelectionDemo() {
  const [region, setRegion] = useState('frankfurt');

  return (
    <div className="flex h-56 flex-col items-center justify-start gap-4 p-8">
      <FloatingMenu
        ariaLabel="Server region"
        value={region}
        onChange={setRegion}
        options={[
          {
            value: 'frankfurt',
            label: 'Frankfurt (EU-Central)',
            icon: <Globe className="h-3.5 w-3.5 text-[var(--color-primary)]" />,
          },
          {
            value: 'ashburn',
            label: 'Ashburn (US-East)',
            icon: <Globe className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />,
          },
          {
            value: 'singapore',
            label: 'Singapore (AP-East)',
            icon: <Globe className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />,
          },
        ]}
      />
    </div>
  );
}

export const WithIcons: StoryObj = {
  render: () => <RegionSelectionDemo />,
};

export const Disabled: StoryObj = {
  render: () => (
    <div className="flex h-56 items-start justify-center p-8">
      <FloatingMenu
        disabled
        ariaLabel="Disabled server selector"
        value="locked"
        onChange={() => undefined}
        options={[
          {
            value: 'locked',
            label: 'Production Cluster (Locked)',
            indicatorClassName: 'bg-[var(--color-status-danger)]',
          },
        ]}
      />
    </div>
  ),
};
