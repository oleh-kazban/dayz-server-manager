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
    label: {
      control: 'text',
      description: 'Form field label displayed above the trigger',
    },
    error: {
      control: 'text',
      description: 'Validation error message displaying danger state',
    },
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
        label={props.label}
        error={props.error}
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

export const WithLabel: Story = {
  render: args => <DatePickerDemo {...args} />,
  args: {
    label: 'Backup Snapshot Date',
    placeholder: 'Pick a recovery date...',
    ariaLabel: 'Backup Snapshot Date',
    disabled: false,
  },
};

export const WithError: Story = {
  render: args => <DatePickerDemo {...args} />,
  args: {
    label: 'Deployment Date',
    value: '2026-10-24',
    error: 'Selected date conflicts with scheduled maintenance window.',
    ariaLabel: 'Deployment Date',
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

export const FormIntegration: Story = {
  render: () => (
    <form>
      <DatePicker
        name="snapshotDate"
        label="Snapshot date"
        value="2026-10-24"
        required
        onChange={() => {}}
      />
    </form>
  ),
  play: ({ canvasElement }) => {
    const form = canvasElement.querySelector('form');
    const proxy = form?.querySelector<HTMLInputElement>('input[type="date"][name="snapshotDate"]');

    if (!form || !proxy || !form.checkValidity()) {
      throw new Error('A selected required date must pass native form validation.');
    }

    if (new FormData(form).get('snapshotDate') !== '2026-10-24') {
      throw new Error('The selected date must be serialized under the provided form name.');
    }
  },
};

export const RequiredFormValidation: Story = {
  render: () => (
    <form>
      <DatePicker name="snapshotDate" label="Snapshot date" required onChange={() => {}} />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('form');
    const proxy = form?.querySelector<HTMLInputElement>('input[type="date"][name="snapshotDate"]');

    if (!form || !proxy || form.checkValidity()) {
      throw new Error('An empty required date must fail native form validation.');
    }

    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    const trigger = form.querySelector('button[aria-invalid="true"]');
    if (!trigger || !form.textContent?.includes('A date is required.')) {
      throw new Error('Required-date validation must be surfaced on the visible control.');
    }
  },
};
