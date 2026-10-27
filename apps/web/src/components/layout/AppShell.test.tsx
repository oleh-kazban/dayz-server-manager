import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@dsm/features/auth';
import { ThemeProvider } from '@dsm/features/theme';

import { AppShell } from './AppShell';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
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
      <ThemeProvider>
        <AuthProvider>
          <AppShell>
            <div data-testid="dashboard-content">Dashboard View</div>
          </AppShell>
        </AuthProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });
});
