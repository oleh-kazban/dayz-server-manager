import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@aegis/api-client';
import type { UserProfileDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import * as mutationsModule from '../api/profile.mutations';

import { ProfileIdentityCard } from './ProfileIdentityCard';

vi.mock('@aegis/ui', async () => {
  const actual = await vi.importActual<typeof import('@aegis/ui')>('@aegis/ui');
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

describe('ProfileIdentityCard', () => {
  const mockMutate = vi.fn();

  const mockAdminProfile: UserProfileDto = {
    id: 'user-admin-1',
    username: 'admin',
    displayName: 'Commander Kovac',
    email: 'kovac@dayz.local',
    role: 'admin',
    timezone: 'Europe/Berlin',
    timeFormat: '24h',
    createdAt: '2026-11-01T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mutationsModule, 'useUpdateProfileMutation').mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof mutationsModule.useUpdateProfileMutation>);
  });

  it('hydrates form with profile data and renders role badge', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Commander Kovac')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kovac@dayz.local')).toBeInTheDocument();
  });

  it.each([
    ['root', 'ROOT'],
    ['setup', 'SETUP'],
  ] as const)('shows the real role %s as the %s tag', (role, tag) => {
    render(<ProfileIdentityCard profile={{ ...mockAdminProfile, role }} />);

    expect(screen.getByText(tag)).toBeInTheDocument();
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
  });

  it('renders minimal admin profile with ADMIN role tag and empty optional fields', () => {
    const minimalProfile: UserProfileDto = {
      ...mockAdminProfile,
      role: 'admin',
      displayName: null,
      email: null,
      timezone: 'UTC',
      timeFormat: '12h',
    };
    render(<ProfileIdentityCard profile={minimalProfile} />);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Administrator accounts have full permissions across all console operations.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name (Callsign)')).toHaveValue('');
    expect(screen.getByLabelText('Notification Email')).toHaveValue('');
  });

  it('handles custom timezone not in COMMON_TIMEZONES list', () => {
    const customTzProfile: UserProfileDto = {
      ...mockAdminProfile,
      timezone: 'Atlantic/Reykjavik',
    };
    render(<ProfileIdentityCard profile={customTzProfile} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Atlantic/Reykjavik');
  });

  it('rejects invalid email client-side without calling mutation and sets noValidate on form (QA-03)', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const emailInput = screen.getByLabelText('Notification Email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    const form = submitBtn.closest('form')!;
    expect(form).toHaveAttribute('noValidate');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();

    // Typing clears the custom email error
    fireEvent.change(emailInput, { target: { value: 'valid@dayz.local' } });
    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
  });

  it('ignores rapid duplicate submit clicks while updateProfileMutation is in flight (QA-01)', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    fireEvent.change(screen.getByLabelText('Display Name (Callsign)'), {
      target: { value: 'Edited Call' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    const form = submitBtn.closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledTimes(1);

    // Settle and verify subsequent submission works
    mockMutate.mock.calls[0][1].onSettled();
    fireEvent.submit(form);
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it('submits valid changes and triggers success toast', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const nameInput = screen.getByLabelText('Display Name (Callsign)');
    fireEvent.change(nameInput, { target: { value: 'New Call' } });

    // Toggle 24-hour time format
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    fireEvent.click(submitBtn);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'New Call',
        timeFormat: '12h',
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );

    // Invoke onSuccess callback
    const options = mockMutate.mock.calls[0][1];
    options.onSuccess();
    expect(showToast.success).toHaveBeenCalledWith(
      'Profile Updated',
      'Your identity and regional preferences have been saved.',
      undefined,
    );
  });

  it('highlights server fieldErrors inline AND fires a red error toast when the update fails', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    fireEvent.change(screen.getByLabelText('Display Name (Callsign)'), {
      target: { value: 'Edited Call' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));

    const options = mockMutate.mock.calls[0][1];
    act(() => {
      options.onError(
        new ApiError('Invalid IANA timezone identifier', 400, {
          statusCode: 400,
          error: 'Bad Request',
          errorCode: 'VALIDATION_FAILED',
          message: 'Invalid IANA timezone identifier',
          fieldErrors: {
            timezone: { code: 'INVALID_VALUE', message: 'Invalid IANA timezone identifier' },
          },
        }),
      );
    });
    expect(screen.getByText('Invalid IANA timezone identifier')).toBeInTheDocument();
    expect(showToast.error).toHaveBeenCalledWith(
      'Validation Error',
      'Please review the highlighted fields and correct any invalid values.',
      undefined,
    );

    // Non-API error -> toast with its message, no inline errors
    act(() => {
      options.onError(new Error('Network error'));
    });
    expect(showToast.error).toHaveBeenLastCalledWith(
      'Profile Update Failed',
      'Network error',
      undefined,
    );
    expect(screen.queryByText('Invalid IANA timezone identifier')).not.toBeInTheDocument();
  });

  it('keeps Save Preferences inert until something changes and focuses an invalid email on save (DSM-00137)', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);
    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    const emailInput = screen.getByLabelText('Notification Email');

    expect(submitBtn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.submit(submitBtn.closest('form')!);
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    expect(submitBtn).not.toHaveAttribute('aria-disabled');
    fireEvent.click(submitBtn);
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(emailInput).toHaveFocus();
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.change(emailInput, { target: { value: ' kovac@dayz.local ' } });
    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    expect(submitBtn).toHaveAttribute('aria-disabled', 'true');
  });

  it('updates timezone on select change and ignores empty change', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const select = screen.getByLabelText('Regional Timezone');
    fireEvent.change(select, { target: { value: 'Europe/Berlin' } });
    fireEvent.change(screen.getByLabelText('Display Name (Callsign)'), {
      target: { value: 'Edited Call' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    fireEvent.click(submitBtn);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'Europe/Berlin' }),
      expect.anything(),
    );

    // Fire empty value change (val falsy branch)
    fireEvent.change(select, { target: { value: '' } });
  });

  it('disables inputs when isLoading is true or mutation is pending', () => {
    vi.spyOn(mutationsModule, 'useUpdateProfileMutation').mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof mutationsModule.useUpdateProfileMutation>);

    render(<ProfileIdentityCard profile={mockAdminProfile} isLoading={true} />);

    expect(screen.getByLabelText('Display Name (Callsign)')).toBeDisabled();
    expect(screen.getByLabelText('Notification Email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeDisabled();
  });
});
