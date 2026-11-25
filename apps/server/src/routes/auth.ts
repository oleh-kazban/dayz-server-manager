import { eq, or } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import {
  type AuthUserDto,
  refreshRequestSchema,
  type RefreshResponseDto,
  signInRequestSchema,
  USER_ROLE_VALUES,
} from '@aegis/api-contracts';
import { sessions, users, verifyPassword } from '@aegis/database';

import { isSetupExpired } from '../services/identity/setup-account';
import { issueSignIn, signInContext } from '../services/identity/sign-in';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

export const registerAuthRoutes: FastifyPluginAsync = async fastify => {
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: {
          type: 'object',
          properties: {
            usernameOrEmail: { type: 'string' },
            password: { type: 'string' },
            rememberMe: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['accessToken', 'refreshToken', 'expiresIn', 'user'],
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'number' },
              user: {
                type: 'object',
                required: ['id', 'username', 'role'],
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  displayName: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string', enum: [...USER_ROLE_VALUES] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parseResult = signInRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: 'Invalid request payload',
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { usernameOrEmail, password } = parseResult.data;
      const user = fastify.db
        .select()
        .from(users)
        .where(or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)))
        .get();

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendApiError(reply, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password');
      }

      const ctx = signInContext(request, Boolean(parseResult.data.rememberMe));
      if (user.role === 'setup' && isSetupExpired(user.createdAt, ctx.now)) {
        return sendApiError(
          reply,
          401,
          'AUTH_SETUP_SESSION_EXPIRED',
          'The setup session has expired',
        );
      }

      const response = issueSignIn(
        {
          db: fastify.db,
          signToken: (payload, expiresIn) => fastify.jwt.sign(payload, { expiresIn }),
        },
        user,
        ctx,
      );

      return reply.send(response);
    },
  );

  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['accessToken', 'expiresIn'],
            properties: {
              accessToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parseResult = refreshRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: 'Invalid request payload',
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { refreshToken } = parseResult.data;

      try {
        const payload = fastify.jwt.verify<{ sub: string; type?: string; sid?: string }>(
          refreshToken,
        );
        if (payload.type !== 'refresh') {
          return sendApiError(reply, 401, 'AUTH_TOKEN_TYPE_INVALID', 'Invalid token type');
        }

        const user = fastify.db.select().from(users).where(eq(users.id, payload.sub)).get();
        if (!user) {
          return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
        }

        if (payload.sid) {
          const session = fastify.db
            .select()
            .from(sessions)
            .where(eq(sessions.id, payload.sid))
            .get();
          if (!session || session.expiresAt.getTime() <= Date.now()) {
            return sendApiError(
              reply,
              401,
              'AUTH_SESSION_EXPIRED',
              'Session has expired or was revoked',
            );
          }

          // Throttle lastActiveAt update
          const now = Date.now();
          if (now - session.lastActiveAt.getTime() > 60_000) {
            fastify.db
              .update(sessions)
              .set({ lastActiveAt: new Date(now) })
              .where(eq(sessions.id, session.id))
              .run();
          }
        }

        const accessToken = fastify.jwt.sign(
          {
            sub: user.id,
            username: user.username,
            role: user.role,
            type: 'access',
            sid: payload.sid,
          },
          { expiresIn: '15m' },
        );

        const response: RefreshResponseDto = {
          accessToken,
          expiresIn: 900,
        };
        return reply.send(response);
      } catch {
        return sendApiError(
          reply,
          401,
          'AUTH_REFRESH_TOKEN_INVALID',
          'Invalid or expired refresh token',
        );
      }
    },
  );

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['id', 'username', 'role'],
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              displayName: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string', enum: [...USER_ROLE_VALUES] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = fastify.db.select().from(users).where(eq(users.id, request.user.sub)).get();
      if (!user) {
        return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
      }

      const response: AuthUserDto = {
        id: user.id,
        username: user.username,
        displayName: user.displayName ?? undefined,
        email: user.email ?? undefined,
        role: user.role,
      };

      return reply.send(response);
    },
  );
};
