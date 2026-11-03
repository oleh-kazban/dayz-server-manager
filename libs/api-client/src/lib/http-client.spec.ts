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
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
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
});
