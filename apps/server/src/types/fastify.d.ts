import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '@aegis/api-contracts';
import type { DatabaseInstance, DsmDatabase } from '@aegis/database';

import type { SseHub } from '../services/realtime/sse-hub';
import type { SseTicketStore } from '../services/realtime/sse-ticket-store';
import type { ServerLifecycleService } from '../services/server/server-lifecycle.service';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Ticket (`?ticket=`, DSM-00348) or Authorization header, for SSE streams. */
    authenticateSse: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    db: DsmDatabase;
    sqlite: DatabaseInstance['sqlite'];
    closeDb: () => void;
    sseHub: SseHub;
    /** Single-use SSE tickets (DSM-00348). */
    sseTickets: SseTicketStore;
    /** Whether a session exists and has not expired; records activity. */
    isSessionActive: (sid: string) => boolean;
    lifecycle: ServerLifecycleService;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      username?: string;
      role?: UserRole;
      type?: 'access' | 'refresh';
      sid?: string;
    };
    user: {
      sub: string;
      username?: string;
      role?: UserRole;
      type?: 'access' | 'refresh';
      sid?: string;
    };
  }
}
