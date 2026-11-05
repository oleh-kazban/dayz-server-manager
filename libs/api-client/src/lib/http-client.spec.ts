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

  it('extracts apiMessage, errorCode, params, and fieldErrors from structured ApiError data object', () => {
    const err = new ApiError('Bad parameters', 400, {
      statusCode: 400,
      error: 'Bad Request',
      errorCode: 'VALIDATION_FAILED',
      message: 'Bad parameters',
      params: { port: 2302, occupiedBy: 'DayZ Local', locked: true },
      fieldErrors: {
        gamePort: {
          code: 'NUMBER_TOO_SMALL',
          message: 'Port must be >= 1024',
          params: { min: 1024 },
        },
      },
    });

    expect(err.apiMessage).toBe('Bad parameters');
    expect(err.errorCode).toBe('VALIDATION_FAILED');
    expect(err.params).toEqual({ port: 2302, occupiedBy: 'DayZ Local', locked: true });
    expect(err.fieldErrors).toEqual({
      gamePort: {
        code: 'NUMBER_TOO_SMALL',
        message: 'Port must be >= 1024',
        params: { min: 1024 },
      },
    });
  });

  it('gracefully returns undefined for errorCode, params, fieldErrors, and apiMessage on unstructured or invalid payloads', () => {
    const errPlainText = new ApiError('HTTP error', 502, 'Bad Gateway');
    expect(errPlainText.apiMessage).toBeUndefined();
    expect(errPlainText.errorCode).toBeUndefined();
    expect(errPlainText.params).toBeUndefined();
    expect(errPlainText.fieldErrors).toBeUndefined();

    const errInvalidFields = new ApiError('HTTP error', 400, {
      message: 12345,
      errorCode: 'UNRECOGNIZED_ERROR_CODE',
      params: { nested: { invalid: true } },
      fieldErrors: { badField: { code: '', message: '' } },
    });
    expect(errInvalidFields.apiMessage).toBeUndefined();
    expect(errInvalidFields.errorCode).toBeUndefined();
    expect(errInvalidFields.params).toBeUndefined();
    expect(errInvalidFields.fieldErrors).toBeUndefined();
  });

  it('uses backend message as primary ApiError.message when HTTP request fails with structured JSON', async () => {
    const errorPayload = {
      statusCode: 409,
      error: 'Conflict',
      errorCode: 'SERVER_NAME_CONFLICT',
      message: "Server with name 'DayZ (Local)' already exists",
      params: { name: 'DayZ (Local)' },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(errorPayload), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new HttpClient();
    await expect(client.post('/servers', dummySchema, { name: 'DayZ (Local)' })).rejects.toSatisfy(
      (err: unknown) => {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.message).toBe("Server with name 'DayZ (Local)' already exists");
        expect(apiErr.apiMessage).toBe("Server with name 'DayZ (Local)' already exists");
        expect(apiErr.errorCode).toBe('SERVER_NAME_CONFLICT');
        expect(apiErr.params).toEqual({ name: 'DayZ (Local)' });
        return true;
      },
    );
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
