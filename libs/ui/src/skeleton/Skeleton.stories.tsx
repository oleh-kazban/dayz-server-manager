import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: 'Shape variant of the skeleton placeholder',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'Animation style',
    },
    lines: {
      control: 'number',
      description: 'Number of lines for variant="text"',
    },
    width: {
      control: 'text',
      description: 'Explicit width override',
    },
    height: {
      control: 'text',
      description: 'Explicit height override',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    variant: 'text',
    animation: 'pulse',
    width: '280px',
  },
  render: args => (
    <div className="w-80">
      <Skeleton {...args} />
    </div>
  ),
};

export const Paragraph: Story = {
  render: () => (
    <div className="w-96 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <Skeleton variant="text" lines={4} />
    </div>
  ),
};

export const ShapeVariants: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="circular" width={48} height={48} />
        <span className="text-[11px] text-[var(--color-text-muted)]">Circular</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="rounded" width={80} height={48} />
        <span className="text-[11px] text-[var(--color-text-muted)]">Rounded (Card)</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="rectangular" width={80} height={48} />
        <span className="text-[11px] text-[var(--color-text-muted)]">Rectangular</span>
      </div>

      <div className="flex flex-col items-center gap-2 w-36">
        <Skeleton variant="text" width="100%" height={16} />
        <span className="text-[11px] text-[var(--color-text-muted)]">Text</span>
      </div>
    </div>
  ),
};

export const WaveAnimation: Story = {
  render: () => (
    <div className="w-96 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} animation="wave" />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" width="60%" height={16} animation="wave" />
          <Skeleton variant="text" width="40%" height={12} animation="wave" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} animation="wave" />
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: () => (
    <div className="w-80 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={42} height={42} />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" width="70%" height={14} />
          <Skeleton variant="text" width="45%" height={12} />
        </div>
      </div>

      <Skeleton variant="rounded" width="100%" height={120} />

      <Skeleton variant="text" lines={3} />

      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={96} height={32} />
      </div>
    </div>
  ),
};

export const TablePlaceholder: Story = {
  render: () => (
    <div className="w-[500px] p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <Skeleton variant="text" width="30%" height={14} />
        <Skeleton variant="text" width="20%" height={14} />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-3 w-3/5">
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="80%" height={14} />
          </div>
          <Skeleton variant="text" width="20%" height={14} />
        </div>
      ))}
    </div>
  ),
};
