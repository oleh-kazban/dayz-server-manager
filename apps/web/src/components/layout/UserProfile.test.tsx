import type { ReactNode } from 'react';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnsavedChangesScope, useUnsavedChangesGuard } from '@aegis/web/core';
import { AuthProvider } from '@aegis/web/features/auth';
import { authStorage } from '@aegis/web/features/auth/auth.storage';
import type { AuthUser } from '@aegis/web/features/auth/auth.types';

import { UserProfile } from './UserProfile';

const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
}));

function DirtyForm() {
  useUnsavedChangesGuard(true);
  return null;
}

const testUser: AuthUser = {
  id: 'usr-1',
  username: 'Alex Kovac',
  email: 'alex@dayz.local',
  role: 'admin',
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
    expect(screen.getByTitle('View profile & preferences')).toHaveAttribute('href', '/profile');
  });

  it.each([
    ['root', 'Root'],
    ['admin', 'Administrator'],
    ['setup', 'Setup'],
  ] as const)('labels the %s role as %s without substitution', (role, label) => {
    authStorage.set({ ...testUser, role }, false);

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    for (const other of ['Root', 'Administrator', 'Setup'].filter(l => l !== label)) {
      expect(screen.queryByText(other)).not.toBeInTheDocument();
    }
  });

  it('renders custom displayName when provided instead of username', () => {
    authStorage.set(
      {
        ...testUser,
        displayName: 'Commander Kovac',
      },
      false,
    );

    render(
      <AuthProvider>
        <UserProfile />
      </AuthProvider>,
    );

    expect(screen.getByText('CK')).toBeInTheDocument();
    expect(screen.getByText('Commander Kovac')).toBeInTheDocument();
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
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in', ignoreBlocker: true });
      expect(authStorage.get()).toBeNull();
    });
  });

  it('asks before signing out over unsaved form changes (DSM-00138)', async () => {
    render(
      <AuthProvider>
        <UnsavedChangesScope>
          <DirtyForm />
          <UserProfile />
        </UnsavedChangesScope>
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(authStorage.get()).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Discard changes' }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in', ignoreBlocker: true });
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

    expect(screen.getByText('AD')).toBeInTheDocument();
    expect(screen.getAllByText('Administrator')).toHaveLength(2);
  });
});
