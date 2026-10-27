import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../AuthProvider';

import { SignInForm } from './SignInForm';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form inputs, remember me checkbox, and submit button', () => {
    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/Username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember me on this device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('validates required fields on submission attempt when empty', async () => {
    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const submitBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Username or email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('submits valid credentials, logs user in, and navigates to /dashboard', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const rememberMeCheckbox = screen.getByLabelText(/Remember me on this device/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'admin@dayz.local');
    await user.type(passwordInput, 'ValidPassword123');
    await user.click(rememberMeCheckbox);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
  });
});
