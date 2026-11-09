import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('renders moderator role badge with amber tag', () => {
    const modProfile: UserProfileDto = {
      ...mockAdminProfile,
      role: 'moderator',
    };
    render(<ProfileIdentityCard profile={modProfile} />);
    expect(screen.getByText('MODERATOR')).toBeInTheDocument();
  });

  it('renders viewer role badge with gray tag when profile is minimal', () => {
    const viewerProfile: UserProfileDto = {
      ...mockAdminProfile,
      role: 'viewer',
      displayName: null,
      email: null,
      timezone: 'UTC',
      timeFormat: '12h',
    };
    render(<ProfileIdentityCard profile={viewerProfile} />);
    expect(screen.getByText('VIEWER')).toBeInTheDocument();
  });

  it('handles custom timezone not in COMMON_TIMEZONES list', () => {
    const customTzProfile: UserProfileDto = {
      ...mockAdminProfile,
      timezone: 'Atlantic/Reykjavik',
    };
    render(<ProfileIdentityCard profile={customTzProfile} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Atlantic/Reykjavik');
  });

  it('rejects invalid email client-side without calling mutation', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const emailInput = screen.getByLabelText('Notification Email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
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
      'Profile updated',
      'Your identity and regional preferences have been saved.',
    );
  });

  it('triggers error toast when update mutation fails with error response', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const submitBtn = screen.getByRole('button', { name: 'Save Preferences' });
    fireEvent.click(submitBtn);

    const options = mockMutate.mock.calls[0][1];
    options.onError({
      response: { data: { message: 'Invalid timezone' } },
    });
    expect(showToast.error).toHaveBeenCalledWith('Update failed', 'Invalid timezone');

    // Test with plain Error message
    options.onError(new Error('Network error'));
    expect(showToast.error).toHaveBeenCalledWith('Update failed', 'Network error');

    // Test with unknown object fallback
    options.onError({});
    expect(showToast.error).toHaveBeenCalledWith('Update failed', 'Failed to update profile');
  });

  it('updates timezone on select change and ignores empty change', () => {
    render(<ProfileIdentityCard profile={mockAdminProfile} />);

    const select = screen.getByLabelText('Regional Timezone');
    fireEvent.change(select, { target: { value: 'Europe/Berlin' } });

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
