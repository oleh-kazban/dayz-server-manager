import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchStaticDoc, staticDocQueryKeys, useStaticDoc } from '../useStaticDoc';

describe('useStaticDoc and fetchStaticDoc', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('queryKeys contract', () => {
    it('produces predictable query keys for caching', () => {
      expect(staticDocQueryKeys.all).toEqual(['static-doc']);
      expect(staticDocQueryKeys.doc('faq')).toEqual(['static-doc', 'faq']);
      expect(staticDocQueryKeys.doc('history')).toEqual(['static-doc', 'history']);
    });
  });

  describe('fetchStaticDoc', () => {
    it('fetches /assets/content/faq.md and returns text on 200 response', async () => {
      const mockMarkdown = '# DayZ Operator FAQ\nPorts: 2302';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockMarkdown,
      });
      vi.stubGlobal('fetch', mockFetch);

      const content = await fetchStaticDoc('faq');

      expect(mockFetch).toHaveBeenCalledWith('/assets/content/faq.md');
      expect(content).toBe(mockMarkdown);
    });

    it('fetches /assets/content/history.md and returns text on 200 response', async () => {
      const mockMarkdown = '# Release History\n## [DSM-00101]';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockMarkdown,
      });
      vi.stubGlobal('fetch', mockFetch);

      const content = await fetchStaticDoc('history');

      expect(mockFetch).toHaveBeenCalledWith('/assets/content/history.md');
      expect(content).toBe(mockMarkdown);
    });

    it('throws structured Error when HTTP response is not ok (404)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchStaticDoc('faq')).rejects.toThrow(
        'Failed to fetch documentation: 404 Not Found',
      );
    });

    it('throws structured Error when HTTP response is 500 Internal Server Error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchStaticDoc('history')).rejects.toThrow(
        'Failed to fetch documentation: 500 Internal Server Error',
      );
    });
  });

  describe('useStaticDoc hook', () => {
    it('transitions to success state with resolved markdown data', async () => {
      const mockMarkdown = '# Operator FAQ\nDayZ persistence guide';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => mockMarkdown,
        }),
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStaticDoc('faq'), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(mockMarkdown);
      expect(result.current.isError).toBe(false);
    });

    it('transitions to error state when network fetch rejects', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStaticDoc('history'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain(
        'Failed to fetch documentation: 404 Not Found',
      );
    });

    it('respects staleTime: Infinity by not re-fetching within session', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '# FAQ content',
      });
      vi.stubGlobal('fetch', mockFetch);

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useStaticDoc('faq'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Re-render hook
      rerender();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
