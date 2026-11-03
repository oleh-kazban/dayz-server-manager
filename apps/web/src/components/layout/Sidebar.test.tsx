import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagsProvider } from '@dsm/web/core';
import { AuthProvider } from '@dsm/web/features/auth';
import { authStorage } from '@dsm/web/features/auth/auth.storage';
import type { AuthUser } from '@dsm/web/features/auth/auth.types';

import { Sidebar } from './Sidebar';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    inactiveProps,
    ...props
  }: {
    children: ReactNode;
    to: string;
    activeProps?: unknown;
    inactiveProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}));

const adminUser: AuthUser = {
  id: 'usr-admin',
  username: 'admin',
  email: 'admin@dayz.local',
  role: 'admin',
  roles: ['admin'],
};

const moderatorUser: AuthUser = {
  id: 'usr-mod',
  username: 'moderator',
  email: 'mod@dayz.local',
  role: 'moderator',
  roles: ['moderator'],
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStorage.set(adminUser, false);
  });

  it('renders all sections and links when all feature flags are enabled for admin', () => {
    render(
      <AuthProvider>
        <FeatureFlagsProvider>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
    expect(screen.getByText('OUTLIVE')).toBeInTheDocument();
    expect(screen.getByText('dayz (local)')).toBeInTheDocument();

    // Sections
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();

    // Links
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /system telemetry/i })).toHaveAttribute(
      'href',
      '/system',
    );
    expect(screen.getByRole('link', { name: /players/i })).toHaveAttribute('href', '/players');
    expect(screen.getByRole('link', { name: /mods/i })).toHaveAttribute('href', '/mods');
    expect(screen.getByRole('link', { name: /maintenance/i })).toHaveAttribute(
      'href',
      '/maintenance',
    );
    expect(screen.getByRole('link', { name: /audit log/i })).toHaveAttribute('href', '/audit');
    expect(screen.getByRole('link', { name: /server logs/i })).toHaveAttribute('href', '/logs/rpt');
    expect(screen.getByRole('link', { name: /tactical map/i })).toHaveAttribute(
      'href',
      '/world/map',
    );
    expect(screen.getByRole('link', { name: /loot heatmap/i })).toHaveAttribute(
      'href',
      '/world/loot',
    );
    expect(screen.getByRole('link', { name: /types workbench/i })).toHaveAttribute(
      'href',
      '/economy/types',
    );
    expect(screen.getByRole('link', { name: /server settings/i })).toHaveAttribute(
      'href',
      '/settings/server',
    );
    expect(screen.getByRole('link', { name: /discord webhooks/i })).toHaveAttribute(
      'href',
      '/settings/discord',
    );
    expect(screen.getByRole('link', { name: /appliance settings/i })).toHaveAttribute(
      'href',
      '/settings/app',
    );
    expect(screen.getByRole('link', { name: /console operators/i })).toHaveAttribute(
      'href',
      '/settings/operators',
    );
  });

  it('prunes world navigation links when worldMap feature flag is disabled', () => {
    render(
      <AuthProvider>
        <FeatureFlagsProvider initialFlags={{ worldMap: false }}>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    expect(screen.queryByText('World')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tactical map/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /loot heatmap/i })).not.toBeInTheDocument();
  });

  it('prunes mods and economy workbench when their respective flags are disabled', () => {
    render(
      <AuthProvider>
        <FeatureFlagsProvider initialFlags={{ modsManager: false, economyWorkbench: false }}>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    expect(screen.queryByRole('link', { name: /mods/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /types workbench/i })).not.toBeInTheDocument();
  });

  it('hides console operators link for non-admin users', () => {
    authStorage.set(moderatorUser, false);

    render(
      <AuthProvider>
        <FeatureFlagsProvider>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    expect(screen.queryByRole('link', { name: /console operators/i })).not.toBeInTheDocument();
  });
});
