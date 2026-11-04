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
} from '@dsm/web/components';

import { type AuthContextValue, SignIn } from './features/auth';
import { Dashboard } from './features/dashboard';
import { ServerSettingsView } from './features/server-settings';
import { DEFAULT_MODULE_FLAGS, type FeatureFlagsContextValue, type ModuleFlags } from './core';

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
  component: Dashboard,
});

const systemRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/system',
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
  beforeLoad: ({ context }) => {
    if (!context?.features?.isEnabled?.('modsManager')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => (
    <PlaceholderView
      title="Mods Management"
      description="Steam Workshop mod synchronization, load order sequencing, and automatic .bikey public key distribution."
    />
  ),
});

const maintenanceRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/maintenance',
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
  component: () => (
    <PlaceholderView
      title="Personal Profile & Preferences"
      description="Operator account credentials, active sessions management, theme selection, and alert preferences."
    />
  ),
});

// Settings Subsystem
const settingsIndexRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings',
  beforeLoad: () => {
    throw redirect({ to: '/settings/server' });
  },
});

const settingsServerRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/server',
  component: ServerSettingsView,
});

const settingsAppRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/settings/app',
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
}
