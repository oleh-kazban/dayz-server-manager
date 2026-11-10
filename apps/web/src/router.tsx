import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { z } from 'zod';

import {
  AuthedLayout,
  PlaceholderView,
  RootErrorFallback,
  RootLayout,
  RootLoader,
} from '@aegis/web/components';

import { type AuthContextValue, SignIn } from './features/auth';
import { Dashboard } from './features/dashboard';
import { ModsView } from './features/mods';
import { ProfileView } from './features/profile';
import { ServerSettingsView } from './features/server-settings';
import { SteamSettingsView } from './features/steam';
import {
  DEFAULT_MODULE_FLAGS,
  type FeatureFlagsContextValue,
  type ModuleFlags,
  type NavigationScope,
  ROUTE_BREADCRUMBS,
} from './core';

export interface RouterContext {
  auth: AuthContextValue;
  features: FeatureFlagsContextValue;
}

export const defaultAuthContext: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
};

export const defaultFeaturesContext: FeatureFlagsContextValue = {
  flags: DEFAULT_MODULE_FLAGS,
  isEnabled: (flag: string) => Boolean(DEFAULT_MODULE_FLAGS[flag as keyof ModuleFlags]),
};

export interface SignInSearch {
  redirect?: string;
}

const signInSearchSchema = z.object({
  redirect: z.string().optional(),
});

export interface RootSearch {
  serverId?: string;
}

export const rootSearchSchema = z.object({
  serverId: z.string().uuid().optional(),
});

// 1. Root route with context contract
const rootRoute = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => rootSearchSchema.parse(search),
  component: RootLayout,
  errorComponent: RootErrorFallback,
  pendingComponent: RootLoader,
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
  validateSearch: (search: Record<string, unknown>): SignInSearch =>
    signInSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (context?.auth?.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: SignIn,
});

export interface AuthedSearch {
  serverId?: string;
}

const authedSearchSchema = z.object({
  serverId: z.string().uuid().optional(),
});

// 4. Authenticated Layout Route: hosts persistent AppShell and guards child routes
const authedRoute = createRoute({
  id: 'authed',
  getParentRoute: () => rootRoute,
  validateSearch: (search: Record<string, unknown>): AuthedSearch =>
    authedSearchSchema.parse(search),
  beforeLoad: ({ context, location }) => {
    if (!context?.auth?.isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthedLayout,
});

// 5. Protected Primary Routes
const dashboardRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/dashboard',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/dashboard'] },
  component: Dashboard,
});

const systemRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/system',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/system'] },
  component: () => (
    <PlaceholderView
      title="System Telemetry"
      description="Host aggregate resources, DayZ server process footprint, and manager service utilization over time."
    />
  ),
});

const playersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/players',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/players'] },
  component: () => (
    <PlaceholderView
      title="In-Game Players"
      description="Real-time connected player list, identity resolver (Steam64 / DayZ ID / BattlEye GUID), and RCON moderation actions."
    />
  ),
});

const modsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/mods',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/mods'] },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('modsManager')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: ModsView,
});

const maintenanceRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/maintenance',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/maintenance'] },
  component: () => (
    <PlaceholderView
      title="Maintenance & Lifecycle"
      description="Orchestrated restart sequences, player join locks, SteamCMD updates, and emergency process termination."
    />
  ),
});

const auditRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/audit',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/audit'], scope: 'appliance' },
  component: () => (
    <PlaceholderView
      title="Audit Event Stream"
      description="Full-text searchable audit log capturing operator interventions, logins, and automated background tasks."
    />
  ),
});

// Logs Subsystem
const logsIndexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/logs',
  beforeLoad: () => {
    throw redirect({ to: '/logs/rpt' });
  },
});

const logsRptRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/logs/rpt',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/logs/rpt'] },
  component: () => (
    <PlaceholderView
      title="Server RPT Logs"
      description="Live streaming runtime engine logs, diagnostics, and collision geometry output."
    />
  ),
});

const logsAdmRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/logs/adm',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/logs/adm'] },
  component: () => (
    <PlaceholderView
      title="Administration Logs"
      description="Live streaming player combat events, damage tracking, and connection/disconnection activity."
    />
  ),
});

const logsScriptRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/logs/script',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/logs/script'] },
  component: () => (
    <PlaceholderView
      title="Script Engine Logs"
      description="Live streaming Enforce script output, mod execution traces, and unhandled exceptions."
    />
  ),
});

// World Subsystem (Gated by worldMap)
const worldIndexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/world',
  beforeLoad: () => {
    throw redirect({ to: '/world/map' });
  },
});

const worldMapRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/world/map',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/world/map'] },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('worldMap')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Tactical GIS World Map"
      description="High-resolution interactive world map with real-time entity tracking and coordinate navigation."
    />
  ),
});

const worldLootRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/world/loot',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/world/loot'] },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('worldMap')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Central Economy Loot Heatmap"
      description="Spatial loot distribution density and tier cluster visualization across the map."
    />
  ),
});

// Economy Subsystem (Gated by economyWorkbench)
const economyIndexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/economy',
  beforeLoad: () => {
    throw redirect({ to: '/economy/types' });
  },
});

const economyTypesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/economy/types',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/economy/types'] },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('economyWorkbench')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Types Workbench"
      description="High-performance virtualized types.xml editor with pre-commit XML schema validation and diff rollback."
    />
  ),
});

const economySpawnsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/economy/cfgspawnabletypes',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/economy/cfgspawnabletypes'] },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('economyWorkbench')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Spawnable Types Editor"
      description="cfgspawnabletypes.xml weapon attachments, vehicle parts, and cargo preset configuration."
    />
  ),
});

// Profile & Personal Preferences
const profileRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/profile',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/profile'], scope: 'user' },
  component: ProfileView,
});

// Settings Subsystem
const settingsIndexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings',
  beforeLoad: () => {
    throw redirect({ to: '/settings/steam' });
  },
});

const settingsServerRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/server',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/server'], scope: 'server' },
  component: ServerSettingsView,
});

const settingsSteamRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/steam',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/steam'], scope: 'appliance' },
  beforeLoad: ({ context }) => {
    if (context?.auth?.user?.role !== 'admin') {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: SteamSettingsView,
});

const settingsAppRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/app',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/app'], scope: 'appliance' },
  component: () => (
    <PlaceholderView
      title="DSM Appliance Settings"
      description="Daemon web server port, reverse proxy trust, database WAL management, and module toggles."
    />
  ),
});

const settingsDiscordRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/discord',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/discord'], scope: 'server' },
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('discordNotifications')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Discord Notifications"
      description="Outbound webhook channels for lifecycle announcements, admin alerts, and 30-second live status presence."
    />
  ),
});

const settingsOperatorsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/operators',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/operators'], scope: 'appliance' },
  beforeLoad: ({ context }) => {
    if (context?.auth?.user?.role !== 'admin') {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Console Operators & RBAC"
      description="Operator account administration, role assignment (Admin, Moderator, Viewer), and session suspension."
    />
  ),
});

const settingsAutomationRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/automation',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/automation'] },
  component: () => (
    <PlaceholderView
      title="Automation & Watchdog"
      description="Scheduled cron restart pipelines with warning broadcasts, and tri-vector watchdog health checks."
    />
  ),
});

const settingsBackupsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/backups',
  staticData: { breadcrumb: ROUTE_BREADCRUMBS['/settings/backups'] },
  component: () => (
    <PlaceholderView
      title="Backups & Retention"
      description="Automated server data snapshots, retention policies, and one-click recovery point restoration."
    />
  ),
});

// 6. Construct complete route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  authedRoute.addChildren([
    dashboardRoute,
    systemRoute,
    playersRoute,
    modsRoute,
    maintenanceRoute,
    auditRoute,
    logsIndexRoute,
    logsRptRoute,
    logsAdmRoute,
    logsScriptRoute,
    worldIndexRoute,
    worldMapRoute,
    worldLootRoute,
    economyIndexRoute,
    economyTypesRoute,
    economySpawnsRoute,
    profileRoute,
    settingsIndexRoute,
    settingsServerRoute,
    settingsSteamRoute,
    settingsAppRoute,
    settingsDiscordRoute,
    settingsOperatorsRoute,
    settingsAutomationRoute,
    settingsBackupsRoute,
  ]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: {
      auth: defaultAuthContext,
      features: defaultFeaturesContext,
    },
    defaultPreload: 'intent',
    defaultPendingComponent: RootLoader,
    defaultErrorComponent: RootErrorFallback,
  });
}

export const router = createAppRouter();

// 7. Register router for complete type-safety across <Link /> and navigate()
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    breadcrumb?: string;
    scope?: NavigationScope;
  }
}
