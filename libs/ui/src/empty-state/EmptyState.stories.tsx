import type { Meta, StoryObj } from '@storybook/react-vite';
import { Archive, Database, Plus, RefreshCw, RotateCcw, Search, Users } from 'lucide-react';

import { Button } from '../button';

import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Primary title or headline',
    },
    description: {
      control: 'text',
      description: 'Supporting descriptive copy',
    },
    variant: {
      control: 'select',
      options: ['default', 'dashed', 'compact'],
      description: 'Visual framing style',
    },
    titleAs: {
      control: 'select',
      options: ['h2', 'h3', 'h4', 'h5'],
      description: 'Semantic heading element',
    },
  },
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: 'No survivors online',
    description:
      'The server is currently running with 0 active connections. Players will appear here once they connect.',
    variant: 'default',
    icon: <Users aria-hidden="true" className="w-5 h-5 text-[var(--color-text-muted)]" />,
  },
  render: args => (
    <div className="w-[480px] p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <EmptyState
        {...args}
        action={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />}
          >
            Refresh session list
          </Button>
        }
      />
    </div>
  ),
};

export const FilteredSearch: Story = {
  render: () => (
    <div className="w-[520px] p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <EmptyState
        icon={<Search aria-hidden="true" className="w-5 h-5 text-[var(--color-text-muted)]" />}
        title="No matching items found"
        description="We couldn't find any items matching 'M4A1_Camo' in the current economy catalog. Check spelling or clear active filters."
        action={
          <Button
            variant="secondary"
            leftIcon={<RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />}
          >
            Reset all filters
          </Button>
        }
      />
    </div>
  ),
};

export const DashedContainer: Story = {
  render: () => (
    <div className="w-[560px]">
      <EmptyState
        variant="dashed"
        icon={<Archive aria-hidden="true" className="w-6 h-6 text-[var(--color-primary)]" />}
        title="No server snapshots yet"
        description="Protect your world state and economy configurations. Automated backups can be scheduled or triggered manually before applying mods."
        action={
          <Button variant="primary" leftIcon={<Plus aria-hidden="true" className="w-3.5 h-3.5" />}>
            Create first backup
          </Button>
        }
      />
    </div>
  ),
};

export const CompactWidget: Story = {
  render: () => (
    <div className="w-72 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <div className="text-xs font-semibold text-[var(--color-text-main)] mb-2">
        Recent RCON Events
      </div>
      <EmptyState
        variant="compact"
        icon={<Database aria-hidden="true" className="w-4 h-4 text-[var(--color-text-muted)]" />}
        title="No recent events"
        description="RCON log stream is clear."
      />
    </div>
  ),
};

export const SlotBasedComposition: Story = {
  render: () => (
    <div className="w-[480px] p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <EmptyState>
        <EmptyState.Icon>
          <Users aria-hidden="true" className="w-5 h-5 text-indigo-400" />
        </EmptyState.Icon>
        <EmptyState.Title as="h2">Custom Slot Heading</EmptyState.Title>
        <EmptyState.Description>
          Assembled entirely with compound subcomponents for customized layouts and arbitrary
          content slots.
        </EmptyState.Description>
        <EmptyState.Actions>
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
        </EmptyState.Actions>
      </EmptyState>
    </div>
  ),
};
