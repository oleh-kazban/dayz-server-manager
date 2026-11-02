import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';

import { KeywordConfirmation } from './KeywordConfirmation';
import type { KeywordConfirmationProps } from './KeywordConfirmation.types';

const meta: Meta<typeof KeywordConfirmation> = {
  title: 'Feedback/KeywordConfirmation',
  component: KeywordConfirmation,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof KeywordConfirmation>;

function KeywordConfirmationDemo({
  title = 'Confirm Critical Operation',
  description = 'This action requires typing the exact confirmation keyword to proceed.',
  variant = 'danger',
  timerValue = 0,
  keyword,
  ...props
}: Partial<KeywordConfirmationProps> & { keyword: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Open Keyword Confirmation Dialog
      </Button>

      {isOpen && (
        <KeywordConfirmation
          title={title}
          description={description}
          keyword={keyword}
          variant={variant}
          timerValue={timerValue}
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
    <KeywordConfirmationDemo
      title="Promote Staging Mission to Production"
      description="Type CONFIRM to publish the modified DayZ mission package to the live production server."
      keyword="CONFIRM"
      variant="primary"
      confirmLabel="Promote Mission"
    />
  ),
};

export const DangerWithTimer: Story = {
  render: () => (
    <KeywordConfirmationDemo
      title="Permanent Storage Wipe"
      description="Permanent operation: Deletes all player inventories, base structures, and persistence data. Type DELETE_DATA to proceed."
      keyword="DELETE_DATA"
      variant="danger"
      confirmLabel="Wipe Storage"
      timerValue={5}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <KeywordConfirmationDemo
      title="Wiping Storage in Progress"
      description="Deleting persistence data files on DayZ server storage volume..."
      keyword="DELETE_DATA"
      variant="danger"
      confirmLabel="Wiping..."
      isLoading={true}
    />
  ),
  play: async ({ canvasElement }) => {
    const openButton = canvasElement.querySelector<HTMLButtonElement>('button');
    if (!openButton) {
      throw new Error('The loading keyword confirmation trigger should be rendered.');
    }
    openButton.click();

    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

    const dialog = canvasElement.querySelector<HTMLDialogElement>('dialog');
    if (!dialog?.open) {
      throw new Error('The loading keyword confirmation dialog should be open.');
    }

    const cancelEvent = new Event('cancel', { cancelable: true });
    if (dialog.dispatchEvent(cancelEvent) || !dialog.open) {
      throw new Error('A loading keyword confirmation dialog must prevent cancellation.');
    }
  },
};
