import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StopServerDialog, type StopServerDialogProps } from './StopServerDialog';

const onSubmit = vi.fn();
const onClose = vi.fn();

function renderDialog(props: Partial<StopServerDialogProps> = {}) {
  return render(
    <StopServerDialog
      serverName="Namalsk"
      isPending={false}
      fieldErrors={{}}
      onSubmit={onSubmit}
      onClose={onClose}
      {...props}
    />,
  );
}

const preset = (label: string) => screen.getByRole('radio', { name: label });
const messageField = () => screen.getByLabelText('In-game warning (optional)');
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('StopServerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to stopping now, without a warning field', () => {
    renderDialog();

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Stop "Namalsk"');
    expect(preset('Now')).toBeChecked();
    expect(screen.getAllByRole('radio').map(radio => radio.closest('label')?.textContent)).toEqual([
      'Now',
      '1 min',
      '5 min',
      '10 min',
      '15 min',
      '30 min',
    ]);
    expect(
      screen.getByText('The server stops right away and players are disconnected.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('In-game warning (optional)')).not.toBeInTheDocument();

    submit('Stop now');
    expect(onSubmit).toHaveBeenCalledWith({ delaySec: 0 });
  });

  it('schedules a delayed stop and shows the default warning players will see', () => {
    renderDialog();
    fireEvent.click(preset('5 min'));

    expect(
      screen.getByText(
        'Players are warned now and the server stops in 5 minutes. You can cancel until then.',
      ),
    ).toBeInTheDocument();
    expect(messageField()).toHaveAttribute(
      'placeholder',
      'Server is shutting down in 5 minutes. Please find a safe place and log out.',
    );
    expect(messageField()).toHaveAttribute('maxLength', '120');

    submit('Schedule stop');
    expect(onSubmit).toHaveBeenCalledWith({ delaySec: 300 });
  });

  it('sends a custom warning, but not a blank one', () => {
    renderDialog();
    fireEvent.click(preset('1 min'));
    fireEvent.change(messageField(), { target: { value: 'Wipe in one minute!' } });
    submit('Schedule stop');
    expect(onSubmit).toHaveBeenLastCalledWith({ delaySec: 60, message: 'Wipe in one minute!' });

    fireEvent.change(messageField(), { target: { value: '   ' } });
    submit('Schedule stop');
    expect(onSubmit).toHaveBeenLastCalledWith({ delaySec: 60 });
  });

  it('validates the warning before sending and clears the error on edit', () => {
    renderDialog();
    fireEvent.click(preset('10 min'));
    fireEvent.change(messageField(), { target: { value: 'Bye\u0007' } });
    submit('Schedule stop');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(messageField()).toHaveAccessibleDescription(
      'Warning message cannot contain control characters',
    );
    expect(messageField()).toHaveFocus();

    fireEvent.change(messageField(), { target: { value: 'Bye' } });
    expect(messageField()).not.toHaveAccessibleDescription();
  });

  it('clears a client error when another preset is chosen', () => {
    renderDialog();
    fireEvent.click(preset('10 min'));
    fireEvent.change(messageField(), { target: { value: 'Bye\u0007' } });
    submit('Schedule stop');
    fireEvent.click(preset('15 min'));
    expect(messageField()).not.toHaveAccessibleDescription();
  });

  it('shows server field errors inline', () => {
    renderDialog({
      fieldErrors: { message: 'Too long for BattlEye.', delaySec: 'Delay is out of range.' },
    });
    fireEvent.click(preset('5 min'));
    expect(messageField()).toHaveAccessibleDescription('Too long for BattlEye.');
    expect(screen.getByText('Delay is out of range.')).toHaveAttribute('role', 'alert');
  });

  it('closes from Cancel and the close button', () => {
    renderDialog();
    submit('Cancel');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the form while the request is in flight', () => {
    renderDialog({ isPending: true });
    expect(preset('Now')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.submit(
      screen.getByRole('button', { name: /Stop now/ }).closest('form') as HTMLElement,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
