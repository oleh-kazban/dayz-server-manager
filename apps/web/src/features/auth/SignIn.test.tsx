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
