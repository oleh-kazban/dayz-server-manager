import { createAuthEndpoint } from './lib/endpoints/auth';
import { createHealthEndpoint } from './lib/endpoints/health';
import { createProfileEndpoint } from './lib/endpoints/profile';
import { createServersEndpoint } from './lib/endpoints/servers';
import { createSessionsEndpoint } from './lib/endpoints/sessions';
import { createSteamEndpoint } from './lib/endpoints/steam';
import { HttpClient, type HttpClientConfig } from './lib/http-client';

export * from './lib/endpoints/auth';
export * from './lib/endpoints/health';
export * from './lib/endpoints/profile';
export * from './lib/endpoints/servers';
export * from './lib/endpoints/sessions';
export * from './lib/endpoints/steam';
export * from './lib/http-client';

export function createApiClient(config: HttpClientConfig = {}) {
  const client = new HttpClient(config);

  return {
    client,
    auth: createAuthEndpoint(client),
    health: createHealthEndpoint(client),
    profile: createProfileEndpoint(client),
    servers: createServersEndpoint(client),
    sessions: createSessionsEndpoint(client),
    steam: createSteamEndpoint(client),
  };
}

export const apiClient = createApiClient();
