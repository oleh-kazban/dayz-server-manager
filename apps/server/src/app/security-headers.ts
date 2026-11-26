import type { FastifyInstance } from 'fastify';

/** Headers set on every response, including raw event streams that bypass `onSend`. */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
} as const;

export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook('onRequest', async (_request, reply) => {
    reply.headers(SECURITY_HEADERS);
  });
}
