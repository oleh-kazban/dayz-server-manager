import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';

import { Confirmation } from './Confirmation';
import type { ConfirmationProps } from './Confirmation.types';

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
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Open Confirmation Dialog
      </Button>

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

export const Loading: Story = {
  render: () => (
    <ConfirmationDemo
      title="Stopping Server via RCON"
      description="Sending RCON #shutdown command to DayZ Dedicated Server... waiting for process to exit cleanly."
      variant="danger"
      confirmLabel="Stopping..."
      isLoading={true}
    />
  ),
  play: async ({ canvasElement }) => {
    const openButton = canvasElement.querySelector<HTMLButtonElement>('button');
    if (!openButton) {
      throw new Error('The loading confirmation trigger should be rendered.');
    }
    openButton.click();

    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

    const dialog = canvasElement.querySelector<HTMLDialogElement>('dialog');
    if (!dialog?.open) {
      throw new Error('The loading confirmation dialog should be open.');
    }

    const cancelEvent = new Event('cancel', { cancelable: true });
    if (dialog.dispatchEvent(cancelEvent) || !dialog.open) {
      throw new Error('A loading confirmation dialog must prevent cancellation.');
    }
  },
};
