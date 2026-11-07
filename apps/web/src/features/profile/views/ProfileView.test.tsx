import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfileDto } from '@dsm/api-contracts';

import { ThemeProvider } from '../../theme';
import * as queriesModule from '../api/profile.queries';

import { ProfileView } from './ProfileView';

vi.mock('../../auth', () => ({
  useAuth: () => ({
    user: null,
    updateUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('ProfileView', () => {
  let queryClient: QueryClient;

  const mockProfile: UserProfileDto = {
    id: 'user-admin-1',
    username: 'admin',
    displayName: 'Chief Operator',
    email: 'admin@dayz.local',
    role: 'admin',
    timezone: 'UTC',
    timeFormat: '24h',
    createdAt: '2026-11-01T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(queriesModule, 'useProfileQuery').mockReturnValue({
      data: mockProfile,
      isLoading: false,
    } as unknown as ReturnType<typeof queriesModule.useProfileQuery>);

    vi.spyOn(queriesModule, 'useSessionsQuery').mockReturnValue({
      data: { sessions: [], totalCount: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof queriesModule.useSessionsQuery>);
  });

  it('renders page header and all 4 functional cards', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ProfileView />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Operator Profile & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Identity & Regional Settings')).toBeInTheDocument();
    expect(screen.getByText('Visual Appearance & Theme')).toBeInTheDocument();
    expect(screen.getByText('Security & Password Rotation')).toBeInTheDocument();
    expect(screen.getByText('Active Operator Sessions')).toBeInTheDocument();
  });

  it('renders loading state when profile is undefined or loading', () => {
    vi.spyOn(queriesModule, 'useProfileQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof queriesModule.useProfileQuery>);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ProfileView />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Operator Profile & Preferences')).toBeInTheDocument();
  });
});
