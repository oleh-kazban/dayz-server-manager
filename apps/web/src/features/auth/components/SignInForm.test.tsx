import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@dsm/api-client';

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

  it('displays root error message when login fails with invalid credentials', async () => {
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
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays API error message from ApiError response data payload', async () => {
    const user = userEvent.setup();

    vi.spyOn(apiClient.auth, 'login').mockRejectedValue(
      new ApiError('HTTP request failed with status 401', 401, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Custom backend rejection message',
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
      expect(screen.getByRole('alert')).toHaveTextContent('Custom backend rejection message');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
