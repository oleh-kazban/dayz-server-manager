import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { DatePicker, type DatePickerProps } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables calendar trigger button and suppresses popup overlay',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder label when no date is selected',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for screen readers',
    },
  },
  args: {
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

function DatePickerDemo(props: Partial<DatePickerProps>) {
  const [date, setDate] = useState<string | undefined>(props.value);

  return (
    <div className="flex w-72 flex-col gap-3">
      <DatePicker
        ariaLabel={props.ariaLabel ?? 'Select date'}
        value={date}
        onChange={setDate}
        minDate={props.minDate}
        maxDate={props.maxDate}
        placeholder={props.placeholder ?? 'Select snapshot date...'}
        alignment={props.alignment ?? 'start'}
        disabled={props.disabled}
      />
      {date && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Selected date ISO: <span className="font-mono text-[var(--color-primary)]">{date}</span>
        </p>
      )}
    </div>
  );
}

export const Default: Story = {
  render: args => <DatePickerDemo {...args} />,
  args: {
    ariaLabel: 'Snapshot date',
    disabled: false,
  },
};

export const Preselected: Story = {
  render: args => <DatePickerDemo {...args} />,
  args: {
    ariaLabel: 'Backup date',
    value: '2026-10-23',
    placeholder: 'Select date',
    disabled: false,
  },
};

export const WithDateRangeConstraints: Story = {
  render: args => (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--color-text-muted)]">
        Allowed window: 2026-10-10 to 2026-10-28
      </p>
      <DatePickerDemo minDate="2026-10-10" maxDate="2026-10-28" {...args} />
    </div>
  ),
  args: {
    ariaLabel: 'Audit log date',
    value: '2026-10-20',
    disabled: false,
  },
};

export const Disabled: Story = {
  render: args => <DatePickerDemo {...args} />,
  args: {
    ariaLabel: 'Locked date',
    value: '2026-10-23',
    disabled: true,
  },
};
