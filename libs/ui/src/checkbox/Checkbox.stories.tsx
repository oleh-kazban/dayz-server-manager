import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';

const meta: Meta = {
  title: 'Forms/Checkbox',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const DefaultCheckbox: StoryObj = {
  render: () => (
    <div className="w-80">
      <Checkbox
        label="Enable BattlEye Anti-Cheat"
        description="Enforces BE packet verification on incoming connections"
        defaultChecked
      />
    </div>
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <div className="w-80">
      <Checkbox
        label="Steam VAC Protection (Locked)"
        description="Requires server administrator elevation to toggle"
        disabled
        defaultChecked
      />
    </div>
  ),
};

export const WithError: StoryObj = {
  render: () => (
    <div className="w-80">
      <Checkbox
        label="I understand persistence wipe is irreversible"
        error="You must acknowledge this before continuing"
      />
    </div>
  ),
};
