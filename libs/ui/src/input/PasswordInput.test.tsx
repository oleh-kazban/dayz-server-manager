import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders with password type initially and default toggle button', () => {
    render(<PasswordInput label="RCON Password" placeholder="••••••••" />);

    const input = screen.getByPlaceholderText('••••••••');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles password visibility between masked and plain text', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Admin Password" placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('omits toggle button when showToggle is false', () => {
    render(<PasswordInput showToggle={false} placeholder="Hidden toggle" />);

    expect(screen.getByPlaceholderText('Hidden toggle')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables toggle button when component is disabled', () => {
    render(<PasswordInput disabled placeholder="Disabled password" />);

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeDisabled();
  });
});
