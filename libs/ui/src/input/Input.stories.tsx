import type { Meta, StoryObj } from '@storybook/react';
import { Mail, Search } from 'lucide-react';

import { Input } from './Input';
import { PasswordInput } from './PasswordInput';

const meta: Meta = {
  title: 'Forms/Input',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const DefaultInput: StoryObj = {
  render: () => (
    <div className="w-80">
      <Input label="Server Hostname" placeholder="e.g. Chernarus Hardcore Survival" />
    </div>
  ),
};

export const WithLeftIcon: StoryObj = {
  render: () => (
    <div className="w-80">
      <Input label="Administrator Email" placeholder="admin@dayzserver.com" leftIcon={Mail} />
    </div>
  ),
};

export const WithSearchIcon: StoryObj = {
  render: () => (
    <div className="w-80">
      <Input
        label="Filter Players"
        placeholder="Search by Steam ID or gamer tag"
        leftIcon={Search}
      />
    </div>
  ),
};

export const WithError: StoryObj = {
  render: () => (
    <div className="w-80">
      <Input
        label="RCON Port"
        defaultValue="99999"
        error="Port must be an integer between 1024 and 65535"
      />
    </div>
  ),
};

export const PasswordField: StoryObj = {
  render: () => (
    <div className="w-80">
      <PasswordInput label="Server Password" placeholder="Enter password" />
    </div>
  ),
};
