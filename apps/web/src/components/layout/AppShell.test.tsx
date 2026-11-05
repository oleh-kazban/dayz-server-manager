import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagsProvider, queryClient } from '@dsm/web/core';
import { AuthProvider } from '@dsm/web/features/auth';
import { ThemeProvider } from '@dsm/web/features/theme';

import { AppShell } from './AppShell';

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
  useLocation: () => ({ pathname: '/dashboard' }),
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Sidebar, Header, and page content within the layout frame', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              <AppShell>
                <div data-testid="dashboard-content">Dashboard View</div>
              </AppShell>
            </FeatureFlagsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });
});
