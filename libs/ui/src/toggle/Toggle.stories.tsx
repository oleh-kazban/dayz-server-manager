import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play } from 'lucide-react';

import { Button } from '../button';

import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Controlled checked state of the toggle switch',
    },
    defaultChecked: {
      control: 'boolean',
      description: 'Initial state for uncontrolled usage',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Visual scale of the toggle switch',
    },
    color: {
      control: 'select',
      options: ['primary', 'success', 'danger'],
      description: 'Active track color',
    },
    labelPosition: {
      control: 'radio',
      options: ['left', 'right'],
      description: 'Placement of the label relative to the switch',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables user interactions and dims opacity',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Toggle>;

/* ====================================================================
   BASIC STORIES
   ==================================================================== */

export const AutoScroll: Story = {
  name: 'Auto-scroll (Screenshot Recreation)',
  args: {
    label: 'Auto-scroll',
    defaultChecked: true,
    labelPosition: 'left',
    size: 'md',
  },
};

function ControlledInteractiveDemo() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-sm w-full">
      <div className="flex items-center justify-between">
        <Toggle
          label="Auto-scroll"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          labelPosition="left"
        />
        <span className="text-xs text-[var(--color-text-muted)] font-mono">
          State: {enabled ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}

export const ControlledInteractive: Story = {
  name: 'Interactive Controlled',
  render: () => <ControlledInteractiveDemo />,
};

export const LabelPositions: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle label="Label on the left" labelPosition="left" defaultChecked />
      <Toggle label="Label on the right" labelPosition="right" defaultChecked />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle size="sm" label="Small (28x16)" defaultChecked />
      <Toggle size="md" label="Medium (32x18 - Default)" defaultChecked />
      <Toggle size="lg" label="Large (44x24)" defaultChecked />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle color="primary" label="Primary (Brand Blue)" defaultChecked />
      <Toggle color="success" label="Success (Emerald)" defaultChecked />
      <Toggle color="danger" label="Danger (Rose)" defaultChecked />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-4 p-4 max-w-md">
      <Toggle
        label="Enforce Whitelist"
        description="Only pre-approved Steam IDs can join during maintenance windows."
        labelPosition="right"
        defaultChecked
      />
      <Toggle
        label="BattlEye RCON Shutdown Protection"
        description="Gracefully sends #shutdown before terminating server process to avoid rollback."
        labelPosition="right"
        defaultChecked
      />
    </div>
  ),
};

export const DisabledStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle label="Disabled (Active)" defaultChecked disabled />
      <Toggle label="Disabled (Inactive)" disabled />
    </div>
  ),
};

/* ====================================================================
   LOG STREAM HEADER SHOWCASE (As seen in Server Manager & Dashboard)
   ==================================================================== */

function LogStreamShowcaseDemo() {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-xl w-full">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Server Logs</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Live telemetry and player session stream.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Toggle
            label="Auto-scroll"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            labelPosition="left"
            size="md"
          />

          <Button
            variant="secondary"
            size="sm"
            leftIcon={isPaused ? Play : Pause}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] font-mono text-xs text-[var(--color-text-secondary)] space-y-1">
        <div>[14:32:18] INFO Connection · Player &quot;Wolfpack&quot; connected (Steam: …3812)</div>
        <div>[14:32:16] INFO BattlEye · Client verified · session authorized</div>
        <div>[14:31:52] SAVE Persistence · World persistence saved (1.42s)</div>
        {autoScroll && (
          <div className="text-[10px] text-emerald-500 font-sans pt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-scroll active · streaming newest lines</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const LogStreamHeaderShowcase: Story = {
  name: 'Log Stream Controls Showcase',
  render: () => <LogStreamShowcaseDemo />,
};
