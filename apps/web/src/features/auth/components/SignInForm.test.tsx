import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import { showToast } from '@aegis/ui';

import { AuthProvider } from '../AuthProvider';

import { SignInForm } from './SignInForm';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();
let mockSearchParams: { redirect?: string } = {};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
  useSearch: () => mockSearchParams,
}));

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    mockSearchParams = {};
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
      expect(screen.getByText('Username or email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('validates invalid email format when an email address with @ is malformed', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'invalid-email@');
    await user.type(passwordInput, 'ValidPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('submits valid credentials, logs user in, and navigates to /dashboard', async () => {
    const user = userEvent.setup();

    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      accessToken: 'jwt-access-123',
      refreshToken: 'jwt-refresh-456',
      expiresIn: 900,
      user: {
        id: 'usr-123',
        username: 'adminuser',
        email: 'admin@dayz.local',
        role: 'admin',
      },
    });

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const rememberMeCheckbox = screen.getByLabelText(/Remember me on this device/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'adminuser');
    await user.type(passwordInput, 'ValidPassword123');
    await user.click(rememberMeCheckbox);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
    expect(showToast.success).not.toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('navigates to preserved redirect query parameter destination upon successful sign in', async () => {
    const user = userEvent.setup();
    mockSearchParams = { redirect: '/system' };

    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      accessToken: 'jwt-access-123',
      refreshToken: 'jwt-refresh-456',
      expiresIn: 900,
      user: {
        id: 'usr-123',
        username: 'adminuser',
        email: 'admin@dayz.local',
        role: 'admin',
      },
    });

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'adminuser');
    await user.type(passwordInput, 'ValidPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/system' });
    });
  });

  it('displays root error message and triggers error toast when login fails with invalid credentials', async () => {
    const user = userEvent.setup();

    vi.spyOn(apiClient.auth, 'login').mockRejectedValue(new Error('Invalid username or password'));

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'adminuser');
    await user.type(passwordInput, 'WrongPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password');
      expect(showToast.error).toHaveBeenCalledWith(
        'Sign in failed',
        'Invalid username or password',
        undefined,
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('resolves localized error code from ApiError response data payload for both toast and inline alert', async () => {
    const user = userEvent.setup();

    vi.spyOn(apiClient.auth, 'login').mockRejectedValue(
      new ApiError('Rate limit exceeded', 429, {
        statusCode: 429,
        error: 'Too Many Requests',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded, retry in 1 minute',
      }),
    );

    render(
      <AuthProvider>
        <SignInForm />
      </AuthProvider>,
    );

    const usernameInput = screen.getByLabelText(/Username or email/i);
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    await user.type(usernameInput, 'adminuser');
    await user.type(passwordInput, 'WrongPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts detected. Please wait a moment before trying again.',
      );
      expect(showToast.error).toHaveBeenCalledWith(
        'Too Many Requests',
        'Too many attempts detected. Please wait a moment before trying again.',
        undefined,
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
