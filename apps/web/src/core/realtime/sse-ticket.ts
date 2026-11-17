import { apiClient } from '@aegis/api-client';

/**
 * A fresh single-use SSE ticket (DSM-00348), or `null` while signed out or when the request
 * fails (callers retry with their own backoff). The access token itself never goes into a URL.
 */
export async function requestSseTicket(): Promise<string | null> {
  if (!apiClient.client.getToken()) {
    return null;
  }
  try {
    return (await apiClient.realtime.createTicket()).ticket;
  } catch {
    return null;
  }
}
