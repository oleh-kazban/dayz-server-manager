import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Database, Filter, Globe, HardDrive, Layers, Server, Shield } from 'lucide-react';

import { Select } from './Select';
import { type SelectOption } from './Select.types';

const MAP_OPTIONS: SelectOption[] = [
  {
    value: 'chernarusplus',
    label: 'Chernarusplus (Default)',
    description: 'Classic 225km² post-soviet terrain',
  },
  {
    value: 'enoch',
    label: 'Livonia (DLC)',
    description: '163km² dense forest & militarized zones',
  },
  { value: 'sakhal', label: 'Sakhal (Frostline)', description: 'Sub-zero volcanic archipelago' },
  {
    value: 'namalsk',
    label: 'Namalsk Island',
    description: 'Hardcore survival blizzard environment',
  },
  {
    value: 'takistan',
    label: 'Takistan Plus',
    description: 'Arid mountainous desert warfare',
    disabled: true,
  },
];

const BACKUP_FREQUENCY_OPTIONS: SelectOption[] = [
  { value: '15m', label: 'Every 15 minutes', badge: 'High I/O' },
  { value: '30m', label: 'Every 30 minutes', badge: 'Balanced' },
  { value: '1h', label: 'Every hour', badge: 'Recommended' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '24h', label: 'Daily at 04:00 UTC' },
];

const LOG_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'trace', label: 'TRACE', badge: 'Verbose' },
  { value: 'debug', label: 'DEBUG', badge: 'Dev' },
  { value: 'info', label: 'INFO', badge: 'Default' },
  { value: 'warn', label: 'WARN' },
  { value: 'error', label: 'ERROR' },
];

const meta: Meta<typeof Select> = {
  title: 'Forms/Select',
  component: Select,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    label: 'Target Mission Map',
    placeholder: 'Choose a DayZ map...',
    options: MAP_OPTIONS,
    containerClassName: 'max-w-md',
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Deployment Map',
    leftIcon: Globe,
    placeholder: 'Select server world...',
    options: MAP_OPTIONS,
    containerClassName: 'max-w-md',
  },
};

export const Clearable: Story = {
  args: {
    label: 'Log Level Filter',
    leftIcon: Filter,
    placeholder: 'Filter by log severity...',
    options: LOG_LEVEL_OPTIONS,
    defaultValue: 'info',
    clearable: true,
    containerClassName: 'max-w-md',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Automated Snapshot Schedule',
    leftIcon: Database,
    options: BACKUP_FREQUENCY_OPTIONS,
    defaultValue: '1h',
    helperText: 'Snapshots are saved to storage/backups/ as compressed tarballs.',
    containerClassName: 'max-w-md',
  },
};

export const ValidationError: Story = {
  args: {
    label: 'Mission Profile',
    options: MAP_OPTIONS,
    placeholder: 'Select a profile...',
    error: 'A valid world map profile must be selected before launching dedicated server.',
    required: true,
    containerClassName: 'max-w-md',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Storage Volume Target',
    leftIcon: HardDrive,
    options: [
      { value: 'nvme0', label: 'NVMe Main Volume (/dev/nvme0n1)' },
      { value: 'sdb1', label: 'Secondary SATA Array (/dev/sdb1)' },
    ],
    defaultValue: 'nvme0',
    disabled: true,
    helperText: 'Volume selection is locked while dedicated server process is running.',
    containerClassName: 'max-w-md',
  },
};

export const Controlled: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>('chernarusplus');

    return (
      <div className="space-y-4 max-w-md">
        <Select
          label="Controlled Server World"
          leftIcon={Server}
          options={MAP_OPTIONS}
          value={selected}
          onChange={val => setSelected(val)}
          clearable
        />
        <div className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]">
          Selected Value:{' '}
          <span className="font-semibold text-[var(--color-primary)]">{selected ?? 'null'}</span>
        </div>
      </div>
    );
  },
};

export const CustomOptionRendering: Story = {
  render: () => {
    const branchOptions: SelectOption[] = [
      {
        value: 'stable',
        label: 'Stable Release',
        description: 'DayZ v1.26.159040 — official public branch',
        icon: <Shield className="w-4 h-4 text-[var(--color-status-success)]" />,
        badge: 'Recommended',
      },
      {
        value: 'experimental',
        label: 'Experimental Branch',
        description: 'DayZ v1.27.160100 — bleeding edge mechanics',
        icon: <Layers className="w-4 h-4 text-[var(--color-status-warning)]" />,
        badge: 'Unstable',
      },
    ];

    return (
      <div className="max-w-md">
        <Select
          label="Server Release Channel"
          placeholder="Select release branch..."
          options={branchOptions}
          defaultValue="stable"
        />
      </div>
    );
  },
};

export const EmptyOptions: Story = {
  args: {
    label: 'Custom Mod Profiles',
    placeholder: 'Select mod profile...',
    options: [],
    emptyText: 'No mod profiles found in workshop cache.',
    containerClassName: 'max-w-md',
  },
};
