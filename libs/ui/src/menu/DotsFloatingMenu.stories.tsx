import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download, Power, RefreshCw, Sliders, Trash2 } from 'lucide-react';

import { DotsFloatingMenu } from './DotsFloatingMenu';

const meta: Meta<typeof DotsFloatingMenu> = {
  title: 'Navigation/DotsFloatingMenu',
  component: DotsFloatingMenu,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const DefaultActionMenu: StoryObj = {
  render: () => (
    <div className="flex h-56 items-start justify-center p-8">
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
            icon: <Power className="h-3.5 w-3.5 text-[var(--color-status-warning)]" />,
            onSelect: () => console.log('Force kill clicked'),
          },
          {
            label: 'Delete Instance',
            icon: <Trash2 className="h-3.5 w-3.5 text-[var(--color-status-danger)]" />,
            destructive: true,
            onSelect: () => console.log('Delete clicked'),
          },
        ]}
      />
    </div>
  ),
};

export const CustomTriggerIcon: StoryObj = {
  render: () => (
    <div className="flex h-56 items-start justify-center p-8">
      <DotsFloatingMenu
        ariaLabel="Filter settings"
        icon={<Sliders className="h-4 w-4" />}
        options={[
          {
            label: 'Show Only Active Players',
            onSelect: () => console.log('Filter active'),
          },
          {
            label: 'Show Empty Servers',
            onSelect: () => console.log('Filter empty'),
          },
          {
            label: 'Reset Filters',
            disabled: true,
            onSelect: () => console.log('Reset'),
          },
        ]}
      />
    </div>
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <div className="flex h-56 items-start justify-center p-8">
      <DotsFloatingMenu
        disabled
        ariaLabel="Disabled server actions"
        options={[
          {
            label: 'View Details',
            onSelect: () => console.log('View'),
          },
        ]}
      />
    </div>
  ),
};
