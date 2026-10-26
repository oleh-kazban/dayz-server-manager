import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUpRight } from 'lucide-react';

import { StatusTag } from './StatusTag';

const meta: Meta<typeof StatusTag> = {
  title: 'Components/StatusTag',
  component: StatusTag,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: [
        'online',
        'offline',
        'restarting',
        'success',
        'warning',
        'danger',
        'info',
        'neutral',
        'primary',
      ],
      description: 'Semantic state token or DayZ domain lifecycle status',
    },
    variant: {
      control: 'select',
      options: ['subtle', 'solid', 'outline'],
      description: 'Visual stylistic variant',
    },
    shape: {
      control: 'select',
      options: ['rounded', 'pill'],
      description: 'Border radius shape',
    },
    ping: {
      control: 'boolean',
      description: 'Enables radar pulsating ring animation',
    },
    uppercase: {
      control: 'boolean',
      description: 'Transforms text to uppercase tracking-wider',
    },
    mono: {
      control: 'boolean',
      description: 'Applies monospace font',
    },
  },
  args: {
    status: 'success',
    variant: 'subtle',
    shape: 'rounded',
    ping: false,
    children: 'Online',
  },
};

export default meta;

type Story = StoryObj<typeof StatusTag>;

/* ====================================================================
   BASIC STORIES
   ==================================================================== */

export const Default: Story = {
  args: {
    status: 'success',
    children: 'Online',
    variant: 'subtle',
  },
};

export const LivePing: Story = {
  args: {
    status: 'danger',
    children: 'Crashed',
    variant: 'solid',
    shape: 'pill',
    ping: true,
  },
};

export const WithIcon: Story = {
  args: {
    status: 'primary',
    children: 'Connected',
    variant: 'outline',
    rightIcon: ArrowUpRight,
  },
};

/* ====================================================================
   SHOWCASE 1: OPERATIONAL TELEMETRY SHOWCASE
   ==================================================================== */

export const OperationalLifecycleShowcase: Story = {
  name: 'Operational Telemetry Showcase',
  render: () => (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 max-w-md w-full">
      <div>
        <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          SERVER LIFECYCLE MONITOR
        </h4>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
          Real-time server instances governed by semantic telemetry states.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Chernarus EU #1
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Port: 2302 · PID 49102
            </span>
          </div>
          <StatusTag status="success" ping>
            Online
          </StatusTag>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Livonia Hardcore
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Steam Workshop update pending
            </span>
          </div>
          <StatusTag status="warning" ping>
            Updating
          </StatusTag>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Namalsk Survival
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Exit code: 0xC0000005
            </span>
          </div>
          <StatusTag status="danger" variant="solid" ping>
            Crashed
          </StatusTag>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Stary Sobor Staging
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              World persistence syncing
            </span>
          </div>
          <StatusTag status="info">Syncing</StatusTag>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Custom Dev Sandbox
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Admin maintenance mode
            </span>
          </div>
          <StatusTag status="neutral">Standby</StatusTag>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   SHOWCASE 2: TACTICAL RADAR PILLS (Simulated GPS Pins)
   ==================================================================== */

export const TacticalRadarShowcase: Story = {
  name: 'Tactical Radar GPS Markers',
  render: () => (
    <div className="p-8 rounded-2xl border border-zinc-800 bg-[#141b16] space-y-6 max-w-sm w-full text-white">
      <div className="text-xs text-zinc-400">Tactical Radar / GPS Player Badges</div>

      <div className="space-y-4">
        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Stary Sobor</div>
          <StatusTag status="primary" variant="solid" shape="pill" ping>
            Wolfpack
          </StatusTag>
        </div>

        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Chernogorsk</div>
          <StatusTag status="success" variant="solid" shape="pill">
            TheWanderer
          </StatusTag>
        </div>

        <div>
          <div className="text-[11px] text-zinc-400 font-semibold mb-1">Elektrozavodsk</div>
          <StatusTag status="success" variant="solid" shape="pill">
            Rook
          </StatusTag>
        </div>
      </div>
    </div>
  ),
};

/* ====================================================================
   VARIANTS GALLERY
   ==================================================================== */

export const AllStatusesAndVariants: Story = {
  render: () => (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Subtle (Default)
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusTag status="success">Success</StatusTag>
          <StatusTag status="warning">Warning</StatusTag>
          <StatusTag status="danger">Danger</StatusTag>
          <StatusTag status="info">Info</StatusTag>
          <StatusTag status="neutral">Neutral</StatusTag>
          <StatusTag status="primary">Primary</StatusTag>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Solid</div>
        <div className="flex flex-wrap gap-2">
          <StatusTag status="success" variant="solid">
            Success
          </StatusTag>
          <StatusTag status="warning" variant="solid">
            Warning
          </StatusTag>
          <StatusTag status="danger" variant="solid">
            Danger
          </StatusTag>
          <StatusTag status="info" variant="solid">
            Info
          </StatusTag>
          <StatusTag status="neutral" variant="solid">
            Neutral
          </StatusTag>
          <StatusTag status="primary" variant="solid">
            Primary
          </StatusTag>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">Outline</div>
        <div className="flex flex-wrap gap-2">
          <StatusTag status="success" variant="outline">
            Success
          </StatusTag>
          <StatusTag status="warning" variant="outline">
            Warning
          </StatusTag>
          <StatusTag status="danger" variant="outline">
            Danger
          </StatusTag>
          <StatusTag status="info" variant="outline">
            Info
          </StatusTag>
          <StatusTag status="neutral" variant="outline">
            Neutral
          </StatusTag>
          <StatusTag status="primary" variant="outline">
            Primary
          </StatusTag>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Pill Silhouette with Radar Ping
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusTag status="success" shape="pill" ping>
            Active (ping)
          </StatusTag>
          <StatusTag status="warning" shape="pill" ping>
            Degraded (ping)
          </StatusTag>
          <StatusTag status="danger" shape="pill" ping>
            Failed (ping)
          </StatusTag>
          <StatusTag status="primary" shape="pill" ping>
            Tracked (ping)
          </StatusTag>
        </div>
      </div>
    </div>
  ),
};

export const DayZDomainLifecycle: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
        DayZ Dedicated Server Telemetry Aliases (Auto-Labels &amp; Status Mappings)
      </div>
      <div className="flex items-center gap-3">
        <StatusTag status="online" />
        <StatusTag status="restarting" />
        <StatusTag status="offline" />
        <StatusTag status="stopped" />
      </div>
      <div className="text-xs font-semibold text-[var(--color-text-secondary)] mt-2">
        With Telemetry Metrics (Custom Children)
      </div>
      <div className="flex items-center gap-3">
        <StatusTag status="online">Chernarus #1 · 58/60 (59.8 FPS)</StatusTag>
        <StatusTag status="restarting">Rebooting in 30s</StatusTag>
        <StatusTag status="offline">Maintenance</StatusTag>
        <StatusTag status="stopped">Stopped</StatusTag>
      </div>
    </div>
  ),
};
