import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Confirmation, type ConfirmationProps } from './Confirmation';

const meta: Meta<typeof Confirmation> = {
  title: 'Feedback/Confirmation',
  component: Confirmation,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Confirmation>;

function ConfirmationDemo(props: Partial<ConfirmationProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        Open Confirmation Dialog
      </button>

      {isOpen && (
        <Confirmation
          title={props.title ?? 'Are you sure?'}
          description={
            props.description ?? 'This action will execute immediately on the active DayZ server.'
          }
          variant={props.variant ?? 'primary'}
          timerValue={props.timerValue ?? 0}
          onCancel={() => setIsOpen(false)}
          onConfirm={() => {
            alert('Confirmed!');
            setIsOpen(false);
          }}
          {...props}
        />
      )}
    </div>
  );
}

export const Primary: Story = {
  render: () => (
    <ConfirmationDemo
      title="Restart DayZ Server"
      description="The server will trigger an RCON #shutdown to flush persistence before restarting the dedicated process."
      variant="primary"
      confirmLabel="Restart Server"
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ConfirmationDemo
      title="Overwrite Mission Files"
      description="Applying this XML change will overwrite storage_1 types.xml with your staging modifications."
      variant="warning"
      confirmLabel="Overwrite Files"
    />
  ),
};

export const DangerWithTimer: Story = {
  render: () => (
    <ConfirmationDemo
      title="Wipe Server Persistence"
      description="Permanent operation: Deletes all player inventories, base builds, and vehicle state across Chernarus."
      variant="danger"
      confirmLabel="Wipe Server"
      timerValue={5}
    />
  ),
};
