import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, HelpCircle, Power, RefreshCw, Terminal } from 'lucide-react';

import { Button } from '../button';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    content: {
      control: 'text',
      description: 'Tooltip microcopy text',
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Placement relative to trigger',
    },
    delay: {
      control: 'number',
      description: 'Hover intent delay in milliseconds',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the tooltip',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'Copies RCON server address to clipboard',
    placement: 'top',
    delay: 250,
  },
  render: args => (
    <Tooltip {...args}>
      <Button variant="secondary" leftIcon={<Copy aria-hidden="true" className="w-3.5 h-3.5" />}>
        Copy IP:Port
      </Button>
    </Tooltip>
  ),
};

export const Placements: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-12 p-8">
      <div className="flex items-center gap-6">
        <Tooltip content="Tooltip placed on Top" placement="top">
          <Button variant="secondary">Top</Button>
        </Tooltip>
        <Tooltip content="Tooltip placed on Bottom" placement="bottom">
          <Button variant="secondary">Bottom</Button>
        </Tooltip>
        <Tooltip content="Tooltip placed on Left" placement="left">
          <Button variant="secondary">Left</Button>
        </Tooltip>
        <Tooltip content="Tooltip placed on Right" placement="right">
          <Button variant="secondary">Right</Button>
        </Tooltip>
      </div>
    </div>
  ),
};

export const IconOnlyActions: Story = {
  render: () => (
    <div className="flex items-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
      <Tooltip content="Open BattlEye RCON Terminal (Ctrl+`)">
        <button
          type="button"
          aria-label="Open RCON Terminal"
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        >
          <Terminal aria-hidden="true" className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Graceful server restart (flushes persistence)">
        <button
          type="button"
          aria-label="Restart server"
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        >
          <RefreshCw aria-hidden="true" className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Stop server process">
        <button
          type="button"
          aria-label="Stop server"
          className="p-2 rounded-lg text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-light)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-status-danger)] cursor-pointer"
        >
          <Power aria-hidden="true" className="w-4 h-4" />
        </button>
      </Tooltip>

      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

      <Tooltip content="Documentation & RCON keybindings">
        <button
          type="button"
          aria-label="Documentation"
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        >
          <HelpCircle aria-hidden="true" className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  ),
};

export const ImmediateFocus: Story = {
  render: () => (
    <div className="space-y-3 max-w-sm text-center">
      <p className="text-xs text-[var(--color-text-muted)]">
        Press{' '}
        <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">Tab</kbd> to
        navigate. Notice tooltips appear immediately on focus without hover delay.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Tooltip content="First action tooltip">
          <Button variant="secondary">Tab 1</Button>
        </Tooltip>
        <Tooltip content="Second action tooltip">
          <Button variant="secondary">Tab 2</Button>
        </Tooltip>
      </div>
    </div>
  ),
};
