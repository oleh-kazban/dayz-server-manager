import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLayoutStore, useNotificationStore } from '@aegis/web/core';
import { useFaqStore } from '@aegis/web/features/faq';
import { ThemeProvider } from '@aegis/web/features/theme';

import { Header } from './Header';

const mockUseActiveServer = vi.fn();
const mockLocation = { pathname: '/dashboard' };
const mockUseMatches = vi.fn();

const renderHeader = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

vi.mock('@aegis/web/core', async () => {
  const actual = await vi.importActual<typeof import('@aegis/web/core')>('@aegis/web/core');
  return {
    ...actual,
    useActiveServer: () => mockUseActiveServer(),
  };
});

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
    useLayoutStore.setState({ isMobileSidebarOpen: false });
    useFaqStore.setState({ isOpen: false, activeTab: 'faq', searchQuery: '' });
    useNotificationStore.setState({ notifications: [] });
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

    expect(
      screen.getByRole('button', { name: /Notifications \(no unread\)/i }),
    ).toBeInTheDocument();
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

  it('toggles mobile sidebar store state and aria-expanded on burger menu click', () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(true);

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(useLayoutStore.getState().isMobileSidebarOpen).toBe(false);
  });

  describe('FAQ Modal Triggers and GUARD-02 Shortcut Collision Guard', () => {
    it('toggles FAQ modal and reflects aria-expanded when Documentation button is clicked', () => {
      renderHeader();

      const helpBtn = screen.getByRole('button', { name: 'Documentation and help' });
      expect(helpBtn).toHaveAttribute('aria-expanded', 'false');
      expect(useFaqStore.getState().isOpen).toBe(false);

      fireEvent.click(helpBtn);
      expect(helpBtn).toHaveAttribute('aria-expanded', 'true');
      expect(useFaqStore.getState().isOpen).toBe(true);

      fireEvent.click(helpBtn);
      expect(helpBtn).toHaveAttribute('aria-expanded', 'false');
      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('toggles FAQ modal when pressing Shift + ? globally', () => {
      renderHeader();

      expect(useFaqStore.getState().isOpen).toBe(false);

      // Trigger via key === '?'
      fireEvent.keyDown(document.body, { key: '?' });
      expect(useFaqStore.getState().isOpen).toBe(true);

      // Trigger via shiftKey + '/'
      fireEvent.keyDown(document.body, { key: '/', shiftKey: true });
      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('GUARD-02 refusal: does NOT toggle modal when pressing ? while focused on an <input>', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <div>
              <input data-testid="test-input" type="text" />
              <Header />
            </div>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const input = screen.getByTestId('test-input');
      input.focus();
      expect(document.activeElement).toBe(input);

      fireEvent.keyDown(input, { key: '?', shiftKey: true });

      // Invariant: modal state must NOT change
      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('GUARD-02 refusal: does NOT toggle modal when pressing ? while focused on a <textarea>', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <div>
              <textarea data-testid="test-textarea" />
              <Header />
            </div>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const textarea = screen.getByTestId('test-textarea');
      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      fireEvent.keyDown(textarea, { key: '?' });

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('GUARD-02 refusal: does NOT toggle modal when pressing ? while focused on a <select>', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <div>
              <select data-testid="test-select">
                <option value="1">Option 1</option>
              </select>
              <Header />
            </div>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const select = screen.getByTestId('test-select');
      select.focus();

      fireEvent.keyDown(select, { key: '?' });

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('GUARD-02 refusal: does NOT toggle modal when pressing ? on contentEditable element', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <div>
              <div data-testid="test-editable" contentEditable="true" />
              <Header />
            </div>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const editable = screen.getByTestId('test-editable');
      Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true });
      editable.focus();

      fireEvent.keyDown(editable, { key: '?' });

      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('GUARD-02 refusal: does NOT toggle modal when pressing ? on element with role="textbox" or role="searchbox"', () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <div>
              <div data-testid="test-role-textbox" role="textbox" tabIndex={0} />
              <div data-testid="test-role-searchbox" role="searchbox" tabIndex={0} />
              <Header />
            </div>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const textbox = screen.getByTestId('test-role-textbox');
      textbox.focus();
      fireEvent.keyDown(textbox, { key: '?' });
      expect(useFaqStore.getState().isOpen).toBe(false);

      const searchbox = screen.getByTestId('test-role-searchbox');
      searchbox.focus();
      fireEvent.keyDown(searchbox, { key: '?' });
      expect(useFaqStore.getState().isOpen).toBe(false);
    });

    it('unregisters keydown event listener on unmount', () => {
      const { unmount } = renderHeader();

      unmount();

      fireEvent.keyDown(document.body, { key: '?' });
      expect(useFaqStore.getState().isOpen).toBe(false);
    });
  });

  describe('Appliance Administration & Dual-Scope Breadcrumbs', () => {
    it('renders the Appliance Administration gear link pointing to /settings/steam', () => {
      renderHeader();

      const gearLink = screen.getByRole('link', { name: 'Appliance administration' });
      expect(gearLink).toBeInTheDocument();
      expect(gearLink).toHaveAttribute('href', '/settings/steam');
    });

    it('renders appliance-scope breadcrumbs without active server name on appliance routes', () => {
      mockLocation.pathname = '/settings/steam';
      mockUseMatches.mockReturnValue([
        { staticData: { scope: 'appliance', breadcrumb: 'Steam CMD & Workshop' } },
      ]);

      renderHeader();

      const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumbNav).toBeInTheDocument();

      // Renders Workspace root link
      expect(screen.getByRole('link', { name: 'Workspace' })).toBeInTheDocument();

      // Renders Appliance Administration breadcrumb link
      const applianceLink = screen.getByRole('link', { name: 'Appliance Administration' });
      expect(applianceLink).toBeInTheDocument();
      expect(applianceLink).toHaveAttribute('href', '/settings/steam');

      // Renders current page title
      const currentPage = screen.getByText('Steam CMD & Workshop');
      expect(currentPage).toBeInTheDocument();
      expect(currentPage).toHaveAttribute('aria-current', 'page');

      // Active server name is NOT rendered in appliance scope
      expect(screen.queryByText('Chernarus Survival')).not.toBeInTheDocument();
    });

    it('renders user-scope breadcrumbs (Workspace > Operator profile) without active server name', () => {
      mockLocation.pathname = '/profile';
      mockUseMatches.mockReturnValue([
        { staticData: { scope: 'user', breadcrumb: 'Operator profile' } },
      ]);

      renderHeader();

      const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumbNav).toBeInTheDocument();

      // Renders Workspace root link
      expect(screen.getByRole('link', { name: 'Workspace' })).toBeInTheDocument();

      // Renders current page title
      const currentPage = screen.getByText('Operator profile');
      expect(currentPage).toBeInTheDocument();
      expect(currentPage).toHaveAttribute('aria-current', 'page');

      // Active server name and 'Servers' are NOT rendered in user scope
      expect(screen.queryByText('Chernarus Survival')).not.toBeInTheDocument();
      expect(screen.queryByText('Servers')).not.toBeInTheDocument();
    });
  });

  describe('NotificationMenu Integration', () => {
    it('renders dynamic empty-unread label without bell animation and displays empty state copy when opened (REQ-01, REQ-05)', async () => {
      const user = userEvent.setup();
      renderHeader();

      const trigger = screen.getByRole('button', { name: /Notifications \(no unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;

      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      await user.click(trigger);

      expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(
        screen.getByText('Server alerts and operation updates will appear here'),
      ).toBeInTheDocument();
    });

    it('renders unread count, animates bell while closed, pauses on open, and supports mark-read, mark-all-read, and dismiss (REQ-01, REQ-04, REQ-05)', async () => {
      const user = userEvent.setup();
      useNotificationStore.getState().addNotification({
        title: 'Backup complete',
        description: 'Snapshot saved cleanly.',
        severity: 'success',
      });
      useNotificationStore.getState().addNotification({
        title: 'Server started',
        description: 'Chernarus is now online.',
        severity: 'info',
      });

      renderHeader();

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(iconWrapper).toHaveClass('animate-bell-ring');

      // Opening popover pauses bell animation
      await user.click(trigger);
      expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      // Clicking unread item marks only that item read and decrements unread count
      const serverStartedRow = screen.getByText('Server started').closest('button')!;
      await user.click(serverStartedRow);

      expect(
        screen.getByRole('button', { name: /Notifications \(1 unread\)/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();

      // Dismissing an item removes it from both store and DOM
      const dismissServerStarted = screen.getByRole('button', {
        name: 'Dismiss notification: Server started',
      });
      await user.click(dismissServerStarted);

      expect(screen.queryByText('Server started')).not.toBeInTheDocument();
      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Mark all as read clears unread count to 0
      await user.click(screen.getByRole('button', { name: /Mark all as read/i }));

      expect(
        screen.getByRole('button', { name: /Notifications \(no unread\)/i }),
      ).toBeInTheDocument();
      expect(useNotificationStore.getState().notifications.every(n => n.read)).toBe(true);

      // Closing popover keeps animation stopped when 0 unread remain
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');
    });
  });
});
