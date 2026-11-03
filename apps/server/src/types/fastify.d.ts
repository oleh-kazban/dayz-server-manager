import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DatabaseInstance } from '@dsm/database';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    db: DatabaseInstance;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      username?: string;
      role?: string;
      type?: 'access' | 'refresh';
    };
    user: {
      sub: string;
      username?: string;
      role?: string;
      type?: 'access' | 'refresh';
    };
  }
}
