import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@dsm/web/features/theme';

import { Header } from './Header';

const mockUseActiveServer = vi.fn();
const mockLocation = { pathname: '/dashboard' };
const mockUseMatches = vi.fn();

vi.mock('@dsm/web/core', () => ({
  useActiveServer: () => mockUseActiveServer(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    search?: unknown;
  }) => (
    <a href={to} data-search={JSON.stringify(search)} {...props}>
      {children}
    </a>
  ),
  useLocation: () => mockLocation,
  useMatches: () => mockUseMatches(),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/dashboard';
    mockUseMatches.mockReturnValue([{ staticData: { breadcrumb: 'Dashboard' } }]);
    mockUseActiveServer.mockReturnValue({
      activeServer: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Chernarus Survival',
        status: 'running',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        isDefault: true,
      },
      isLoading: false,
    });
  });

  it('renders breadcrumbs with dynamic active server name on dashboard', () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    const activeServerEl = screen.getByText('Chernarus Survival');
    expect(activeServerEl).toBeInTheDocument();
    expect(activeServerEl).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Documentation and help' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toBeInTheDocument();
  });

  it('renders full hierarchy with subroute title when navigating to /settings/server', () => {
    mockLocation.pathname = '/settings/server';
    mockUseMatches.mockReturnValue([
      { staticData: {} },
      { staticData: { breadcrumb: 'Server settings' } },
    ]);
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByText('Chernarus Survival')).toBeInTheDocument();
    const leaf = screen.getByText('Server settings');
    expect(leaf).toBeInTheDocument();
    expect(leaf).toHaveAttribute('aria-current', 'page');
  });

  it('renders skeleton placeholder while server details are loading', () => {
    mockUseActiveServer.mockReturnValue({
      activeServer: null,
      isLoading: true,
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('breadcrumb-server-skeleton')).toBeInTheDocument();
  });

  it('renders Workspace > Servers without trailing placeholder when no server is selected on dashboard', () => {
    mockUseActiveServer.mockReturnValue({
      activeServer: null,
      isLoading: false,
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    const serversEl = screen.getByText('Servers');
    expect(serversEl).toBeInTheDocument();
    expect(serversEl).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('No server selected')).not.toBeInTheDocument();
  });

  it('resolves deepest route match staticData.breadcrumb from nested match arrays', () => {
    mockLocation.pathname = '/logs/adm';
    mockUseMatches.mockReturnValue([
      { id: '__root__', staticData: {} },
      { id: '/authed', staticData: { breadcrumb: 'Workspace Root' } },
      { id: '/authed/logs/adm', staticData: { breadcrumb: 'Administration logs' } },
      { id: '/authed/logs/adm/', staticData: {} },
    ]);

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    const leaf = screen.getByText('Administration logs');
    expect(leaf).toBeInTheDocument();
    expect(leaf).toHaveAttribute('aria-current', 'page');
  });

  it('renders both server skeleton and subpage breadcrumb when loading on a non-dashboard route', () => {
    mockLocation.pathname = '/settings/backups';
    mockUseMatches.mockReturnValue([{ staticData: { breadcrumb: 'Backups & retention' } }]);
    mockUseActiveServer.mockReturnValue({
      activeServer: null,
      isLoading: true,
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('breadcrumb-server-skeleton')).toBeInTheDocument();
    const leaf = screen.getByText('Backups & retention');
    expect(leaf).toBeInTheDocument();
    expect(leaf).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to "Settings" label on /settings/* when route match lacks staticData.breadcrumb and renders subpage trail without activeServer', () => {
    mockLocation.pathname = '/settings/custom';
    mockUseMatches.mockReturnValue([{ staticData: {} }]);
    mockUseActiveServer.mockReturnValue({
      activeServer: null,
      isLoading: false,
    });

    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByText('Servers')).toBeInTheDocument();
    const leaf = screen.getByText('Settings');
    expect(leaf).toBeInTheDocument();
    expect(leaf).toHaveAttribute('aria-current', 'page');
  });
});
