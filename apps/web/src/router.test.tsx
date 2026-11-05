import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthProvider } from './features/auth';
import { authStorage } from './features/auth/auth.storage';
import type { AuthContextValue } from './features/auth/auth.types';
import { ThemeProvider } from './features/theme';
import { DEFAULT_MODULE_FLAGS, queryClient, ROUTE_BREADCRUMBS } from './core';
import { createAppRouter } from './router';

const mockAdminAuth: AuthContextValue = {
  user: {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@dayz.local',
    role: 'admin',
    roles: ['admin'],
  },
  isAuthenticated: true,
  login: async () => {},
  logout: () => {},
};

const mockModeratorAuth: AuthContextValue = {
  ...mockAdminAuth,
  user: {
    ...mockAdminAuth.user!,
    role: 'moderator',
    roles: ['moderator'],
  },
};

const mockGuestAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
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
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  return { ...rendered, history, router };
}

describe('Router Topology & Navigation', () => {
  beforeEach(() => {
    authStorage.clear();
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

  it('renders dummy Mods Management page on /mods when feature is enabled', async () => {
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

  it('redirects /settings/operators to /dashboard when user is not admin', async () => {
    renderRoute('/settings/operators', mockModeratorAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('redirects /logs index route to /logs/rpt', async () => {
    renderRoute('/logs', mockAdminAuth);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /server rpt logs/i })).toBeInTheDocument();
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
});
