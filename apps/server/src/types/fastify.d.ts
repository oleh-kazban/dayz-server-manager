import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DatabaseInstance, DsmDatabase } from '@aegis/database';

import type { SseHub } from '../services/realtime/sse-hub';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    db: DsmDatabase;
    sqlite: DatabaseInstance['sqlite'];
    closeDb: () => void;
    sseHub: SseHub;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      username?: string;
      role?: string;
      type?: 'access' | 'refresh';
      sid?: string;
    };
    user: {
      sub: string;
      username?: string;
      role?: string;
      type?: 'access' | 'refresh';
      sid?: string;
    };
  }
}
