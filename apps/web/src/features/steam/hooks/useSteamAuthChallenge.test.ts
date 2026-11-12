import { createElement, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import { showToast } from '@aegis/ui';

import { useSteamAuthChallenge } from './useSteamAuthChallenge';

class MockEventSource {
  public static readonly instances: MockEventSource[] = [];
  public url: string;
  public close = vi.fn();
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  public addEventListener(event: string, cb: (e: MessageEvent) => void) {
    const existing = this.listeners.get(event) ?? [];
    existing.push(cb);
    this.listeners.set(event, existing);
  }

  public emit(event: string, data: unknown) {
    const callbacks = this.listeners.get(event) ?? [];
    const msgEvent = {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    } as MessageEvent;
    for (const cb of callbacks) {
      cb(msgEvent);
    }
  }
}

describe('useSteamAuthChallenge (QA-04)', () => {
  let queryClient: QueryClient;
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances.length = 0;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

    vi.spyOn(showToast, 'success').mockReturnValue('toast-ok');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-err');
    vi.spyOn(showToast, 'info').mockReturnValue('toast-info');

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('appends ?token= query parameter to /api/v1/realtime/sse when apiClient.client.getToken() returns a token', () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue('jwt-token-abc');

    const { unmount } = renderHook(() => useSteamAuthChallenge(), { wrapper });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/v1/realtime/sse?token=jwt-token-abc');

    unmount();
    expect(MockEventSource.instances[0].close).toHaveBeenCalledTimes(1);
  });

  it('uses /api/v1/realtime/sse without query parameter when apiClient.client.getToken() returns null', () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue(null);

    renderHook(() => useSteamAuthChallenge(), { wrapper });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/v1/realtime/sse');
  });

  it('handles steam.auth.challenge, steam.auth.challenge.expired, steam.auth.status events, and respond/abort actions', async () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue('jwt-1');
    vi.spyOn(apiClient.steam, 'respondChallenge').mockResolvedValue({
      success: true,
      message: 'ok',
    });
    vi.spyOn(apiClient.steam, 'abortChallenge').mockResolvedValue({
      success: true,
      message: 'aborted',
    });

    const { result } = renderHook(() => useSteamAuthChallenge(), { wrapper });
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('steam.auth.challenge', {
        challengeId: 'ch-1',
        type: 'OTP_CODE',
        timeoutSeconds: 90,
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.activeChallenge?.challengeId).toBe('ch-1');

    await act(async () => {
      await result.current.respondToChallenge('8K9B2');
    });
    expect(apiClient.steam.respondChallenge).toHaveBeenCalledWith({
      challengeId: 'ch-1',
      code: '8K9B2',
    });

    // Test expired event for matching challengeId
    act(() => {
      es.emit('steam.auth.challenge.expired', { challengeId: 'ch-1' });
    });
    expect(result.current.activeChallenge).toBeNull();

    // Test MOBILE_PUSH challenge + abortChallenge + AUTHENTICATED status
    act(() => {
      es.emit('steam.auth.challenge', {
        challengeId: 'ch-2',
        type: 'MOBILE_PUSH',
        timeoutSeconds: 60,
        createdAt: new Date().toISOString(),
      });
    });
    expect(result.current.activeChallenge?.challengeId).toBe('ch-2');

    await act(async () => {
      await result.current.abortChallenge();
    });
    expect(apiClient.steam.abortChallenge).toHaveBeenCalledWith({ challengeId: 'ch-2' });
    expect(result.current.activeChallenge).toBeNull();

    act(() => {
      es.emit('steam.auth.status', { status: 'AUTHENTICATED' });
    });
    expect(showToast.success).toHaveBeenCalled();
  });
});
