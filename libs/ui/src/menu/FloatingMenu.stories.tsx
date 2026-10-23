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
            icon: <Globe className="h-3.5 w-3.5 text-blue-500" />,
          },
          {
            value: 'singapore',
            label: 'Singapore (AP-East)',
            icon: <Globe className="h-3.5 w-3.5 text-purple-500" />,
          },
        ]}
      />
    </div>
  );
}

export const WithIcons: StoryObj = {
  render: () => <RegionSelectionDemo />,
};
