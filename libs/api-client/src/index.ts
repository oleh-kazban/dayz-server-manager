import { createAuthEndpoint } from './lib/endpoints/auth';
import { createHealthEndpoint } from './lib/endpoints/health';
import { createServersEndpoint } from './lib/endpoints/servers';
import { HttpClient, type HttpClientConfig } from './lib/http-client';

export * from './lib/endpoints/auth';
export * from './lib/endpoints/health';
export * from './lib/endpoints/servers';
export * from './lib/http-client';

export function createApiClient(config: HttpClientConfig = {}) {
  const client = new HttpClient(config);

  return {
    client,
    auth: createAuthEndpoint(client),
    health: createHealthEndpoint(client),
    servers: createServersEndpoint(client),
  };
}

export const apiClient = createApiClient();
