import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';

import { serverQueryKeys } from '../server/server.queries';

import { useRealtimeState } from './realtime.context';
import type { EventSourceLike } from './realtime-connection';
import { RealtimeProvider } from './RealtimeProvider';

const ID = '22222222-2222-4222-8222-222222222222';

class FakeEventSource implements EventSourceLike {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  constructor(readonly url: string) {}
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, listener);
  }
  close() {
    this.closed = true;
  }
}

function StateProbe() {
  return <span data-testid="state">{useRealtimeState()}</span>;
}

describe('RealtimeProvider', () => {
  let sources: FakeEventSource[];
  const createEventSource = (url: string) => {
    const source = new FakeEventSource(url);
    sources.push(source);
    return source;
  };

  beforeEach(() => {
    sources = [];
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens one subscription, exposes its state, routes status events into the cache and closes on unmount', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), [
      {
        id: ID,
        name: 'Namalsk',
        status: 'running',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        isDefault: false,
        lastExit: null,
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      },
    ]);

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider createEventSource={createEventSource}>
          <StateProbe />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('/api/v1/realtime/sse?token=jwt-token');
    expect(screen.getByTestId('state')).toHaveTextContent('connecting');

    act(() => sources[0].onopen?.(new Event('open')));
    expect(screen.getByTestId('state')).toHaveTextContent('open');

    act(() =>
      sources[0].listeners.get('server.status.changed')?.(
        new MessageEvent('server.status.changed', {
          data: JSON.stringify({
            serverId: ID,
            status: 'stopping',
            lastExit: null,
            pendingStop: null,
          }),
        }),
      ),
    );
    expect(queryClient.getQueryData<ServerSummaryDto[]>(serverQueryKeys.list())?.[0].status).toBe(
      'stopping',
    );

    unmount();
    expect(sources[0].closed).toBe(true);
  });

  it('reports closed outside a provider', () => {
    render(<StateProbe />);
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
