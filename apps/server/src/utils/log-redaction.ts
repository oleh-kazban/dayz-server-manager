import type { FastifyRequest } from 'fastify';

/** Query parameters whose values are credentials and must never reach a log (DSM-00348). */
const SECRET_QUERY_PARAMS = ['ticket', 'token', 'access_token', 'refresh_token'];

const SECRET_QUERY_PATTERN = new RegExp(
  String.raw`([?&](?:${SECRET_QUERY_PARAMS.join('|')})=)[^&#]*`,
  'gi',
);

/** `/sse?ticket=abc&x=1` → `/sse?ticket=[REDACTED]&x=1`. */
export function redactUrl(url: string): string {
  return url.replace(SECRET_QUERY_PATTERN, '$1[REDACTED]');
}

/**
 * Pino `req` serializer: Fastify's default fields, with credential query values redacted, so
 * request logs never contain an SSE ticket or a token passed in a URL.
 */
export function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: redactUrl(request.url),
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  };
}
