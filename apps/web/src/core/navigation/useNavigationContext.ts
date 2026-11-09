import { useLocation, useMatches } from '@tanstack/react-router';

import {
  getNavigationScope,
  getNavigationSections,
  type NavigationScope,
  type NavigationSectionConfig,
} from './navigation.config';

export interface UseNavigationContextResult {
  scope: NavigationScope;
  isAppliance: boolean;
  isUser: boolean;
  sections: NavigationSectionConfig[];
  searchPolicy: 'preserve-server' | 'clear-all';
}

/**
 * Resolves active navigation context (Server Scope vs. Appliance Scope vs. User Scope)
 * based on active TanStack Router staticData metadata, falling back to URL heuristics.
 */
export function useNavigationContext(): UseNavigationContextResult {
  const matches = useMatches();
  const location = useLocation();
  const pathname = location?.pathname ?? '';

  const matchedScope = [...(matches ?? [])]
    .reverse()
    .find(match => Boolean(match.staticData?.scope))?.staticData?.scope;

  const scope: NavigationScope = matchedScope ?? getNavigationScope(pathname);
  const isAppliance = scope === 'appliance';
  const isUser = scope === 'user';
  const sections = getNavigationSections(scope);

  return {
    scope,
    isAppliance,
    isUser,
    sections,
    searchPolicy: scope === 'server' ? 'preserve-server' : 'clear-all',
  };
}
