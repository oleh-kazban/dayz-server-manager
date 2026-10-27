import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  FileText,
  Server,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

import { Card } from '../card';

import { TabContent, TabList, Tabs, TabTrigger } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/* --------------------------------------------------------------------------
   STORIES
   -------------------------------------------------------------------------- */

export const SegmentedTypesEditor: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('all');

    return (
      <div className="space-y-4 max-w-xl">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="segmented"
          ariaLabel="Economy item filters"
          items={[
            { id: 'all', label: 'All items', count: '1,248' },
            { id: 'modified', label: 'Modified', count: 24 },
            { id: 'warnings', label: 'Warnings', count: 3 },
          ]}
        />
        <div className="text-xs text-[var(--color-text-muted)]">
          Active filter:{' '}
          <span className="font-semibold text-[var(--color-text-main)]">{activeTab}</span>
        </div>
      </div>
    );
  },
};

export const SegmentedServerLogs: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('all');

    return (
      <div className="space-y-4 max-w-xl">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="segmented"
          ariaLabel="Server log stream filters"
          items={[
            { id: 'all', label: 'All events', count: 248 },
            { id: 'info', label: 'Info', count: 231 },
            { id: 'warnings', label: 'Warnings', count: 16 },
            { id: 'errors', label: 'Errors', count: 1 },
          ]}
        />
      </div>
    );
  },
};

export const UnderlineNavigation: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
      <div className="space-y-6 max-w-2xl">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="underline"
          ariaLabel="Server management views"
          items={[
            { id: 'overview', label: 'Overview', icon: <Server className="w-3.5 h-3.5" /> },
            {
              id: 'players',
              label: 'Players',
              icon: <Users className="w-3.5 h-3.5" />,
              count: 48,
            },
            {
              id: 'telemetry',
              label: 'Telemetry',
              icon: <Activity className="w-3.5 h-3.5" />,
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings className="w-3.5 h-3.5" />,
            },
          ]}
        />
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-secondary)]">
          Current View:{' '}
          <strong className="text-[var(--color-text-main)] capitalize">{activeTab}</strong>
        </div>
      </div>
    );
  },
};

export const CompoundWithPanels: Story = {
  render: () => {
    const [selectedTab, setSelectedTab] = useState('general');

    return (
      <div className="max-w-xl">
        <Tabs value={selectedTab} onChange={setSelectedTab} variant="segmented">
          <TabList aria-label="Settings categories">
            <TabTrigger value="general" icon={<Settings className="w-3.5 h-3.5" />}>
              General
            </TabTrigger>
            <TabTrigger value="security" icon={<Shield className="w-3.5 h-3.5" />} count="BattlEye">
              Security
            </TabTrigger>
            <TabTrigger value="economy" icon={<FileText className="w-3.5 h-3.5" />} count={12}>
              Economy
            </TabTrigger>
          </TabList>

          <div className="pt-2">
            <TabContent value="general">
              <Card>
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--color-text-main)]">
                    General Settings
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Configure server title, public visibility, and player slots.
                  </p>
                </div>
              </Card>
            </TabContent>

            <TabContent value="security">
              <Card>
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--color-text-main)]">
                    Security & Anti-Cheat
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    BattlEye RCON credentials and Steam VAC enforcement rules.
                  </p>
                </div>
              </Card>
            </TabContent>

            <TabContent value="economy">
              <Card>
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--color-text-main)]">
                    Central Economy (CE)
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Types.xml spawn rates, nominal lifetime, and territory restock intervals.
                  </p>
                </div>
              </Card>
            </TabContent>
          </div>
        </Tabs>
      </div>
    );
  },
};

export const WithDisabledTab: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Tabs
        defaultValue="active"
        variant="segmented"
        ariaLabel="Permission tabs"
        items={[
          {
            id: 'active',
            label: 'Enabled Features',
            icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
          },
          {
            id: 'locked',
            label: 'Enterprise RCON',
            icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
            disabled: true,
            count: 'Pro',
          },
        ]}
      />
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-md p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <Tabs
        defaultValue="tab1"
        variant="segmented"
        fullWidth
        ariaLabel="Full width example"
        items={[
          { id: 'tab1', label: 'DayZ 1.26' },
          { id: 'tab2', label: 'Experimental' },
        ]}
      />
    </div>
  ),
};
