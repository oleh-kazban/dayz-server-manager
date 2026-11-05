import { type ZodType } from 'zod';

import {
  type ApiErrorCode,
  apiErrorCodeSchema,
  type ApiErrorParams,
  apiErrorParamsSchema,
  type ApiFieldErrorsMap,
  apiFieldErrorsMapSchema,
} from '@dsm/api-contracts';

export type RefreshTokenHandler = () => Promise<string | null>;

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  onRefreshToken?: RefreshTokenHandler;
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

  get apiMessage(): string | undefined {
    if (this.data && typeof this.data === 'object' && 'message' in this.data) {
      const msg = (this.data as { message: unknown }).message;
      return typeof msg === 'string' ? msg : undefined;
    }
    return undefined;
  }

  get errorCode(): ApiErrorCode | undefined {
    if (this.data && typeof this.data === 'object' && 'errorCode' in this.data) {
      const parsed = apiErrorCodeSchema.safeParse((this.data as { errorCode: unknown }).errorCode);
      return parsed.success ? parsed.data : undefined;
    }
    return undefined;
  }

  get params(): ApiErrorParams | undefined {
    if (this.data && typeof this.data === 'object' && 'params' in this.data) {
      const parsed = apiErrorParamsSchema.safeParse((this.data as { params: unknown }).params);
      return parsed.success ? parsed.data : undefined;
    }
    return undefined;
  }

  get fieldErrors(): ApiFieldErrorsMap | undefined {
    if (this.data && typeof this.data === 'object' && 'fieldErrors' in this.data) {
      const parsed = apiFieldErrorsMapSchema.safeParse(
        (this.data as { fieldErrors: unknown }).fieldErrors,
      );
      return parsed.success ? parsed.data : undefined;
    }
    return undefined;
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
  private token: string | null = null;
  private onRefreshToken: RefreshTokenHandler | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
    this.onRefreshToken = config.onRefreshToken ?? null;
  }

  setOnRefreshToken(handler: RefreshTokenHandler | null): void {
    this.onRefreshToken = handler;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private prepareHeaders(init: RequestInit): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(init.headers as Record<string, string>),
    };

    if (init.body === undefined || init.body === null) {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-type') {
          delete headers[key];
        }
      }
    }

    return headers;
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (!this.refreshPromise && this.onRefreshToken) {
      this.refreshPromise = this.onRefreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  async request<T>(
    endpoint: string,
    schema: ZodType<T>,
    init: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.prepareHeaders(init);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const canRefresh =
        response.status === 401 &&
        !isRetry &&
        Boolean(this.onRefreshToken) &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh');

      if (canRefresh) {
        const newAccessToken = await this.tryRefreshToken();
        if (newAccessToken) {
          this.setToken(newAccessToken);
          return this.request(endpoint, schema, init, true);
        }
      }

      const rawText = await response.text();
      let errorData: unknown;
      try {
        errorData = JSON.parse(rawText);
      } catch {
        errorData = rawText;
      }
      const apiMessage =
        errorData &&
        typeof errorData === 'object' &&
        'message' in errorData &&
        typeof (errorData as { message: unknown }).message === 'string'
          ? (errorData as { message: string }).message
          : undefined;
      throw new ApiError(
        apiMessage ?? `HTTP request failed with status ${response.status}`,
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

  patch<T>(
    endpoint: string,
    schema: ZodType<T>,
    body?: unknown,
    init?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request(endpoint, schema, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, schema: ZodType<T>, init?: Omit<RequestInit, 'method'>): Promise<T> {
    return this.request(endpoint, schema, { ...init, method: 'DELETE' });
  }
}
