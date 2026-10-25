import type { Meta, StoryObj } from '@storybook/react';

import { Loader } from './Loader';

const meta: Meta<typeof Loader> = {
  title: 'Feedback/Loader',
  component: Loader,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const SpinnerVariants: StoryObj = {
  render: () => (
    <div className="flex items-center gap-8">
      <Loader size="sm" />
      <Loader size="md" showLabel label="Loading mission..." />
      <Loader size="lg" />
    </div>
  ),
};

export const BouncingDots: StoryObj = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <Loader variant="dots" size="sm" />
      <Loader variant="dots" size="md" showLabel label="Synchronizing with BattlEye..." />
      <Loader variant="dots" size="lg" />
    </div>
  ),
};

export const PulseWaveDots: StoryObj = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <Loader variant="pulse" size="sm" />
      <Loader variant="pulse" size="md" showLabel label="Connecting to DayZ server..." />
      <Loader variant="pulse" size="lg" />
    </div>
  ),
};
