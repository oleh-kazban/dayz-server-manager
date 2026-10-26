import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, Search } from 'lucide-react';

import { Button } from '../button';

import { Input } from './Input';
import { PasswordInput } from './PasswordInput';

const meta: Meta<typeof Input> = {
  title: 'Forms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables user input and displays dimmed styling',
    },
    label: {
      control: 'text',
      description: 'Input label text',
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder text',
    },
    defaultValue: {
      control: 'text',
      description: 'Initial uncontrolled input value',
    },
    error: {
      control: 'text',
      description: 'Error validation message',
    },
  },
  args: {
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const DefaultInput: Story = {
  name: 'Default',
  render: args => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
  args: {
    label: 'Server Hostname',
    placeholder: 'e.g. Chernarus Hardcore Survival',
    disabled: false,
  },
};

export const WithLeftIcon: Story = {
  render: args => (
    <div className="w-80">
      <Input {...args} leftIcon={Mail} />
    </div>
  ),
  args: {
    label: 'Administrator Email',
    placeholder: 'admin@dayzserver.com',
    disabled: false,
  },
};

export const WithSearchIcon: Story = {
  render: args => (
    <div className="w-80">
      <Input {...args} leftIcon={Search} />
    </div>
  ),
  args: {
    label: 'Filter Players',
    placeholder: 'Search by Steam ID or gamer tag',
    disabled: false,
  },
};

export const WithError: Story = {
  render: args => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
  args: {
    label: 'RCON Port',
    defaultValue: '99999',
    error: 'Port must be an integer between 1024 and 65535',
    disabled: false,
  },
};

export const PasswordField: Story = {
  render: args => (
    <div className="w-80">
      <PasswordInput {...args} />
    </div>
  ),
  args: {
    label: 'Server Password',
    placeholder: 'Enter password',
    disabled: false,
  },
};

export const Disabled: Story = {
  name: 'Disabled State Showcase',
  render: args => (
    <div className="space-y-4 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] w-88">
      <div className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold text-[var(--color-text-main)]">
        Locked Form Fields
      </div>

      <Input
        {...args}
        label="Cluster Instance ID"
        defaultValue="dayz-eu-central-01"
        leftIcon={Mail}
      />

      <PasswordInput
        {...args}
        label="RCON Secret (Master)"
        defaultValue="SuperSecretAdminPass123!"
      />
    </div>
  ),
  args: {
    disabled: true,
  },
};

export const InputDrivenUniformity: Story = {
  name: 'Geometric Uniformity (Canonical 36px)',
  render: () => (
    <div className="flex flex-col gap-6 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] max-w-md w-full">
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-main)]">
          Input & Button Physical Parity (§2.2.1)
        </h4>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Input and Button share identical height (36px / h-9), border radius (8px / rounded-lg),
          surface styling, and typography scale.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
          Standard Pair (36px)
        </span>
        <div className="flex items-center gap-2">
          <Input placeholder="Standard input (36px)" className="flex-1" />
          <Button variant="primary">Button (36px)</Button>
        </div>
      </div>
    </div>
  ),
};
