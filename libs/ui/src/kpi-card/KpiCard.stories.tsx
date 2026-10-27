import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity, Cpu, HardDrive, Radio, UserCheck, Users, Wifi } from 'lucide-react';

import { KpiCard } from './KpiCard';

const meta: Meta<typeof KpiCard> = {
  title: 'Components/KpiCard',
  component: KpiCard,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Metric title / label',
    },
    value: {
      control: 'text',
      description: 'Primary metric value',
    },
    unit: {
      control: 'text',
      description: 'Unit or capacity suffix',
    },
    delta: {
      control: 'text',
      description: 'Trend context or delta text',
    },
    trend: {
      control: 'select',
      options: ['positive', 'negative', 'warning', 'neutral'],
      description: 'Semantic trend indicator',
    },
    isLoading: {
      control: 'boolean',
      description: 'Layout-stable loading skeleton',
    },
  },
};

export default meta;

type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {
  args: {
    label: 'Players online',
    value: '48',
    unit: '/ 60',
    delta: '↗ 12 players from yesterday',
    trend: 'positive',
    sparkline: [20, 24, 28, 25, 32, 40, 48],
    icon: <Users aria-hidden="true" className="w-4 h-4" />,
  },
  render: args => (
    <div className="max-w-xs">
      <KpiCard {...args} />
    </div>
  ),
};

export const DashboardRow: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      <KpiCard
        label="Players online"
        icon={<Users aria-hidden="true" className="w-4 h-4" />}
        value={48}
        unit="/ 60"
        delta="↗ 12 players from yesterday"
        trend="positive"
        sparkline={[15, 20, 25, 22, 35, 42, 48]}
      />
      <KpiCard
        label="Average latency"
        icon={<Radio aria-hidden="true" className="w-4 h-4" />}
        value={38}
        unit="ms"
        delta="↘ 6 ms from yesterday"
        trend="positive"
        sparkline={[55, 48, 44, 42, 39, 41, 38]}
      />
      <KpiCard
        label="Server FPS"
        icon={<Activity aria-hidden="true" className="w-4 h-4" />}
        value="59.8"
        unit="/ 60"
        delta="Stable · Optimal performance"
        trend="positive"
        sparkline={[60, 58, 60, 59, 60, 59, 60]}
      />
      <KpiCard
        label="Unique players"
        icon={<UserCheck aria-hidden="true" className="w-4 h-4" />}
        value="1,284"
        delta="↗ 8.2% in the last 7 days"
        trend="positive"
        sparkline={[980, 1020, 1100, 1150, 1210, 1250, 1284]}
      />
    </div>
  ),
};

export const TrendVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      <KpiCard
        label="CPU Load"
        icon={<Cpu aria-hidden="true" className="w-4 h-4" />}
        value="42%"
        delta="↘ 5% load reduction"
        trend="positive"
        sparkline={[65, 58, 52, 48, 45, 42]}
      />
      <KpiCard
        label="Memory Usage"
        icon={<HardDrive aria-hidden="true" className="w-4 h-4" />}
        value="88%"
        unit="14.1 GB"
        delta="↗ High allocation warning"
        trend="warning"
        sparkline={[50, 60, 65, 75, 82, 88]}
      />
      <KpiCard
        label="Packet Loss"
        icon={<Wifi aria-hidden="true" className="w-4 h-4" />}
        value="4.8%"
        delta="↗ Elevated drops detected"
        trend="negative"
        sparkline={[0.2, 0.4, 0.8, 1.5, 3.2, 4.8]}
      />
      <KpiCard
        label="Tick Rate"
        icon={<Activity aria-hidden="true" className="w-4 h-4" />}
        value="100.0"
        unit="Hz"
        delta="Nominal lockstep rate"
        trend="neutral"
        sparkline={[100, 100, 100, 100, 100, 100]}
      />
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      <KpiCard isLoading />
      <KpiCard isLoading />
      <KpiCard isLoading />
      <KpiCard isLoading />
    </div>
  ),
};

export const SlotComposition: Story = {
  render: () => (
    <div className="max-w-xs">
      <KpiCard>
        <KpiCard.Header>
          <KpiCard.Label>Custom Telemetry</KpiCard.Label>
          <Activity aria-hidden="true" className="w-4 h-4 text-emerald-400" />
        </KpiCard.Header>
        <KpiCard.Body>
          <div>
            <KpiCard.Value unit="req/s">2.4k</KpiCard.Value>
            <KpiCard.Delta trend="positive">↗ 14% peak throughput</KpiCard.Delta>
          </div>
          <KpiCard.Sparkline data={[1200, 1400, 1800, 2100, 2400]} />
        </KpiCard.Body>
      </KpiCard>
    </div>
  ),
};
