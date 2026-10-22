import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { AppShell } from '@dsm/components';

import type { AuthContextValue } from './features/auth';

export interface RouterContext {
  auth: AuthContextValue;
}

// 1. Root route with context contract
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

// 2. Default Index Route: redirects to /dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
});

// 3. Guest-Only Route: /sign-in (code-split)
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: lazyRouteComponent(() => import('./features/auth'), 'SignIn'),
});

// 4. Authenticated Layout Route: hosts persistent AppShell and guards child routes
const authedRoute = createRoute({
  id: 'authed',
  getParentRoute: () => rootRoute,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

// 5. Protected Route: /dashboard (code-split)
const dashboardRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/dashboard',
  component: lazyRouteComponent(() => import('./features/dashboard'), 'Dashboard'),
});

// 6. Construct router
const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  authedRoute.addChildren([dashboardRoute]),
]);

export const router = createRouter({
  routeTree,
  context: {
    // Initial placeholder satisfied at runtime by <RouterProvider context={{ auth }} />
    auth: undefined!,
  },
});

// 6. Register router for complete type-safety across <Link /> and navigate()
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
