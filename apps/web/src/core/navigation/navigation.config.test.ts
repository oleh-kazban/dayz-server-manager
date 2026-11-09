import { describe, expect, it } from 'vitest';

import { createAppRouter } from '../../router';

import {
  APPLIANCE_NAVIGATION_SECTIONS,
  type AppRoutePath,
  getNavigationScope,
  getNavigationSections,
  isApplianceRoute,
  NAVIGATION_SECTIONS,
  ROUTE_BREADCRUMBS,
  SERVER_NAVIGATION_SECTIONS,
} from './navigation.config';

interface InspectableRouteNode {
  id?: string;
  options?: {
    path?: string;
    component?: unknown;
    staticData?: {
      breadcrumb?: string;
    };
  };
  children?: InspectableRouteNode[];
}

function getAuthedChildRoutes(): InspectableRouteNode[] {
  const router = createAppRouter();
  const topRoutes = (router.routeTree.children ?? []) as InspectableRouteNode[];
  const authedNode = topRoutes.find(route => route.id === '/authed');
  return authedNode?.children ?? [];
}

describe('Navigation & Breadcrumb Manifest (ARCH-01 Zero Drift)', () => {
  it('ensures every item in NAVIGATION_SECTIONS references a valid ROUTE_BREADCRUMBS key with matching label', () => {
    const seenSectionIds = new Set<string>();
    const seenPaths = new Set<string>();

    for (const section of NAVIGATION_SECTIONS) {
      expect(seenSectionIds.has(section.id)).toBe(false);
      seenSectionIds.add(section.id);
      expect(section.items.length).toBeGreaterThan(0);

      for (const item of section.items) {
        expect(seenPaths.has(item.to)).toBe(false);
        seenPaths.add(item.to);
        expect(item.to in ROUTE_BREADCRUMBS).toBe(true);
        expect(item.label).toBe(ROUTE_BREADCRUMBS[item.to]);
      }
    }
  });

  it('ensures every non-redirect leaf route under authedRoute carries staticData.breadcrumb matching ROUTE_BREADCRUMBS', () => {
    const authedChildren = getAuthedChildRoutes();
    const leafRoutes = authedChildren.filter(route => Boolean(route.options?.component));

    expect(leafRoutes.length).toBeGreaterThan(0);

    for (const route of leafRoutes) {
      const path = route.options?.path as AppRoutePath | undefined;
      expect(path).toBeDefined();
      expect(path! in ROUTE_BREADCRUMBS).toBe(true);
      expect(route.options?.staticData?.breadcrumb).toBe(ROUTE_BREADCRUMBS[path!]);
    }
  });

  it('ensures every key in ROUTE_BREADCRUMBS corresponds to an active leaf route in router.tsx with zero dead routes', () => {
    const authedChildren = getAuthedChildRoutes();
    const leafRoutePaths = new Set(
      authedChildren
        .filter(route => Boolean(route.options?.component))
        .map(route => route.options?.path),
    );

    const manifestPaths = Object.keys(ROUTE_BREADCRUMBS);
    expect(leafRoutePaths.size).toBe(manifestPaths.length);

    for (const path of manifestPaths) {
      expect(leafRoutePaths.has(path)).toBe(true);
    }

    expect(manifestPaths).not.toContain('/logs/crash');
  });

  it('correctly classifies appliance routes and navigation scope', () => {
    expect(isApplianceRoute('/settings/steam')).toBe(true);
    expect(isApplianceRoute('/settings/app')).toBe(true);
    expect(isApplianceRoute('/settings/operators')).toBe(true);
    expect(isApplianceRoute('/audit')).toBe(true);
    expect(isApplianceRoute('/audit/details')).toBe(true);

    expect(isApplianceRoute('/dashboard')).toBe(false);
    expect(isApplianceRoute('/settings/server')).toBe(false);
    expect(isApplianceRoute('/settings/discord')).toBe(false);
    expect(isApplianceRoute('/players')).toBe(false);

    expect(getNavigationScope('/settings/steam')).toBe('appliance');
    expect(getNavigationScope('/dashboard')).toBe('server');

    expect(getNavigationSections('appliance')).toBe(APPLIANCE_NAVIGATION_SECTIONS);
    expect(getNavigationSections('server')).toBe(SERVER_NAVIGATION_SECTIONS);
  });

  it('ensures every item in APPLIANCE_NAVIGATION_SECTIONS references a valid ROUTE_BREADCRUMBS key with matching label', () => {
    const seenSectionIds = new Set<string>();
    const seenPaths = new Set<string>();

    for (const section of APPLIANCE_NAVIGATION_SECTIONS) {
      expect(seenSectionIds.has(section.id)).toBe(false);
      seenSectionIds.add(section.id);
      expect(section.items.length).toBeGreaterThan(0);

      for (const item of section.items) {
        expect(seenPaths.has(item.to)).toBe(false);
        seenPaths.add(item.to);
        expect(item.to in ROUTE_BREADCRUMBS).toBe(true);
        expect(item.label).toBe(ROUTE_BREADCRUMBS[item.to]);
      }
    }
  });
});
