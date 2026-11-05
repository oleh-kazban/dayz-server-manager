import {
  Activity,
  Bell,
  Box,
  Cpu,
  FileCode2,
  Flame,
  LayoutDashboard,
  type LucideIcon,
  MapIcon,
  ShieldCheck,
  Sliders,
  Terminal,
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
  | '/settings/discord'
  | '/settings/operators'
  | '/settings/automation'
  | '/settings/backups';

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

export const NAVIGATION_SECTIONS: NavigationSectionConfig[] = [
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
        to: '/audit',
        label: ROUTE_BREADCRUMBS['/audit'],
        icon: ShieldCheck,
      },
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
    ],
  },
];
