import {
  Activity,
  Bell,
  Box,
  CloudDownload,
  Cpu,
  FileCode2,
  Flame,
  LayoutDashboard,
  type LucideIcon,
  MapIcon,
  ShieldCheck,
  Sliders,
  Terminal,
  User,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';

import type { ModuleFlags } from '../features/feature-flags.types';

export type AppRoutePath =
  | '/dashboard'
  | '/system'
  | '/players'
  | '/mods'
  | '/maintenance'
  | '/audit'
  | '/logs/rpt'
  | '/logs/adm'
  | '/logs/script'
  | '/world/map'
  | '/world/loot'
  | '/economy/types'
  | '/economy/cfgspawnabletypes'
  | '/profile'
  | '/settings/server'
  | '/settings/app'
  | '/settings/steam'
  | '/settings/discord'
  | '/settings/operators'
  | '/settings/automation'
  | '/settings/backups';

export type NavigationScope = 'server' | 'appliance' | 'user';

export const APPLIANCE_ROUTE_PREFIXES: AppRoutePath[] = [
  '/settings/steam',
  '/settings/app',
  '/settings/operators',
  '/audit',
];

export const USER_ROUTE_PREFIXES: AppRoutePath[] = ['/profile'];

export function isApplianceRoute(pathname: string): boolean {
  return APPLIANCE_ROUTE_PREFIXES.some(
    route => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isUserRoute(pathname: string): boolean {
  return USER_ROUTE_PREFIXES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

export function isServerRoute(pathname: string): boolean {
  return !isApplianceRoute(pathname) && !isUserRoute(pathname);
}

export function getNavigationScope(pathname: string): NavigationScope {
  if (isUserRoute(pathname)) {
    return 'user';
  }
  return isApplianceRoute(pathname) ? 'appliance' : 'server';
}

export interface RouteBreadcrumbMeta {
  breadcrumb: string;
}

export const ROUTE_BREADCRUMBS: Record<AppRoutePath, string> = {
  '/dashboard': 'Dashboard',
  '/system': 'System telemetry',
  '/players': 'Players',
  '/mods': 'Mods',
  '/maintenance': 'Maintenance',
  '/audit': 'Audit log',
  '/logs/rpt': 'Server logs',
  '/logs/adm': 'Administration logs',
  '/logs/script': 'Script logs',
  '/world/map': 'Tactical map',
  '/world/loot': 'Loot heatmap',
  '/economy/types': 'Types workbench',
  '/economy/cfgspawnabletypes': 'Spawnable types',
  '/profile': 'Operator profile',
  '/settings/server': 'Server settings',
  '/settings/steam': 'Steam CMD & Workshop',
  '/settings/app': 'Appliance settings',
  '/settings/discord': 'Discord webhooks',
  '/settings/operators': 'Console operators',
  '/settings/automation': 'Automation & watchdog',
  '/settings/backups': 'Backups & retention',
};

export interface NavigationItemConfig {
  to: AppRoutePath;
  label: string;
  icon: LucideIcon;
  featureFlag?: keyof ModuleFlags;
  requiredRole?: 'admin';
}

export interface NavigationSectionConfig {
  id: string;
  title: string;
  ariaLabel: string;
  featureFlag?: keyof ModuleFlags;
  items: NavigationItemConfig[];
}

export const SERVER_NAVIGATION_SECTIONS: NavigationSectionConfig[] = [
  {
    id: 'overview',
    title: 'Overview',
    ariaLabel: 'Overview Navigation',
    items: [
      {
        to: '/dashboard',
        label: ROUTE_BREADCRUMBS['/dashboard'],
        icon: LayoutDashboard,
      },
      {
        to: '/system',
        label: ROUTE_BREADCRUMBS['/system'],
        icon: Activity,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    ariaLabel: 'Operations Navigation',
    items: [
      {
        to: '/players',
        label: ROUTE_BREADCRUMBS['/players'],
        icon: Users,
      },
      {
        to: '/mods',
        label: ROUTE_BREADCRUMBS['/mods'],
        icon: Box,
        featureFlag: 'modsManager',
      },
      {
        to: '/maintenance',
        label: ROUTE_BREADCRUMBS['/maintenance'],
        icon: Wrench,
      },
    ],
  },
  {
    id: 'observability',
    title: 'Observability',
    ariaLabel: 'Observability Navigation',
    items: [
      {
        to: '/logs/rpt',
        label: ROUTE_BREADCRUMBS['/logs/rpt'],
        icon: Terminal,
      },
    ],
  },
  {
    id: 'world',
    title: 'World',
    ariaLabel: 'World Navigation',
    featureFlag: 'worldMap',
    items: [
      {
        to: '/world/map',
        label: ROUTE_BREADCRUMBS['/world/map'],
        icon: MapIcon,
      },
      {
        to: '/world/loot',
        label: ROUTE_BREADCRUMBS['/world/loot'],
        icon: Flame,
      },
    ],
  },
  {
    id: 'configuration',
    title: 'Configuration',
    ariaLabel: 'Configuration Navigation',
    items: [
      {
        to: '/economy/types',
        label: ROUTE_BREADCRUMBS['/economy/types'],
        icon: FileCode2,
        featureFlag: 'economyWorkbench',
      },
      {
        to: '/settings/server',
        label: ROUTE_BREADCRUMBS['/settings/server'],
        icon: Sliders,
      },
      {
        to: '/settings/discord',
        label: ROUTE_BREADCRUMBS['/settings/discord'],
        icon: Bell,
        featureFlag: 'discordNotifications',
      },
    ],
  },
];

export const APPLIANCE_NAVIGATION_SECTIONS: NavigationSectionConfig[] = [
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    ariaLabel: 'Infrastructure Navigation',
    items: [
      {
        to: '/settings/steam',
        label: ROUTE_BREADCRUMBS['/settings/steam'],
        icon: CloudDownload,
        requiredRole: 'admin',
      },
    ],
  },
  {
    id: 'appliance',
    title: 'Appliance',
    ariaLabel: 'Appliance Navigation',
    items: [
      {
        to: '/settings/app',
        label: ROUTE_BREADCRUMBS['/settings/app'],
        icon: Cpu,
      },
      {
        to: '/settings/operators',
        label: ROUTE_BREADCRUMBS['/settings/operators'],
        icon: UserCheck,
        requiredRole: 'admin',
      },
      {
        to: '/audit',
        label: ROUTE_BREADCRUMBS['/audit'],
        icon: ShieldCheck,
      },
    ],
  },
];

export const USER_NAVIGATION_SECTIONS: NavigationSectionConfig[] = [
  {
    id: 'account',
    title: 'Account',
    ariaLabel: 'Account Navigation',
    items: [
      {
        to: '/profile',
        label: ROUTE_BREADCRUMBS['/profile'],
        icon: User,
      },
    ],
  },
];

export const NAVIGATION_SECTIONS = SERVER_NAVIGATION_SECTIONS;

export function getNavigationSections(scope: NavigationScope): NavigationSectionConfig[] {
  switch (scope) {
    case 'appliance':
      return APPLIANCE_NAVIGATION_SECTIONS;
    case 'user':
      return USER_NAVIGATION_SECTIONS;
    case 'server':
    default:
      return SERVER_NAVIGATION_SECTIONS;
  }
}
