import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APPLIANCE_NAVIGATION_SECTIONS,
  FeatureFlagsProvider,
  SERVER_NAVIGATION_SECTIONS,
  useLayoutStore,
  USER_NAVIGATION_SECTIONS,
} from '@aegis/web/core';
import { AuthProvider } from '@aegis/web/features/auth';
import { authStorage } from '@aegis/web/features/auth/auth.storage';
import type { AuthUser } from '@aegis/web/features/auth/auth.types';

import { Sidebar } from './Sidebar';

const mockLocation = { pathname: '/dashboard' };

const mockActiveServer = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'dayz (local)',
};

const mockUseActiveServer = vi.fn();
const mockUseNavigationContext = vi.fn();

vi.mock('./ServerSelector', () => ({
  ServerSelector: () => <div>dayz (local)</div>,
}));

vi.mock('@aegis/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/web/core')>();
  return {
    ...actual,
    useActiveServer: () => mockUseActiveServer(),
    useNavigationContext: () => mockUseNavigationContext(),
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    inactiveProps,
    ...props
  }: {
    children: ReactNode;
    to: string;
    search?: unknown;
    activeProps?: unknown;
    inactiveProps?: unknown;
  }) => {
    const resolvedSearch = typeof search === 'function' ? search({}) : search;
    return (
      <a
        href={to}
        data-search={resolvedSearch !== undefined ? JSON.stringify(resolvedSearch) : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  useLocation: () => mockLocation,
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

function renderSidebar(initialFlags?: Parameters<typeof FeatureFlagsProvider>[0]['initialFlags']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagsProvider initialFlags={initialFlags}>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLayoutStore.setState({ isMobileSidebarOpen: false });
    document.body.style.overflow = '';
    mockLocation.pathname = '/dashboard';
    authStorage.set(adminUser, false);

    mockUseActiveServer.mockReturnValue({
      activeServer: mockActiveServer,
      servers: [mockActiveServer],
      activeServerId: mockActiveServer.id,
      isLoading: false,
      error: null,
      setActiveServerId: vi.fn(),
    });

    mockUseNavigationContext.mockReturnValue({
      scope: 'server',
      isAppliance: false,
      sections: SERVER_NAVIGATION_SECTIONS,
      searchPolicy: 'preserve-server',
    });
  });

  describe('Server Scope Rendering', () => {
    it('renders ServerSelector, server sections, and links with server search params', () => {
      renderSidebar();

      expect(screen.getByRole('complementary', { name: 'Primary Navigation' })).toBeInTheDocument();
      expect(screen.getByText('AEGIS')).toBeInTheDocument();
      expect(screen.getByText('CONSOLE')).toBeInTheDocument();
      expect(screen.getByText('dayz (local)')).toBeInTheDocument();

      // Server Sections
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.getByText('Observability')).toBeInTheDocument();
      expect(screen.getByText('World')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();

      // Appliance Sections should NOT be in server scope
      expect(screen.queryByText('Infrastructure')).not.toBeInTheDocument();
      expect(screen.queryByText('Appliance')).not.toBeInTheDocument();

      // Verify links and serverId search preservation
      const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(dashboardLink).toHaveAttribute(
        'data-search',
        JSON.stringify({ serverId: mockActiveServer.id }),
      );

      const systemLink = screen.getByRole('link', { name: /system telemetry/i });
      expect(systemLink).toHaveAttribute('href', '/system');
      expect(systemLink).toHaveAttribute(
        'data-search',
        JSON.stringify({ serverId: mockActiveServer.id }),
      );

      expect(screen.getByRole('link', { name: /players/i })).toHaveAttribute('href', '/players');
      expect(screen.getByRole('link', { name: /mods/i })).toHaveAttribute('href', '/mods');
      expect(screen.getByRole('link', { name: /maintenance/i })).toHaveAttribute(
        'href',
        '/maintenance',
      );
      expect(screen.getByRole('link', { name: /server logs/i })).toHaveAttribute(
        'href',
        '/logs/rpt',
      );
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
    });

    it('prunes world navigation links when worldMap feature flag is disabled', () => {
      renderSidebar({ worldMap: false });

      expect(screen.queryByText('World')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /tactical map/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /loot heatmap/i })).not.toBeInTheDocument();
    });

    it('prunes mods, economy workbench, and discord webhooks when their respective flags are disabled', () => {
      renderSidebar({
        modsManager: false,
        economyWorkbench: false,
        discordNotifications: false,
      });

      expect(screen.queryByRole('link', { name: /mods/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /types workbench/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /discord webhooks/i })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /server settings/i })).toBeInTheDocument();
    });
  });

  describe('Appliance Scope Rendering (Amendment 1)', () => {
    beforeEach(() => {
      mockUseNavigationContext.mockReturnValue({
        scope: 'appliance',
        isAppliance: true,
        sections: APPLIANCE_NAVIGATION_SECTIONS,
        searchPolicy: 'clear-all',
      });
      mockLocation.pathname = '/settings/steam';
    });

    it('renders back button [ ← activeServer.name ] instead of ServerSelector in appliance scope', () => {
      renderSidebar();

      // ServerSelector should NOT be present
      expect(screen.getByText('dayz (local)')).toBeInTheDocument(); // activeServer name is in back button
      const backButton = screen.getByRole('link', { name: 'Back to server console' });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('href', '/dashboard');
      expect(backButton).toHaveAttribute(
        'data-search',
        JSON.stringify({ serverId: mockActiveServer.id }),
      );
      expect(within(backButton).getByText('Console Scope')).toBeInTheDocument();
      expect(within(backButton).getByText('dayz (local)')).toBeInTheDocument();
    });

    it('renders fallback label "Server Console" when activeServer is null in appliance scope', () => {
      mockUseActiveServer.mockReturnValue({
        activeServer: null,
        servers: [],
        activeServerId: null,
        isLoading: false,
        error: null,
        setActiveServerId: vi.fn(),
      });

      renderSidebar();

      const backButton = screen.getByRole('link', { name: 'Back to server console' });
      expect(backButton).toBeInTheDocument();
      expect(within(backButton).getByText('Server Console')).toBeInTheDocument();
      expect(backButton).not.toHaveAttribute('data-search');
    });

    it('renders appliance navigation sections and links with clean search params search: () => ({})', () => {
      renderSidebar();

      // Appliance Sections
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Appliance')).toBeInTheDocument();

      // Server sections should NOT be rendered
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
      expect(screen.queryByText('Operations')).not.toBeInTheDocument();
      expect(screen.queryByText('Observability')).not.toBeInTheDocument();
      expect(screen.queryByText('World')).not.toBeInTheDocument();
      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();

      // Links
      const steamLink = screen.getByRole('link', { name: /steam cmd & workshop/i });
      expect(steamLink).toBeInTheDocument();
      expect(steamLink).toHaveAttribute('href', '/settings/steam');
      expect(steamLink).toHaveAttribute('data-search', '{}');

      const appLink = screen.getByRole('link', { name: /appliance settings/i });
      expect(appLink).toBeInTheDocument();
      expect(appLink).toHaveAttribute('href', '/settings/app');
      expect(appLink).toHaveAttribute('data-search', '{}');

      const operatorsLink = screen.getByRole('link', { name: /console operators/i });
      expect(operatorsLink).toBeInTheDocument();
      expect(operatorsLink).toHaveAttribute('href', '/settings/operators');
      expect(operatorsLink).toHaveAttribute('data-search', '{}');

      const auditLink = screen.getByRole('link', { name: /audit log/i });
      expect(auditLink).toBeInTheDocument();
      expect(auditLink).toHaveAttribute('href', '/audit');
      expect(auditLink).toHaveAttribute('data-search', '{}');
    });

    it('hides admin-only links (Console operators, Steam CMD) for non-admin users in appliance scope', () => {
      authStorage.set(moderatorUser, false);

      renderSidebar();

      expect(screen.queryByRole('link', { name: /console operators/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /steam cmd & workshop/i })).not.toBeInTheDocument();

      // Non-admin links remain visible
      expect(screen.getByRole('link', { name: /appliance settings/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument();
    });
  });

  describe('User Scope Rendering', () => {
    beforeEach(() => {
      mockUseNavigationContext.mockReturnValue({
        scope: 'user',
        isAppliance: false,
        isUser: true,
        sections: USER_NAVIGATION_SECTIONS,
        searchPolicy: 'clear-all',
      });
      mockLocation.pathname = '/profile';
    });

    it('renders back button [ ← activeServer.name ] with Operator Scope label and Account section', () => {
      renderSidebar();

      const backButton = screen.getByRole('link', { name: 'Back to server console' });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('href', '/dashboard');
      expect(within(backButton).getByText('Operator Scope')).toBeInTheDocument();
      expect(within(backButton).getByText('dayz (local)')).toBeInTheDocument();

      expect(screen.getByText('Account')).toBeInTheDocument();
      const profileLink = screen.getByRole('link', { name: /operator profile/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(profileLink).toHaveAttribute('data-search', '{}');
    });
  });

  describe('Mobile Off-Canvas Drawer', () => {
    it('does not render mobile backdrop and drawer when closed', () => {
      renderSidebar();

      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-sidebar-drawer')).not.toBeInTheDocument();
    });

    it('renders mobile drawer and backdrop when isMobileSidebarOpen is true', () => {
      renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-sidebar-drawer')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument();
    });

    it('closes mobile drawer when clicking backdrop or close button', () => {
      renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      // Click backdrop
      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      fireEvent.click(backdrop);
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);

      // Re-open and click close button (X)
      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });
      const closeBtn = screen.getByRole('button', { name: 'Close navigation' });
      fireEvent.click(closeBtn);
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });

    it('closes mobile drawer when clicking a navigation link inside the drawer', () => {
      renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      const drawer = screen.getByTestId('mobile-sidebar-drawer');
      const drawerLinks = drawer.querySelectorAll('a');
      expect(drawerLinks.length).toBeGreaterThan(0);

      fireEvent.click(drawerLinks[0]);
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });

    it('closes mobile drawer on Escape key press but ignores other keys', () => {
      renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      // Non-Escape key does not close
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

      // Escape key closes
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });

    it('locks body scroll when mobile drawer is open and restores it when closed or unmounted', () => {
      expect(document.body.style.overflow).toBe('');

      const { unmount } = renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        useLayoutStore.getState().closeMobileSidebar();
      });

      expect(document.body.style.overflow).toBe('');

      // Also verify unmount cleanup
      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('auto-closes mobile drawer on route pathname change', () => {
      const { rerender } = renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

      // Change route pathname and re-render
      mockLocation.pathname = '/settings/server';
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider>
            <FeatureFlagsProvider>
              <Sidebar />
            </FeatureFlagsProvider>
          </AuthProvider>
        </QueryClientProvider>,
      );

      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });

    it('renders brand header as a link navigating to /dashboard and closes mobile drawer on click', () => {
      const { container } = renderSidebar();

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      const mobileDrawer = container.querySelector('#mobile-sidebar');
      expect(mobileDrawer).toBeInTheDocument();

      const brandLink = within(mobileDrawer as HTMLElement).getByRole('link', {
        name: 'Aegis Console Dashboard',
      });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute('href', '/dashboard');
      expect(brandLink).toHaveClass('cursor-pointer');

      const logoSvg = brandLink.querySelector('svg.aegis-logo');
      expect(logoSvg).toBeInTheDocument();
      expect(logoSvg).toHaveClass('animate-on-hover');
      expect(logoSvg).not.toHaveClass('is-loading');

      fireEvent.click(brandLink);
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });
  });

  it('renders brand header as a link navigating to /dashboard with animate-on-hover logo in desktop sidebar', () => {
    const { container } = renderSidebar();

    const desktopSidebar = container.querySelector('#app-sidebar');
    expect(desktopSidebar).toBeInTheDocument();

    const brandLink = within(desktopSidebar as HTMLElement).getByRole('link', {
      name: 'Aegis Console Dashboard',
    });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/dashboard');
    expect(brandLink).toHaveClass('cursor-pointer');

    const logoSvg = brandLink.querySelector('svg.aegis-logo');
    expect(logoSvg).toBeInTheDocument();
    expect(logoSvg).toHaveClass('animate-on-hover');
    expect(logoSvg).not.toHaveClass('is-loading');
  });
});
