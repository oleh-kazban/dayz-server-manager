import { eq, or } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import {
  type AuthUserDto,
  refreshRequestSchema,
  type RefreshResponseDto,
  signInRequestSchema,
  type SignInResponseDto,
} from '@dsm/api-contracts';
import { users, verifyPassword } from '@dsm/database';

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
    },
    async (request, reply) => {
      const parseResult = signInRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest('Invalid request payload');
      }

      const { usernameOrEmail, password } = parseResult.data;
      const user = fastify.db.db
        .select()
        .from(users)
        .where(or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)))
        .get();

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return reply.unauthorized('Invalid username or password');
      }

      // Update lastLoginAt timestamp
      fastify.db.db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id))
        .run();

      const accessToken = fastify.jwt.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
          type: 'access',
        },
        { expiresIn: '15m' },
      );

      const refreshToken = fastify.jwt.sign(
        {
          sub: user.id,
          type: 'refresh',
        },
        { expiresIn: '7d' },
      );

      const response: SignInResponseDto = {
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: {
          id: user.id,
          username: user.username,
          email: user.email ?? undefined,
          role: user.role,
        },
      };

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
    },
    async (request, reply) => {
      const parseResult = refreshRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest('Invalid request payload');
      }

      const { refreshToken } = parseResult.data;

      try {
        const payload = fastify.jwt.verify<{ sub: string; type?: string }>(refreshToken);
        if (payload.type !== 'refresh') {
          return reply.unauthorized('Invalid token type');
        }

        const user = fastify.db.db.select().from(users).where(eq(users.id, payload.sub)).get();
        if (!user) {
          return reply.unauthorized('User not found');
        }

        const accessToken = fastify.jwt.sign(
          {
            sub: user.id,
            username: user.username,
            role: user.role,
            type: 'access',
          },
          { expiresIn: '15m' },
        );

        const response: RefreshResponseDto = {
          accessToken,
          expiresIn: 900,
        };
        return reply.send(response);
      } catch {
        return reply.unauthorized('Invalid or expired refresh token');
      }
    },
  );

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = fastify.db.db.select().from(users).where(eq(users.id, request.user.sub)).get();
      if (!user) {
        return reply.unauthorized('User not found');
      }

      const response: AuthUserDto = {
        id: user.id,
        username: user.username,
        email: user.email ?? undefined,
        role: user.role,
      };

      return reply.send(response);
    },
  );
};
