import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { SetupRootRequestDto, SetupRootResponseDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { authStorage } from '../auth.storage';
import { AuthProvider } from '../AuthProvider';

import { SetupForm } from './SetupForm';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
  useSearch: () => ({}),
}));

const USERNAME_HINT = '3 to 32 characters: letters, digits, ".", "_" and "-".';
const PASSWORD_HINT =
  '8 to 64 characters with at least one digit, one lowercase letter, one uppercase letter and one special symbol. No spaces.';
const CREATE = { name: 'Create root account' };

const valid = { username: 'owner', password: 'Str0ng!Pass1', confirmPassword: 'Str0ng!Pass1' };

const rootResponse = {
  accessToken: 'root-access-token',
  refreshToken: 'root-refresh-token',
  expiresIn: 900,
  user: { id: 'usr-root', username: 'owner', email: '', role: 'root' as const },
};

function apiError(status: number, errorCode: string, extra: Record<string, unknown> = {}) {
  return new ApiError(`Failure ${status}`, status, {
    statusCode: status,
    error: 'Error',
    errorCode,
    message: `Failure ${status}`,
    ...extra,
  });
}

function renderForm() {
  authStorage.set(
    { id: 'usr-setup', username: 'setup-1a2b3c4d5e6f', email: '', role: 'setup' },
    false,
    {
      accessToken: 'setup-access-token',
      refreshToken: 'setup-refresh-token',
    },
  );
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SetupForm />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function fill(values: Partial<typeof valid>) {
  const fields = {
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm password',
  };
  for (const [key, label] of Object.entries(fields)) {
    const value = values[key as keyof typeof valid];
    if (value !== undefined) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('SetupForm', () => {
  let setupRoot: MockInstance<(dto: SetupRootRequestDto) => Promise<SetupRootResponseDto>>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    mockInvalidate.mockReset();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    setupRoot = vi.spyOn(apiClient.setup, 'setupRoot');
  });

  describe('markup', () => {
    it('has three labelled fields, one submit button and is named by its heading', () => {
      renderForm();

      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
      const form = screen.getByRole('form', { name: 'Create the root account' });
      expect(form).toHaveAttribute('novalidate');
      expect(form.querySelectorAll('button[type="submit"]')).toHaveLength(1);
      expect(screen.getByRole('button', CREATE)).toHaveAttribute('type', 'submit');
      expect(screen.getByRole('button', { name: 'Sign out' })).toHaveAttribute('type', 'button');
    });

    it('sets the autocomplete attributes for password managers', () => {
      renderForm();

      const username = screen.getByLabelText('Username');
      expect(username).toHaveAttribute('name', 'username');
      expect(username).toHaveAttribute('autocomplete', 'username');
      expect(username).toHaveAttribute('autocapitalize', 'none');
      expect(username).toHaveAttribute('autocorrect', 'off');
      expect(username).toHaveAttribute('spellcheck', 'false');
      expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    });

    it('uses 36 px (h-9) buttons and the placeholders of the spec', () => {
      renderForm();

      expect(screen.getByRole('button', CREATE).className).toContain('h-9');
      expect(screen.getByRole('button', { name: 'Sign out' }).className).toContain('h-9');
      expect(screen.getByPlaceholderText('Choose a username')).toBe(
        screen.getByLabelText('Username'),
      );
      expect(screen.getByPlaceholderText('Choose a password')).toBe(
        screen.getByLabelText('Password'),
      );
      expect(screen.getByPlaceholderText('Repeat the password')).toBe(
        screen.getByLabelText('Confirm password'),
      );
    });

    it('links the rule hints to their fields through the accessible description', () => {
      renderForm();

      expect(screen.getByText(USERNAME_HINT)).toBeInTheDocument();
      expect(screen.getByText(PASSWORD_HINT)).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
        expect.stringContaining(USERNAME_HINT),
      );
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        expect.stringContaining(PASSWORD_HINT),
      );
    });

    it('shows no error before the first submit attempt', () => {
      renderForm();

      fill({ username: 'a', password: 'x' });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Username')).not.toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('validation', () => {
    it('shows inline messages under the empty fields, focuses Username and sends nothing', () => {
      renderForm();

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
        expect.stringContaining('Username is required'),
      );
      expect(screen.getByLabelText('Username')).toHaveFocus();
      expect(setupRoot).not.toHaveBeenCalled();
      expect(showToast.error).not.toHaveBeenCalled();
    });

    it('keeps both hints visible next to an error (UX-13)', () => {
      renderForm();

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(screen.getByText(USERNAME_HINT)).toBeInTheDocument();
      expect(screen.getByText(PASSWORD_HINT)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        expect.stringContaining(PASSWORD_HINT),
      );
    });

    it('focuses Password when only the password is invalid', () => {
      renderForm();
      fill({ ...valid, password: 'NoNumberPass!', confirmPassword: 'NoNumberPass!' });

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(screen.getByText('Password must contain at least 1 number')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toHaveFocus();
      expect(setupRoot).not.toHaveBeenCalled();
    });

    it('shows Passwords do not match under Confirm password and focuses it', () => {
      renderForm();
      fill({ ...valid, confirmPassword: 'Different2@Pass' });

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Confirm password')).toHaveFocus();
      expect(setupRoot).not.toHaveBeenCalled();
    });

    it('rejects an invalid username with the shared rule text', () => {
      renderForm();
      fill({ ...valid, username: 'ab' });

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(setupRoot).not.toHaveBeenCalled();
    });

    it('re-validates live after the failed attempt and removes the message when fixed', () => {
      renderForm();
      fireEvent.click(screen.getByRole('button', CREATE));
      expect(screen.getByText('Username is required')).toBeInTheDocument();

      fill({ username: 'owner' });

      expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('shows the spinner, disables the fields and sends exactly one request', async () => {
      const pending = deferred<typeof rootResponse>();
      setupRoot.mockReturnValue(pending.promise);
      renderForm();
      fill(valid);
      const form = screen.getByRole('form', { name: 'Create the root account' });

      fireEvent.submit(form);
      fireEvent.submit(form);
      fireEvent.click(screen.getByRole('button', CREATE));

      await waitFor(() => {
        expect(screen.getByRole('button', CREATE)).toHaveAttribute('aria-busy', 'true');
      });
      expect(screen.getByRole('button', CREATE)).toBeDisabled();
      expect(screen.getByLabelText('Username')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByLabelText('Confirm password')).toBeDisabled();
      for (const toggle of screen.getAllByRole('button', { name: 'Show password' })) {
        expect(toggle).toBeDisabled();
      }
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
      fireEvent.submit(form);
      expect(setupRoot).toHaveBeenCalledTimes(1);

      pending.resolve(rootResponse);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('submits with Enter in a field, sending the three values', async () => {
      setupRoot.mockResolvedValue(rootResponse);
      const user = userEvent.setup();
      renderForm();
      fill(valid);

      await user.type(screen.getByLabelText('Confirm password'), '{Enter}');

      await waitFor(() => {
        expect(setupRoot).toHaveBeenCalledTimes(1);
      });
      expect(setupRoot.mock.calls[0]?.[0]).toEqual(valid);
    });
  });

  describe('success', () => {
    it('toasts green, adopts the response, releases the form and opens /dashboard as root', async () => {
      setupRoot.mockResolvedValue(rootResponse);
      renderForm();
      fill(valid);

      fireEvent.click(screen.getByRole('button', CREATE));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({ to: '/dashboard', replace: true }),
        );
      });
      expect(showToast.success).toHaveBeenCalledTimes(1);
      expect(showToast.success).toHaveBeenCalledWith(
        'Root account created',
        'You are signed in as root.',
        undefined,
      );
      expect(showToast.error).not.toHaveBeenCalled();
      expect(authStorage.get()).toMatchObject({ username: 'owner', role: 'root' });
      expect(authStorage.getToken()).toBe('root-access-token');
      expect(apiClient.client.getToken()).toBe('root-access-token');
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockInvalidate.mock.invocationCallOrder[0]).toBeLessThan(
        mockNavigate.mock.invocationCallOrder[0] ?? 0,
      );
    });
  });

  describe('errors', () => {
    it('shows This username is already taken under Username plus a red toast, keeping the passwords', async () => {
      setupRoot.mockRejectedValue(
        apiError(409, 'AUTH_USERNAME_TAKEN', {
          fieldErrors: {
            username: { code: 'AUTH_USERNAME_TAKEN', message: 'Username already taken' },
          },
        }),
      );
      renderForm();
      fill(valid);

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(await screen.findByText('This username is already taken')).toBeInTheDocument();
      expect(showToast.error).toHaveBeenCalledWith(
        'Username already taken',
        'Choose a different username.',
        undefined,
      );
      expect(screen.queryByText('Choose a different username.')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByLabelText('Username')).toHaveFocus();
      });
      expect(screen.getByLabelText('Password')).toHaveValue(valid.password);
      expect(screen.getByLabelText('Confirm password')).toHaveValue(valid.confirmPassword);
      expect(mockNavigate).not.toHaveBeenCalled();

      fill({ username: 'someone-else' });
      expect(screen.queryByText('This username is already taken')).not.toBeInTheDocument();
    });

    it('shows server field errors inline with a red toast and no alert box', async () => {
      setupRoot.mockRejectedValue(
        apiError(400, 'VALIDATION_FAILED', {
          fieldErrors: { password: { code: 'SERVER_RULE', message: 'Password is too common' } },
        }),
      );
      renderForm();
      fill(valid);

      fireEvent.click(screen.getByRole('button', CREATE));

      expect(await screen.findByText('Password is too common')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toHaveFocus();
      });
      expect(showToast.error).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText('Please review the highlighted fields and correct any invalid values.'),
      ).not.toBeInTheDocument();
    });

    it.each([
      [
        'AUTH_SETUP_SESSION_EXPIRED',
        401,
        'Setup session expired',
        'Restart Aegis to create new setup credentials.',
      ],
      [
        'AUTH_SETUP_ALREADY_COMPLETE',
        409,
        'Setup is already complete',
        'Sign in with your account to continue.',
      ],
    ])(
      '%s toasts red, clears the session and opens /sign-in',
      async (errorCode, status, title, description) => {
        setupRoot.mockRejectedValue(apiError(status, errorCode));
        renderForm();
        fill(valid);

        fireEvent.click(screen.getByRole('button', CREATE));

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/sign-in', replace: true }),
          );
        });
        expect(showToast.error).toHaveBeenCalledTimes(1);
        expect(showToast.error).toHaveBeenCalledWith(title, description, undefined);
        expect(showToast.success).not.toHaveBeenCalled();
        expect(authStorage.get()).toBeNull();
        expect(authStorage.getToken()).toBeNull();
        expect(apiClient.client.getToken()).toBeNull();
        expect(mockInvalidate).toHaveBeenCalled();
      },
    );

    it.each([
      [
        'a 429',
        apiError(429, 'AUTH_RATE_LIMIT_EXCEEDED'),
        'Too Many Requests',
        'Too many attempts detected. Please wait a moment before trying again.',
      ],
      [
        'a 403 (not a setup session)',
        apiError(403, 'AUTH_FORBIDDEN_ADMIN_REQUIRED'),
        'Access Denied',
        'Administrator privileges are required to perform this action.',
      ],
      [
        'a 5xx',
        apiError(500, 'INTERNAL_SERVER_ERROR'),
        'Internal Server Error',
        'An unexpected error occurred on the server. Please try again.',
      ],
      [
        'a network error',
        new TypeError('Failed to fetch'),
        'Could not create the root account',
        'Could not reach the server. Check your connection and try again.',
      ],
    ])(
      '%s shows a red toast and the alert box, keeps the values and re-enables the form',
      async (_name, error, title, description) => {
        setupRoot.mockRejectedValue(error);
        renderForm();
        fill(valid);

        fireEvent.click(screen.getByRole('button', CREATE));

        expect(await screen.findByRole('alert')).toHaveTextContent(description);
        expect(showToast.error).toHaveBeenCalledTimes(1);
        expect(showToast.error).toHaveBeenCalledWith(title, description, undefined);
        expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(authStorage.get()?.role).toBe('setup');
        expect(screen.getByLabelText('Username')).toBeEnabled();
        expect(screen.getByLabelText('Username')).toHaveValue(valid.username);
        await waitFor(() => {
          expect(screen.getByRole('button', CREATE)).toHaveFocus();
        });
      },
    );
  });

  describe('Sign out', () => {
    it('ends the server session, clears local state and opens /sign-in with replace, without a toast', async () => {
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout').mockResolvedValue(undefined);
      renderForm();

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({ to: '/sign-in', replace: true }),
        );
      });
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(mockInvalidate).toHaveBeenCalled();
      expect(authStorage.get()).toBeNull();
      expect(authStorage.getToken()).toBeNull();
      expect(apiClient.client.getToken()).toBeNull();
      expect(setupRoot).not.toHaveBeenCalled();
      expect(showToast.success).not.toHaveBeenCalled();
      expect(showToast.error).not.toHaveBeenCalled();
    });

    it('waits for the sign-out call before it invalidates the router and navigates, in that order', async () => {
      let settle!: () => void;
      const logoutSpy = vi.spyOn(apiClient.auth, 'logout').mockReturnValue(
        new Promise<void>(resolve => {
          settle = resolve;
        }),
      );
      renderForm();

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));

      expect(mockInvalidate).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();

      settle();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(mockInvalidate).toHaveBeenCalledTimes(1);
      expect(logoutSpy.mock.invocationCallOrder[0]).toBeLessThan(
        mockInvalidate.mock.invocationCallOrder[0],
      );
      expect(mockInvalidate.mock.invocationCallOrder[0]).toBeLessThan(
        mockNavigate.mock.invocationCallOrder[0],
      );
      expect(authStorage.get()).toBeNull();
    });
  });
});
