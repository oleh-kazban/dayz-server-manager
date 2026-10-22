import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { AuthContextValue, SignIn } from './features/auth';
import { Dashboard } from './features';

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

// 3. Guest-Only Route: /sign-in
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: SignIn,
});

// 4. Protected Route: /dashboard
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: Dashboard, // extracted dashboard
});

// 5. Construct router
const routeTree = rootRoute.addChildren([indexRoute, signInRoute, dashboardRoute]);

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
