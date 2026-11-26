import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import { showToast } from '@aegis/ui';

import { AuthProvider } from './AuthProvider';
import { SignIn } from './SignIn';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
  useSearch: () => ({}),
}));

describe('SignIn Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
  });

  it('renders sign-in page with hero and form', () => {
    render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText('YOUR SERVER. YOUR WORLD.')).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('shows the first-start line naming the setup file, without a path, and makes no request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );

    expect(
      screen.getByText(
        'First start of Aegis? Sign in with the setup credentials from the file setup-credentials.txt. The server console shows where it is saved.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Trouble signing in?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Contact your workspace administrator for your credentials or to reset your password.',
      ),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('triggers error toast and inline root error when sign-in fails with AUTH_INVALID_CREDENTIALS', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient.auth, 'login').mockRejectedValueOnce(
      new ApiError('Invalid username or password', 401, {
        statusCode: 401,
        error: 'Unauthorized',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      }),
    );

    render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/username or email/i), 'admin');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Authentication Failed',
        'Invalid username or password. Please check your credentials and try again.',
        undefined,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid username or password. Please check your credentials and try again.',
      );
    });
    expect(showToast.success).not.toHaveBeenCalled();
  });

  it('shows the setup-session-expired text in the toast and the alert box (UX-16)', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient.auth, 'login').mockRejectedValueOnce(
      new ApiError('Setup session expired', 401, {
        statusCode: 401,
        error: 'Unauthorized',
        errorCode: 'AUTH_SETUP_SESSION_EXPIRED',
        message: 'Setup session expired',
      }),
    );

    render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/username or email/i), 'setup-1a2b3c4d5e6f');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'whatever');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Setup session expired',
        'Restart Aegis to create new setup credentials.',
        undefined,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Restart Aegis to create new setup credentials.',
      );
    });
  });

  it('does not trigger a toast upon successful sign-in (REQ-05 / A4)', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient.auth, 'login').mockResolvedValueOnce({
      accessToken: 'jwt-access-123',
      refreshToken: 'jwt-refresh-456',
      expiresIn: 900,
      user: {
        id: 'usr-123',
        username: 'admin',
        email: 'admin@dayz.local',
        role: 'admin',
      },
    });

    render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/username or email/i), 'admin');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
    expect(showToast.success).not.toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
  });
});
