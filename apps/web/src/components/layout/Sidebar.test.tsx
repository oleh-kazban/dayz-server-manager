import type { ReactNode } from 'react';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagsProvider, useLayoutStore } from '@dsm/web/core';
import { AuthProvider } from '@dsm/web/features/auth';
import { authStorage } from '@dsm/web/features/auth/auth.storage';
import type { AuthUser } from '@dsm/web/features/auth/auth.types';

import { Sidebar } from './Sidebar';

const mockLocation = { pathname: '/dashboard' };

vi.mock('./ServerSelector', () => ({
  ServerSelector: () => <div>dayz (local)</div>,
}));

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

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLayoutStore.setState({ isMobileSidebarOpen: false });
    document.body.style.overflow = '';
    mockLocation.pathname = '/dashboard';
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
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByRole('link', { name: 'Outlive Project Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
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

  it('prunes mods, economy workbench, and discord webhooks when their respective flags are disabled', () => {
    render(
      <AuthProvider>
        <FeatureFlagsProvider
          initialFlags={{
            modsManager: false,
            economyWorkbench: false,
            discordNotifications: false,
          }}
        >
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    expect(screen.queryByRole('link', { name: /mods/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /types workbench/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /discord webhooks/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /server settings/i })).toBeInTheDocument();
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

  describe('Mobile Off-Canvas Drawer', () => {
    it('does not render mobile backdrop and drawer when closed', () => {
      render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-sidebar-drawer')).not.toBeInTheDocument();
    });

    it('renders mobile drawer and backdrop when isMobileSidebarOpen is true', () => {
      render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-sidebar-drawer')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument();
    });

    it('closes mobile drawer when clicking backdrop or close button', () => {
      render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

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
      render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

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
      render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

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

      const { unmount } = render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

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
      const { rerender } = render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });
      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

      // Change route pathname and re-render
      mockLocation.pathname = '/settings';
      rerender(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

      expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
    });

    it('renders brand header as a link navigating to /dashboard and closes mobile drawer on click', () => {
      const { container } = render(
        <AuthProvider>
          <FeatureFlagsProvider>
            <Sidebar />
          </FeatureFlagsProvider>
        </AuthProvider>,
      );

      act(() => {
        useLayoutStore.getState().openMobileSidebar();
      });

      const mobileDrawer = container.querySelector('#mobile-sidebar');
      expect(mobileDrawer).toBeInTheDocument();

      const brandLink = within(mobileDrawer as HTMLElement).getByRole('link', {
        name: 'Outlive Project Dashboard',
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
    const { container } = render(
      <AuthProvider>
        <FeatureFlagsProvider>
          <Sidebar />
        </FeatureFlagsProvider>
      </AuthProvider>,
    );

    const desktopSidebar = container.querySelector('#app-sidebar');
    expect(desktopSidebar).toBeInTheDocument();

    const brandLink = within(desktopSidebar as HTMLElement).getByRole('link', {
      name: 'Outlive Project Dashboard',
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
