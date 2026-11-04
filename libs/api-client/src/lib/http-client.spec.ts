import { z } from 'zod';

import { createApiClient } from '../index';

import { ApiError, HttpClient, ValidationError } from './http-client';

describe('HttpClient', () => {
  const dummySchema = z.object({
    id: z.string(),
    value: z.number(),
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs successful GET request and validates response schema', async () => {
    const mockPayload = { id: 'test-1', value: 42 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new HttpClient({ baseUrl: 'http://localhost:5000' });
    const result = await client.get('/test', dummySchema);

    expect(result).toEqual(mockPayload);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(fetchCall[0]).toBe('http://localhost:5000/test');
    expect(fetchCall[1]?.method).toBe('GET');
    expect(fetchCall[1]?.headers).not.toHaveProperty('Content-Type');
  });

  it('omits Content-Type header on body-less requests and includes it when body exists', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 'test-del', value: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const client = new HttpClient();
    await client.delete('/test', dummySchema);
    const deleteCall = fetchSpy.mock.calls[0];
    expect(deleteCall[1]?.method).toBe('DELETE');
    expect(deleteCall[1]?.headers).not.toHaveProperty('Content-Type');

    await client.post('/test', dummySchema, { value: 1 });
    const postCall = fetchSpy.mock.calls[1];
    expect(postCall[1]?.method).toBe('POST');
    expect(postCall[1]?.headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('throws ApiError when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Internal Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new HttpClient();
    await expect(client.get('/fail', dummySchema)).rejects.toThrow(ApiError);
  });

  it('handles non-JSON error responses gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Gateway Timeout', {
        status: 504,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const client = new HttpClient();
    const errorPromise = client.get('/timeout', dummySchema);
    await expect(errorPromise).rejects.toThrow(ApiError);
    await expect(errorPromise).rejects.toMatchObject({
      status: 504,
      data: 'Gateway Timeout',
    });
  });

  it('throws ValidationError when response schema does not match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'test-1', value: 'not-a-number' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new HttpClient();
    await expect(client.get('/invalid', dummySchema)).rejects.toThrow(ValidationError);
  });

  it('serializes body for POST and PUT requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 'created', value: 100 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const client = new HttpClient();
    await client.post('/items', dummySchema, { value: 100 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ value: 100 }),
      }),
    );

    await client.put('/items/1', dummySchema, { value: 200 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/items/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: 200 }),
      }),
    );

    await client.delete('/items/1', dummySchema);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/items/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('calls health endpoint using createApiClient', async () => {
    const healthPayload = {
      status: 'ok',
      uptime: 123.45,
      timestamp: new Date().toISOString(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(healthPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const api = createApiClient({ baseUrl: 'http://localhost:5000' });
    const health = await api.health.get();

    expect(health.status).toBe('ok');
    expect(health.uptime).toBe(123.45);
  });

  it('extracts apiMessage from ApiError data object', () => {
    const err = new ApiError('HTTP error', 400, { message: 'Bad parameters' });
    expect(err.apiMessage).toBe('Bad parameters');

    const errNoMsg = new ApiError('HTTP error', 500, 'Raw string');
    expect(errNoMsg.apiMessage).toBeUndefined();
  });

  it('automatically refreshes token on 401 and retries the request', async () => {
    const mockPayload = { id: 'retry-success', value: 99 };
    const refreshHandler = vi.fn().mockResolvedValue('new-token-123');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const client = new HttpClient({
      onRefreshToken: refreshHandler,
    });
    client.setToken('old-expired-token');

    const result = await client.get('/protected-resource', dummySchema);

    expect(result).toEqual(mockPayload);
    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(client.getToken()).toBe('new-token-123');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent 401 refresh calls into a single refresh execution', async () => {
    const mockPayload = { id: 'retry-success', value: 99 };
    let resolveRefresh: (token: string) => void;
    const refreshPromise = new Promise<string>(resolve => {
      resolveRefresh = resolve;
    });
    const refreshHandler = vi.fn().mockImplementation(() => refreshPromise);

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const client = new HttpClient({ onRefreshToken: refreshHandler });
    client.setToken('old-expired-token');

    const request1 = client.get('/protected-1', dummySchema);
    const request2 = client.get('/protected-2', dummySchema);

    resolveRefresh!('shared-new-token');

    const [res1, res2] = await Promise.all([request1, request2]);
    expect(res1).toEqual(mockPayload);
    expect(res2).toEqual(mockPayload);
    expect(refreshHandler).toHaveBeenCalledTimes(1);
  });

  it('throws 401 error if refresh handler returns null or throws', async () => {
    const refreshHandler = vi.fn().mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new HttpClient({ onRefreshToken: refreshHandler });
    await expect(client.get('/protected', dummySchema)).rejects.toThrow(ApiError);
  });
});
