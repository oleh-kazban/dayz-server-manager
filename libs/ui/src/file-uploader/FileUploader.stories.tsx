import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileUploader } from './FileUploader';

const meta: Meta<typeof FileUploader> = {
  title: 'Forms/FileUploader',
  component: FileUploader,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables user interaction and displays dimmed styling',
    },
    label: {
      control: 'text',
      description: 'Drop zone label text',
    },
    helperText: {
      control: 'text',
      description: 'Helper text rendered below the drop zone',
    },
    error: {
      control: 'text',
      description: 'Explicit error message rendered below the drop zone',
    },
    maxSizeBytes: {
      control: 'number',
      description: 'Maximum file size in bytes',
    },
  },
  args: {
    disabled: false,
    label: 'Upload File',
  },
};

export default meta;

type Story = StoryObj<typeof FileUploader>;

const sampleFile = new File(
  ['{"preset":"dayz-vanilla","mods":[],"version":"1.25"}'],
  'mod-preset.json',
  { type: 'application/json' },
);

export const Default: Story = {
  render: args => (
    <div className="w-96">
      <FileUploader {...args} />
    </div>
  ),
};

export const WithSelectedFile: Story = {
  render: args => (
    <div className="w-96">
      <FileUploader {...args} defaultValue={sampleFile} />
    </div>
  ),
};

export const DisabledState: Story = {
  render: args => (
    <div className="w-96">
      <FileUploader {...args} disabled />
    </div>
  ),
};

export const RestrictedFormats: Story = {
  render: args => (
    <div className="w-96">
      <FileUploader
        {...args}
        accept=".json"
        maxSizeBytes={500 * 1024}
        helperText="Only JSON files under 500 KB are permitted."
      />
    </div>
  ),
};

export const ValidationError: Story = {
  render: args => (
    <div className="w-96">
      <FileUploader {...args} error="The uploaded file is corrupted or could not be read." />
    </div>
  ),
};
