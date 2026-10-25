import { type Toast, toast } from 'react-hot-toast';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CustomToast } from './CustomToast';

vi.mock('react-hot-toast', () => ({
  toast: {
    dismiss: vi.fn(),
  },
}));

describe('CustomToast', () => {
  const dummyToast: Toast = {
    id: 'test-toast-1',
    visible: true,
    dismissed: false,
    type: 'custom',
    message: '',
    pauseDuration: 0,
    ariaProps: { role: 'status', 'aria-live': 'polite' },
    createdAt: Date.now(),
  };

  it('renders title, description, and status role for info/success/warning types', () => {
    const { rerender } = render(
      <CustomToast
        t={dummyToast}
        title="Server Connected"
        description="Connected to BattlEye RCON on port 2302"
        type="success"
      />,
    );

    const toastElement = screen.getByRole('status');
    expect(toastElement).toBeInTheDocument();
    expect(toastElement).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Server Connected')).toBeInTheDocument();
    expect(screen.getByText('Connected to BattlEye RCON on port 2302')).toBeInTheDocument();

    rerender(<CustomToast t={dummyToast} title="High Memory Usage" type="warning" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<CustomToast t={dummyToast} title="Info Notification" type="info" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<CustomToast t={{ ...dummyToast, visible: false }} title="Hidden Toast" />);
    expect(screen.getByRole('status')).toHaveClass('opacity-0');
  });

  it('renders alert role and assertive aria-live for error toast', () => {
    render(
      <CustomToast
        t={dummyToast}
        title="Server Crash"
        description="DayZ Server process exited with code 1"
        type="error"
      />,
    );

    const alertToast = screen.getByRole('alert');
    expect(alertToast).toBeInTheDocument();
    expect(alertToast).toHaveAttribute('aria-live', 'assertive');
  });

  it('dismisses toast when close button is clicked', async () => {
    const user = userEvent.setup();

    render(<CustomToast t={dummyToast} title="Dismissible Toast" />);

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    await user.click(dismissButton);

    expect(toast.dismiss).toHaveBeenCalledWith('test-toast-1');
  });
});
