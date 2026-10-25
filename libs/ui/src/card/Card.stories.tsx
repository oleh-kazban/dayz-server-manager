import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import {
  Activity,
  ArrowUpCircle,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Download,
  HardDrive,
  Layers,
  Network,
  RotateCw,
} from 'lucide-react';

import { Button } from '../button';
import { StatusTag } from '../status-tag';
import { Tag } from '../tag';
import { Toggle } from '../toggle';

import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title',
    },
    subtitle: {
      control: 'text',
      description: 'Optional card subtitle',
    },
    titleLevel: {
      control: 'select',
      options: ['h2', 'h3', 'h4', 'h5'],
      description: 'Semantic heading element for card title',
    },
    as: {
      control: 'select',
      options: ['div', 'section', 'article'],
      description: 'Semantic HTML container element',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Card>;

/* ====================================================================
   BASIC STORIES
   ==================================================================== */

export const HeaderlessContent: Story = {
  args: {
    children: (
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">Active Players</span>
          <p className="text-2xl font-bold text-[var(--color-text-main)] mt-1">48 / 60</p>
        </div>
        <StatusTag status="success">Optimal</StatusTag>
      </div>
    ),
  },
  render: args => (
    <div className="w-[300px]">
      <Card {...args} />
    </div>
  ),
};

export const Default: Story = {
  args: {
    title: 'Server Information',
    subtitle: 'Primary dedicated instance telemetry',
    children: (
      <div className="text-xs text-[var(--color-text-secondary)] space-y-2">
        <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-muted)]">Server Name</span>
          <span className="font-medium text-[var(--color-text-main)]">Outlive PvE Chernarus</span>
        </div>
        <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-muted)]">Address</span>
          <span className="font-mono text-[var(--color-text-main)]">185.38.151.42:2302</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-[var(--color-text-muted)]">Game Version</span>
          <span className="font-mono text-[var(--color-text-main)]">1.26.159040</span>
        </div>
      </div>
    ),
  },
  render: args => (
    <div className="w-[420px]">
      <Card {...args} />
    </div>
  ),
};

export const WithHeaderActionsAndFooter: Story = {
  args: {
    title: 'Player activity',
    subtitle: 'A living world, around the clock',
    actions: (
      <Button variant="secondary" rightIcon={ChevronDown}>
        Last 24 hours
      </Button>
    ),
    footer: <span>Data aggregated every 5 minutes from BattlEye telemetry</span>,
    children: (
      <div className="h-32 flex items-center justify-center rounded-xl bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
        Telemetry graph placeholder
      </div>
    ),
  },
  render: args => (
    <div className="w-[500px]">
      <Card {...args} />
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 1: SERVER LOGS CARD
   ==================================================================== */

function ServerLogsShowcaseDemo() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="w-[620px]">
      <Card
        title="Server logs"
        actions={
          <div className="flex items-center gap-3">
            <Toggle label="Auto-scroll" defaultChecked labelPosition="left" />
            <Button variant="secondary" leftIcon={Download}>
              Export
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Subheader Filters & Stream Status */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1.5">
              {['All', 'Info', 'Warning', 'Error'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeFilter === f
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live stream · 6 new entries</span>
            </div>
          </div>

          {/* Framed Log Output */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] font-mono text-[11px] text-[var(--color-text-secondary)] space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:32:18</span>
              <Tag variant="subtle" color="info" uppercase mono>
                INFO
              </Tag>
              <span>Player &quot;Wolfpack&quot; connected (Steam: …3812)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:32:16</span>
              <Tag variant="subtle" color="info" uppercase mono>
                INFO
              </Tag>
              <span>BattlEye client verified · Session authorized</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:28:04</span>
              <Tag variant="subtle" color="success" uppercase mono>
                SAVE
              </Tag>
              <span>World persistence saved successfully (1.42s)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:24:00</span>
              <Tag variant="subtle" color="info" uppercase mono>
                INFO
              </Tag>
              <span>Backup complete → chernarus_2026-10-20_1424</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:20:31</span>
              <Tag variant="subtle" color="warning" uppercase mono>
                WARN
              </Tag>
              <span>Player &quot;Rook&quot; high latency detected (182 ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-muted)]">14:18:02</span>
              <Tag variant="subtle" color="info" uppercase mono>
                INFO
              </Tag>
              <span>Scheduled restart in 3h 42m · Players notified</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const ServerLogsShowcase: Story = {
  name: 'Server Logs Card (Screenshot 1)',
  render: () => <ServerLogsShowcaseDemo />,
};

/* ====================================================================
   SCREENSHOT 2: INSTALLED MODS CARD
   ==================================================================== */

export const InstalledModsShowcase: Story = {
  name: 'Installed Mods Card (Screenshot 2)',
  render: () => (
    <div className="w-[380px]">
      <Card
        title="Installed mods"
        actions={
          <Button variant="text" rightIcon={ArrowUpRight}>
            Manage
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[var(--color-text-muted)]">12 active mods</span>
            <StatusTag status="warning">1 update available</StatusTag>
          </div>

          <div className="space-y-3">
            {/* Mod 1 */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-main)]">
                    CF - Community Framework
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    v1.0.468
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>

            {/* Mod 2 */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-main)]">
                    Community Online Tools
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    v1.26.0
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>

            {/* Mod 3 (Update Available) */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-main)]">
                    DayZ Expansion
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    v1.9.40
                  </div>
                </div>
              </div>
              <ArrowUpCircle className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 3: SERVER PERFORMANCE CARD
   ==================================================================== */

export const ServerPerformanceShowcase: Story = {
  name: 'Server Performance Card (Screenshot 3)',
  render: () => (
    <div className="w-[480px]">
      <Card
        title="Server performance"
        actions={
          <StatusTag status="success" shape="pill">
            Healthy
          </StatusTag>
        }
      >
        <div className="grid grid-cols-12 gap-5 items-center">
          {/* Gauge Widget */}
          <div className="col-span-5 flex flex-col items-center justify-center text-center border-r border-[var(--color-border)] pr-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Circular gauge */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-[var(--color-border-subtle)]"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#27a88c"
                  strokeWidth="3.2"
                  strokeDasharray="88"
                  strokeDashoffset="72"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[var(--color-text-main)]">18%</span>
                <span className="text-[9px] text-[var(--color-text-muted)] uppercase">
                  CPU usage
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[var(--color-text-secondary)] mt-2">
              AMD Ryzen 9 7950X
            </div>
          </div>

          {/* Metrics breakdown */}
          <div className="col-span-7 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pb-1">
              <span>Live thread stability</span>
              <Activity className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--color-text-main)]">
                <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <Cpu className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Memory
                </span>
                <span className="font-mono text-[11px]">5.4 / 16 GB</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full w-[34%]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--color-text-main)]">
                <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <HardDrive className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Storage
                </span>
                <span className="font-mono text-[11px]">42 / 200 GB</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full w-[21%]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--color-text-main)]">
                <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <Network className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Network
                </span>
                <span className="font-mono text-[11px]">1.2 GB/h</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full w-[15%]" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 4: PLAYER ACTIVITY CARD
   ==================================================================== */

export const PlayerActivityShowcase: Story = {
  name: 'Player Activity Card (Screenshot 4)',
  render: () => (
    <div className="w-[580px]">
      <Card
        title="Player activity"
        subtitle="A living world, around the clock"
        actions={
          <Button variant="secondary" rightIcon={ChevronDown}>
            Last 24 hours
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Series Legend */}
          <div className="flex items-center gap-5 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              <span>Online players</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Unique players</span>
            </div>
          </div>

          {/* SVG Wave Chart */}
          <div className="h-32 w-full relative">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4279e8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4279e8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 Q100,60 200,45 T350,30 T500,20 L500,100 L0,100 Z"
                fill="url(#blueGradient)"
              />
              <path
                d="M0,80 Q100,60 200,45 T350,30 T500,20"
                fill="none"
                stroke="#4279e8"
                strokeWidth="2.5"
              />
              <path
                d="M0,90 Q120,85 240,82 T380,78 T500,75"
                fill="none"
                stroke="#27a88c"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Time scale */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:59</span>
          </div>
        </div>
      </Card>
    </div>
  ),
};

/* ====================================================================
   SCREENSHOT 5: PLAYERS BY REGION (WITH FOOTER)
   ==================================================================== */

export const PlayersByRegionShowcase: Story = {
  name: 'Players By Region Card with Footer (Screenshot 5)',
  render: () => (
    <div className="w-[360px]">
      <Card
        title="Players by region"
        subtitle="Current player distribution"
        actions={<span className="text-xs font-semibold text-[var(--color-text-muted)]">Live</span>}
        footer={<span>Connected from 14 countries</span>}
      >
        <div className="flex items-center gap-6 py-2">
          {/* Donut Chart */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#e2ecf3" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#4279e8"
                strokeWidth="4"
                strokeDasharray="88"
                strokeDashoffset="37"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#73c5b1"
                strokeWidth="4"
                strokeDasharray="88"
                strokeDashoffset="76"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[var(--color-text-main)]">48</span>
              <span className="text-[9px] text-[var(--color-text-muted)]">players online</span>
            </div>
          </div>

          {/* Region Table breakdown */}
          <div className="flex-1 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[#4279e8]" />
                Europe
              </span>
              <span className="font-semibold text-[var(--color-text-main)]">58%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[#91b2f4]" />
                North America
              </span>
              <span className="font-semibold text-[var(--color-text-main)]">23%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[#73c5b1]" />
                Asia Pacific
              </span>
              <span className="font-semibold text-[var(--color-text-main)]">13%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[#d8e4f2]" />
                Other
              </span>
              <span className="font-semibold text-[var(--color-text-main)]">6%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  ),
};
