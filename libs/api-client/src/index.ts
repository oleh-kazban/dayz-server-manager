import { createAuthEndpoint } from './lib/endpoints/auth';
import { createHealthEndpoint } from './lib/endpoints/health';
import { createModsEndpoint } from './lib/endpoints/mods';
import { createProfileEndpoint } from './lib/endpoints/profile';
import { createRealtimeEndpoint } from './lib/endpoints/realtime';
import { createServerConfigEndpoint } from './lib/endpoints/server-config';
import { createServersEndpoint } from './lib/endpoints/servers';
import { createSessionsEndpoint } from './lib/endpoints/sessions';
import { createSetupEndpoint } from './lib/endpoints/setup';
import { createSteamEndpoint } from './lib/endpoints/steam';
import { HttpClient, type HttpClientConfig } from './lib/http-client';

export * from './lib/endpoints/auth';
export * from './lib/endpoints/health';
export * from './lib/endpoints/mods';
export * from './lib/endpoints/profile';
export * from './lib/endpoints/realtime';
export * from './lib/endpoints/server-config';
export * from './lib/endpoints/servers';
export * from './lib/endpoints/sessions';
export * from './lib/endpoints/setup';
export * from './lib/endpoints/steam';
export * from './lib/http-client';

export function createApiClient(config: HttpClientConfig = {}) {
  const client = new HttpClient(config);

  return {
    client,
    auth: createAuthEndpoint(client),
    health: createHealthEndpoint(client),
    mods: createModsEndpoint(client),
    profile: createProfileEndpoint(client),
    realtime: createRealtimeEndpoint(client),
    serverConfig: createServerConfigEndpoint(client),
    servers: createServersEndpoint(client),
    sessions: createSessionsEndpoint(client),
    setup: createSetupEndpoint(client),
    steam: createSteamEndpoint(client),
  };
}

export const apiClient = createApiClient();
