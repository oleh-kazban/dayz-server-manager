import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@dsm/ui';

import * as mutationsModule from '../api/profile.mutations';

import { PasswordRotationCard } from './PasswordRotationCard';

vi.mock('@dsm/ui', async () => {
  const actual = await vi.importActual<typeof import('@dsm/ui')>('@dsm/ui');
  return {
    ...actual,
    showToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('PasswordRotationCard', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mutationsModule, 'useChangePasswordMutation').mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof mutationsModule.useChangePasswordMutation>);
  });

  it('renders all password input fields and policy notice', () => {
    render(<PasswordRotationCard />);

    expect(screen.getByText('Security & Password Rotation')).toBeInTheDocument();
    expect(screen.getByText('Session Invalidation Policy')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('validates required current password', () => {
    render(<PasswordRotationCard />);

    const submitBtn = screen.getByRole('button', { name: 'Rotate Credentials' });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Current password is required.')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'minimum length of 8 characters',
      newPass: 'short1!',
      confirmPass: 'short1!',
      expectedError: 'New password must be at least 8 characters in length.',
    },
    {
      name: 'complexity (number or special character required)',
      newPass: 'allletterspassword',
      confirmPass: 'allletterspassword',
      expectedError: 'New password must contain at least 1 number or special character.',
    },
    {
      name: 'confirmation match',
      newPass: 'validPass1!',
      confirmPass: 'mismatchPass2@',
      expectedError: 'New password and confirmation do not match.',
    },
  ])('validates new password $name', ({ newPass, confirmPass, expectedError }) => {
    render(<PasswordRotationCard />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldPass1!' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: newPass } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: confirmPass },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rotate Credentials' }));

    expect(screen.getByText(expectedError)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits valid rotation and resets inputs on success', () => {
    render(<PasswordRotationCard />);

    const currentInput = screen.getByLabelText('Current Password');
    const newInput = screen.getByLabelText('New Password');
    const confirmInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentInput, { target: { value: 'currentPass1!' } });
    fireEvent.change(newInput, { target: { value: 'brandNewPass2@' } });
    fireEvent.change(confirmInput, { target: { value: 'brandNewPass2@' } });

    fireEvent.click(screen.getByRole('button', { name: 'Rotate Credentials' }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        currentPassword: 'currentPass1!',
        newPassword: 'brandNewPass2@',
        confirmPassword: 'brandNewPass2@',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );

    const options = mockMutate.mock.calls[0][1];
    act(() => {
      options.onSuccess();
    });

    expect(showToast.success).toHaveBeenCalledWith(
      'Password Rotated',
      'Your password was updated and all other active sessions have been invalidated.',
    );
    expect(currentInput).toHaveValue('');
    expect(newInput).toHaveValue('');
    expect(confirmInput).toHaveValue('');
  });

  it('handles rotation refusal and displays error toast', () => {
    render(<PasswordRotationCard />);

    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'wrongPass1!' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'validPass1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'validPass1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rotate Credentials' }));

    const options = mockMutate.mock.calls[0][1];
    options.onError({
      response: { data: { message: 'Current password does not match' } },
    });

    expect(showToast.error).toHaveBeenCalledWith(
      'Rotation Refused',
      'Current password does not match',
    );

    // Error with plain message property
    options.onError(new Error('Network error'));
    expect(showToast.error).toHaveBeenCalledWith('Rotation Refused', 'Network error');

    // Error with no message / empty object / primitive fallback
    options.onError('unknown string error');
    expect(showToast.error).toHaveBeenCalledWith('Rotation Refused', 'Failed to rotate password');
  });
});
