import { type ZodType } from 'zod';

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
  }

  async request<T>(endpoint: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...init.headers,
    };

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const rawText = await response.text();
      let errorData: unknown;
      try {
        errorData = JSON.parse(rawText);
      } catch {
        errorData = rawText;
      }
      throw new ApiError(
        `HTTP request failed with status ${response.status}`,
        response.status,
        errorData,
      );
    }

    const json = await response.json();
    const result = schema.safeParse(json);

    if (!result.success) {
      throw new ValidationError('Response schema validation failed', result.error.issues);
    }

    return result.data;
  }

  get<T>(endpoint: string, schema: ZodType<T>, init?: Omit<RequestInit, 'method'>): Promise<T> {
    return this.request(endpoint, schema, { ...init, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    schema: ZodType<T>,
    body?: unknown,
    init?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request(endpoint, schema, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(
    endpoint: string,
    schema: ZodType<T>,
    body?: unknown,
    init?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request(endpoint, schema, {
      ...init,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, schema: ZodType<T>, init?: Omit<RequestInit, 'method'>): Promise<T> {
    return this.request(endpoint, schema, { ...init, method: 'DELETE' });
  }
}
