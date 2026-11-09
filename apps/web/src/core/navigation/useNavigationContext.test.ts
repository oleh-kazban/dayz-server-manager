import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APPLIANCE_NAVIGATION_SECTIONS,
  getNavigationScope,
  isApplianceRoute,
  SERVER_NAVIGATION_SECTIONS,
} from './navigation.config';
import { useNavigationContext } from './useNavigationContext';

const mockUseMatches = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useMatches: () => mockUseMatches(),
  useLocation: () => mockUseLocation(),
}));

describe('useNavigationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMatches.mockReturnValue([]);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
  });

  describe('Route staticData Scope Resolution', () => {
    it('extracts scope: "appliance" when provided in staticData', () => {
      mockUseMatches.mockReturnValue([
        { staticData: { breadcrumb: 'Settings' } },
        { staticData: { scope: 'appliance', breadcrumb: 'Steam CMD & Workshop' } },
      ]);
      mockUseLocation.mockReturnValue({ pathname: '/settings/steam' });

      const { result } = renderHook(() => useNavigationContext());

      expect(result.current.scope).toBe('appliance');
      expect(result.current.isAppliance).toBe(true);
      expect(result.current.searchPolicy).toBe('clear-all');
      expect(result.current.sections).toEqual(APPLIANCE_NAVIGATION_SECTIONS);
    });

    it('extracts scope: "server" when provided in staticData', () => {
      mockUseMatches.mockReturnValue([
        { staticData: { scope: 'server', breadcrumb: 'Dashboard' } },
      ]);
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      const { result } = renderHook(() => useNavigationContext());

      expect(result.current.scope).toBe('server');
      expect(result.current.isAppliance).toBe(false);
      expect(result.current.searchPolicy).toBe('preserve-server');
      expect(result.current.sections).toEqual(SERVER_NAVIGATION_SECTIONS);
    });

    it('prioritizes leaf route staticData when multiple matches exist', () => {
      mockUseMatches.mockReturnValue([
        { staticData: { scope: 'server' } },
        { staticData: { scope: 'appliance' } },
      ]);
      mockUseLocation.mockReturnValue({ pathname: '/arbitrary' });

      const { result } = renderHook(() => useNavigationContext());
      expect(result.current.scope).toBe('appliance');
    });
  });

  describe('URL Pathname Heuristic Fallback', () => {
    it('falls back to appliance scope when staticData is absent but pathname matches an appliance route', () => {
      mockUseMatches.mockReturnValue([]);

      const appliancePaths = [
        '/settings/steam',
        '/settings/app',
        '/settings/operators',
        '/audit',
        '/settings/steam/details',
      ];

      for (const pathname of appliancePaths) {
        mockUseLocation.mockReturnValue({ pathname });
        const { result } = renderHook(() => useNavigationContext());
        expect(result.current.scope).toBe('appliance');
        expect(result.current.isAppliance).toBe(true);
        expect(result.current.searchPolicy).toBe('clear-all');
        expect(result.current.sections).toEqual(APPLIANCE_NAVIGATION_SECTIONS);
      }
    });

    it('falls back to server scope when staticData is absent and pathname is a server route', () => {
      mockUseMatches.mockReturnValue([]);

      const serverPaths = [
        '/dashboard',
        '/players',
        '/mods',
        '/maintenance',
        '/logs/rpt',
        '/world/map',
        '/economy/types',
        '/settings/server',
        '/settings/discord',
      ];

      for (const pathname of serverPaths) {
        mockUseLocation.mockReturnValue({ pathname });
        const { result } = renderHook(() => useNavigationContext());
        expect(result.current.scope).toBe('server');
        expect(result.current.isAppliance).toBe(false);
        expect(result.current.searchPolicy).toBe('preserve-server');
        expect(result.current.sections).toEqual(SERVER_NAVIGATION_SECTIONS);
      }
    });

    it('defaults to server scope for unknown or empty pathname', () => {
      mockUseMatches.mockReturnValue([]);
      mockUseLocation.mockReturnValue({ pathname: '' });

      const { result } = renderHook(() => useNavigationContext());
      expect(result.current.scope).toBe('server');
      expect(result.current.isAppliance).toBe(false);
    });
  });

  describe('Navigation Config Helpers', () => {
    it('isApplianceRoute identifies appliance routes and subpaths', () => {
      expect(isApplianceRoute('/settings/steam')).toBe(true);
      expect(isApplianceRoute('/settings/steam/subpage')).toBe(true);
      expect(isApplianceRoute('/settings/app')).toBe(true);
      expect(isApplianceRoute('/settings/operators')).toBe(true);
      expect(isApplianceRoute('/audit')).toBe(true);

      // Negative cases
      expect(isApplianceRoute('/dashboard')).toBe(false);
      expect(isApplianceRoute('/settings/server')).toBe(false);
      expect(isApplianceRoute('/settings/discord')).toBe(false);
      expect(isApplianceRoute('/mods')).toBe(false);
    });

    it('getNavigationScope maps pathname to correct NavigationScope', () => {
      expect(getNavigationScope('/settings/steam')).toBe('appliance');
      expect(getNavigationScope('/dashboard')).toBe('server');
    });
  });
});
