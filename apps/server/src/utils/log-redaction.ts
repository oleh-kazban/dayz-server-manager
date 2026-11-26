import type { FastifyRequest } from 'fastify';

/** Query parameters whose values are credentials and must never reach a log (DSM-00348). */
const SECRET_QUERY_PARAMS = ['ticket', 'token', 'access_token', 'refresh_token', 'sessionToken'];

const SECRET_NAMES = new Set(SECRET_QUERY_PARAMS.map(name => name.toLowerCase()));

function isSecretName(rawName: string): boolean {
  try {
    return SECRET_NAMES.has(decodeURIComponent(rawName).toLowerCase());
  } catch {
    return false;
  }
}

/** `/sse?ticket=abc&x=1` → `/sse?ticket=[REDACTED]&x=1`. Names are matched after percent-decoding. */
export function redactUrl(url: string): string {
  // Each match is a separator plus one parameter; it stops at the next `&` or `#`.
  return url.replace(/[?&][^&#]*/g, pair => {
    const eq = pair.indexOf('=');
    return eq > 0 && isSecretName(pair.slice(1, eq)) ? `${pair.slice(0, eq + 1)}[REDACTED]` : pair;
  });
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
