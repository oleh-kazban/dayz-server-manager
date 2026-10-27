import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@dsm/features/auth';
import { authStorage } from '@dsm/features/auth/auth.storage';
import type { AuthUser } from '@dsm/features/auth/auth.types';

import { UserProfile } from './UserProfile';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
}));

const testUser: AuthUser = {
  id: 'usr-1',
  username: 'Alex Kovac',
  email: 'alex@dayz.local',
  role: 'admin',
  roles: ['admin'],
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStorage.set(testUser, false);
  });

  it('renders user initials, display name, and role title', () => {
    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>,
    );

    expect(screen.getByText('AK')).toBeInTheDocument();
    expect(screen.getByText('Alex Kovac')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('triggers logout, router invalidation, and navigation to /sign-in on logout button click', async () => {
    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>,
    );

    const logoutBtn = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in' });
      expect(authStorage.get()).toBeNull();
    });
  });

  it('renders fallback Administrator details when user is null', () => {
    authStorage.clear();
    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>,
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
  });
});
