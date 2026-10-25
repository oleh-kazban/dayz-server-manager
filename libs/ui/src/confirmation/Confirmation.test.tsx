import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Confirmation } from './Confirmation';

describe('Confirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders confirmation dialog with title, description, and action buttons', () => {
    const handleCancel = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <Confirmation
        title="Wipe Server Persistence"
        description="This action will delete all player saves and world storage."
        variant="danger"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /wipe server persistence/i })).toBeInTheDocument();
    expect(screen.getByText(/this action will delete all player saves/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('renders warning and primary variant icons', () => {
    const { rerender } = render(
      <Confirmation
        title="Restart Server"
        variant="warning"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    rerender(
      <Confirmation title="Info Action" variant="primary" onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('handles lockout countdown timer before enabling confirm button', () => {
    render(
      <Confirmation
        title="Dangerous Action"
        timerValue={3}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: /confirm \(3s\)/i });
    expect(confirmButton).toBeDisabled();

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: /confirm \(2s\)/i })).toBeDisabled();

    // Advance remaining 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const readyButton = screen.getByRole('button', { name: /^confirm$/i });
    expect(readyButton).not.toBeDisabled();
  });

  it('invokes onConfirm when confirm button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <Confirmation title="Confirm Operation" onCancel={handleCancel} onConfirm={handleConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('invokes onCancel when cancel button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <Confirmation title="Dismissible Operation" onCancel={handleCancel} onConfirm={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('invokes onCancel when close button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <Confirmation title="Dismissible Operation" onCancel={handleCancel} onConfirm={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('locks dialog and buttons when isLoading is true', () => {
    const handleCancel = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <Confirmation
        title="Applying patch..."
        isLoading
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />,
    );

    const dialog = screen.getByRole('alertdialog');
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const closeButton = screen.getByRole('button', { name: /close dialog/i });

    expect(cancelButton).toBeDisabled();
    expect(closeButton).toBeDisabled();

    // Attempt native escape / cancel event
    const cancelEvent = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it('dismisses dialog when clicking backdrop', () => {
    vi.useRealTimers();
    const handleCancel = vi.fn();

    render(<Confirmation title="Backdrop Click" onCancel={handleCancel} onConfirm={vi.fn()} />);

    const dialog = screen.getByRole('alertdialog');
    // Simulate click on dialog itself (backdrop target)
    fireEvent.click(dialog);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
