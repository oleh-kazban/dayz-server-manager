import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { DatePicker, type DatePickerProps } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

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

export const Default: StoryObj = {
  render: () => <DatePickerDemo ariaLabel="Snapshot date" />,
};

export const Preselected: StoryObj = {
  render: () => (
    <DatePickerDemo ariaLabel="Backup date" value="2026-10-23" placeholder="Select date" />
  ),
};

export const WithDateRangeConstraints: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--color-text-muted)]">
        Allowed window: 2026-10-10 to 2026-10-28
      </p>
      <DatePickerDemo
        ariaLabel="Audit log date"
        minDate="2026-10-10"
        maxDate="2026-10-28"
        value="2026-10-20"
      />
    </div>
  ),
};

export const Disabled: StoryObj = {
  render: () => <DatePickerDemo ariaLabel="Locked date" value="2026-10-23" disabled />,
};
