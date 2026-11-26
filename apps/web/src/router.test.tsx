import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import {
  DEFAULT_MODULE_FLAGS,
  FeatureFlagsProvider,
  queryClient,
  ROUTE_BREADCRUMBS,
} from '@aegis/web/core';
import { AuthProvider } from '@aegis/web/features/auth';
import { authStorage } from '@aegis/web/features/auth/auth.storage';
import type { AuthContextValue } from '@aegis/web/features/auth/auth.types';
import { ThemeProvider } from '@aegis/web/features/theme';
import { createAppRouter } from '@aegis/web/router';

const mockAdminAuth: AuthContextValue = {
  user: {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@dayz.local',
    role: 'admin',
  },
  isAuthenticated: true,
  login: async () => {},
  logout: () => {},
  adoptSession: () => {},
};

const mockSetupAuth: AuthContextValue = {
  ...mockAdminAuth,
  user: { id: 'usr-setup', username: 'setup-1a2b3c4d5e6f', email: '', role: 'setup' },
};

const mockGuestAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  adoptSession: () => {},
};

function renderRoute(initialPath: string, auth = mockAdminAuth, flags = DEFAULT_MODULE_FLAGS) {
  if (auth.user) {
    authStorage.set(auth.user, false);
  } else {
    authStorage.clear();
  }

  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createAppRouter(history);

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <FeatureFlagsProvider initialFlags={flags}>
            <RouterProvider
              router={router}
              context={{
                auth,
                features: {
                  flags,
                  isEnabled: flag => Boolean(flags[flag]),
                },
              }}
            />
          </FeatureFlagsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  return { ...rendered, history, router };
}

describe('Router Topology & Navigation', () => {
  beforeEach(() => {
    authStorage.clear();
    queryClient.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('redirects unauthenticated users to /sign-in preserving target in search', async () => {
    const { history } = renderRoute('/players', mockGuestAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(history.location.pathname).toBe('/sign-in');
      expect(history.location.search).toContain('redirect');
    });
  });

  it('redirects root / to /dashboard for authenticated users', async () => {
    renderRoute('/', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('renders dummy System Telemetry page on /system', async () => {
    renderRoute('/system', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /system telemetry/i })).toBeInTheDocument();
    });
  });

  it('renders dummy In-Game Players page on /players', async () => {
    renderRoute('/players', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /in-game players/i })).toBeInTheDocument();
    });
  });

  it('renders Mods Management page on /mods when feature is enabled', async () => {
    const serverId = '11111111-1111-4111-a111-111111111111';
    vi.spyOn(apiClient.servers, 'list').mockResolvedValue([
      {
        id: serverId,
        name: 'DayZ (Local)',
        description: null,
        status: 'stopped',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        isDefault: true,
        lastExit: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    vi.spyOn(apiClient.mods, 'list').mockResolvedValue({
      mods: [],
      launchPreview: {
        modFlag: '',
        serverModFlag: '',
        combinedArgs: [],
        missingFolderCount: 0,
      },
      updateAvailableCount: 0,
    });

    renderRoute('/mods', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mods management/i })).toBeInTheDocument();
    });
  });

  it('redirects /mods to /dashboard when modsManager feature is disabled', async () => {
    renderRoute('/mods', mockAdminAuth, {
      ...DEFAULT_MODULE_FLAGS,
      modsManager: false,
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('redirects /world/map to /dashboard when worldMap feature is disabled', async () => {
    renderRoute('/world/map', mockAdminAuth, {
      ...DEFAULT_MODULE_FLAGS,
      worldMap: false,
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('renders /settings/operators and /settings/steam for authenticated operators', async () => {
    vi.spyOn(apiClient.steam, 'getSettings').mockResolvedValueOnce({
      id: 'default',
      steamCmdPath: 'C:\\steamcmd\\steamcmd.exe',
      steamWorkshopPath: 'C:\\DayZServer\\steamapps\\workshop',
      steamMetaPath: 'C:\\DayZServer\\steamapps',
      authMode: 'anonymous',
      steamUsername: null,
      hasPassword: false,
      gameServerAppId: 223350,
      workshopAppId: 221100,
      branch: 'public',
      hasBranchPassword: false,
      hasSteamWebApiKey: false,
      sessionStatus: 'UNAUTHENTICATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const operatorsView = renderRoute('/settings/operators', mockAdminAuth);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Console Operators' })).toBeInTheDocument();
    });
    operatorsView.unmount();

    renderRoute('/settings/steam', mockAdminAuth);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Steam CMD & Workshop' })).toBeInTheDocument();
    });
  });

  it('redirects /logs index route to /logs/rpt', async () => {
    renderRoute('/logs', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /server rpt logs/i })).toBeInTheDocument();
    });
  });

  it('renders accurate Header breadcrumb from route staticData on subroutes (/logs/adm and /settings/backups)', async () => {
    renderRoute('/logs/adm', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /administration logs/i })).toBeInTheDocument();
      const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumbNav).toHaveTextContent('Administration logs');
    });
  });

  it('redirects /settings/discord and /economy/cfgspawnabletypes to /dashboard when their feature flags are disabled', async () => {
    renderRoute('/settings/discord', mockAdminAuth, {
      ...DEFAULT_MODULE_FLAGS,
      discordNotifications: false,
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('attaches staticData.breadcrumb to every leaf route under authedRoute matching ROUTE_BREADCRUMBS', () => {
    const router = createAppRouter();
    const topRoutes = (router.routeTree.children ?? []) as {
      id?: string;
      children?: { options?: { staticData?: { breadcrumb?: string } } }[];
    }[];
    const authedNode = topRoutes.find(route => route.id === '/authed');
    expect(authedNode).toBeDefined();

    const leafRoutes = (authedNode?.children ?? []).filter(route =>
      Boolean(route.options?.staticData?.breadcrumb),
    );
    expect(leafRoutes).toHaveLength(Object.keys(ROUTE_BREADCRUMBS).length);
  });

  describe('first-time setup route', () => {
    const setupHeading = { name: 'Create the root account' };

    it.each(['/', '/sign-in', '/dashboard', '/players', '/settings/steam'])(
      'redirects a signed-in setup user opening %s to /setup',
      async path => {
        const { history } = renderRoute(path, mockSetupAuth);

        await waitFor(() => {
          expect(screen.getByRole('heading', setupHeading)).toBeInTheDocument();
        });
        expect(history.location.pathname).toBe('/setup');
      },
    );

    it('keeps a signed-in setup user on /setup', async () => {
      const { history } = renderRoute('/setup', mockSetupAuth);

      await waitFor(() => {
        expect(screen.getByRole('heading', setupHeading)).toBeInTheDocument();
      });
      expect(history.location.pathname).toBe('/setup');
    });

    it.each([
      ['admin', mockAdminAuth],
      [
        'root',
        {
          ...mockAdminAuth,
          user: { id: 'usr-root', username: 'owner', email: '', role: 'root' as const },
        },
      ],
    ])('redirects a signed-in %s user opening /setup to /dashboard', async (_role, auth) => {
      const { history } = renderRoute('/setup', auth);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      });
      expect(history.location.pathname).toBe('/dashboard');
      expect(screen.queryByRole('heading', setupHeading)).not.toBeInTheDocument();
    });

    it('redirects a signed-out visitor opening /setup to /sign-in without a return target', async () => {
      const { history } = renderRoute('/setup', mockGuestAuth);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      });
      expect(history.location.pathname).toBe('/sign-in');
      expect(history.location.search).not.toContain('redirect');
    });

    it('renders /setup outside the authed shell, without the sidebar navigation', async () => {
      renderRoute('/setup', mockSetupAuth);

      await waitFor(() => {
        expect(screen.getByRole('heading', setupHeading)).toBeInTheDocument();
      });
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    });

    it('registers /setup as a top-level route, not a child of the authed route', () => {
      const router = createAppRouter();
      const topRoutes = (router.routeTree.children ?? []) as {
        id?: string;
        children?: { id?: string }[];
      }[];

      expect(topRoutes.map(route => route.id)).toContain('/setup');
      const authedNode = topRoutes.find(route => route.id === '/authed');
      expect((authedNode?.children ?? []).map(route => route.id)).not.toContain('/authed/setup');
    });
  });
});
