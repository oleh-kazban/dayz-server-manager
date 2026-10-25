import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play } from 'lucide-react';

import { Button } from '../button';

import { Toggle, type ToggleProps } from './Toggle';

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
  args: {
    disabled: false,
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
    disabled: false,
  },
};

function ControlledInteractiveDemo(props: Partial<ToggleProps>) {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-sm w-full">
      <div className="flex items-center justify-between">
        <Toggle
          label="Auto-scroll"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          labelPosition="left"
          disabled={props.disabled}
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
  render: args => <ControlledInteractiveDemo {...args} />,
};

export const LabelPositions: Story = {
  render: args => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle
        label="Label on the left"
        labelPosition="left"
        defaultChecked
        disabled={args.disabled}
      />
      <Toggle
        label="Label on the right"
        labelPosition="right"
        defaultChecked
        disabled={args.disabled}
      />
    </div>
  ),
};

export const Colors: Story = {
  render: args => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle
        color="primary"
        label="Primary (Brand Blue)"
        defaultChecked
        disabled={args.disabled}
      />
      <Toggle
        color="success"
        label="Success (Status Success)"
        defaultChecked
        disabled={args.disabled}
      />
      <Toggle
        color="danger"
        label="Danger (Status Danger)"
        defaultChecked
        disabled={args.disabled}
      />
    </div>
  ),
};

export const WithDescription: Story = {
  render: args => (
    <div className="space-y-4 p-4 max-w-md">
      <Toggle
        label="Enforce Whitelist"
        description="Only pre-approved Steam IDs can join during maintenance windows."
        labelPosition="right"
        defaultChecked
        disabled={args.disabled}
      />
      <Toggle
        label="BattlEye RCON Shutdown Protection"
        description="Gracefully sends #shutdown before terminating server process to avoid rollback."
        labelPosition="right"
        defaultChecked
        disabled={args.disabled}
      />
    </div>
  ),
};

export const DisabledStates: Story = {
  name: 'Disabled State Showcase',
  render: args => (
    <div className="flex flex-col gap-4 p-4">
      <Toggle
        label="Disabled (Active / Locked On)"
        defaultChecked
        disabled={args.disabled ?? true}
      />
      <Toggle label="Disabled (Inactive / Locked Off)" disabled={args.disabled ?? true} />
    </div>
  ),
  args: {
    disabled: true,
  },
};

/* ====================================================================
   LOG STREAM HEADER SHOWCASE (As seen in Server Manager & Dashboard)
   ==================================================================== */

function LogStreamShowcaseDemo(props: Partial<ToggleProps>) {
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
            disabled={props.disabled}
          />

          <Button
            variant="secondary"
            disabled={props.disabled}
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
          <div className="text-[10px] text-[var(--color-status-success)] font-sans pt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)] animate-pulse" />
            <span>Auto-scroll active · streaming newest lines</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const LogStreamHeaderShowcase: Story = {
  name: 'Log Stream Controls Showcase',
  render: args => <LogStreamShowcaseDemo {...args} />,
};

export const StandaloneSwitch: Story = {
  name: 'Standalone (Icon-only / aria-label)',
  render: args => (
    <div className="flex items-center gap-4 p-4">
      <Toggle ariaLabel="Toggle night acceleration" defaultChecked disabled={args.disabled} />
      <span className="text-xs text-[var(--color-text-muted)]">
        Standalone toggle without visual label (accessible via aria-label)
      </span>
    </div>
  ),
};
