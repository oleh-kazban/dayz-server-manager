import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables user interactions and dims label/input styling',
    },
    defaultChecked: {
      control: 'boolean',
      description: 'Initial checked state',
    },
    label: {
      control: 'text',
      description: 'Primary label text',
    },
    description: {
      control: 'text',
      description: 'Secondary helper description text',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Tri-state mixed indeterminate state (e.g. bulk selection)',
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

type Story = StoryObj<typeof Checkbox>;

export const Indeterminate: Story = {
  name: 'Indeterminate (Mixed State)',
  render: args => (
    <div className="w-80">
      <Checkbox {...args} />
    </div>
  ),
  args: {
    label: 'Select all mods',
    description: '3 of 12 community mods currently selected',
    indeterminate: true,
    disabled: false,
  },
  play: ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!input?.indeterminate || input.getAttribute('aria-checked') !== 'mixed') {
      throw new Error('Indeterminate Checkbox must expose the native and ARIA mixed states.');
    }
  },
};

export const DefaultCheckbox: Story = {
  name: 'Default',
  render: args => (
    <div className="w-80">
      <Checkbox {...args} />
    </div>
  ),
  args: {
    label: 'Enable BattlEye Anti-Cheat',
    description: 'Enforces BE packet verification on incoming connections',
    defaultChecked: true,
    disabled: false,
  },
};

export const Disabled: Story = {
  name: 'Disabled (Locked)',
  render: args => (
    <div className="w-80">
      <Checkbox {...args} />
    </div>
  ),
  args: {
    label: 'Steam VAC Protection (Locked)',
    description: 'Requires server administrator elevation to toggle',
    disabled: true,
    defaultChecked: true,
  },
};

export const WithError: Story = {
  render: args => (
    <div className="w-80">
      <Checkbox {...args} />
    </div>
  ),
  args: {
    label: 'I understand persistence wipe is irreversible',
    error: 'You must acknowledge this before continuing',
    disabled: false,
  },
};

export const AllStatesGallery: Story = {
  render: args => (
    <div className="space-y-4 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] w-96">
      <div className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold text-[var(--color-text-main)]">
        Checkbox State Matrix {args.disabled ? '(All Disabled)' : ''}
      </div>

      <div className="space-y-3">
        <Checkbox {...args} label="Unchecked option" description="Ready for interaction" />

        <Checkbox
          {...args}
          label="Checked option"
          description="Default active state"
          defaultChecked
        />

        <Checkbox
          {...args}
          label="Indeterminate option"
          description="Mixed state (e.g. bulk selection)"
          indeterminate
        />

        <Checkbox {...args} label="Option with validation error" error="This setting is required" />

        <div className="pt-2 border-t border-[var(--color-border)]">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">
            Static Disabled Comparison
          </span>
          <div className="space-y-3 mt-2">
            <Checkbox
              label="Static Disabled (Checked)"
              description="Cannot be toggled"
              disabled
              defaultChecked
            />
            <Checkbox
              label="Static Disabled (Indeterminate)"
              description="Locked mixed selection"
              disabled
              indeterminate
            />
            <Checkbox label="Static Disabled (Unchecked)" disabled />
          </div>
        </div>
      </div>
    </div>
  ),
};
