import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';

import { setupRootRequestSchema, USER_ROLE_VALUES } from '@aegis/api-contracts';

import { createRoot } from '../services/identity/create-root';
import { removeSetupFile, SETUP_FILE_NAME } from '../services/identity/setup-file';
import { issueSignIn, signInContext } from '../services/identity/sign-in';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

export const registerSetupRoutes: FastifyPluginAsync<{ setupFileDir: string }> = async (
  fastify,
  { setupFileDir },
) => {
  fastify.post(
    '/root',
    {
      onRequest: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
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
      if (request.user.role !== 'setup') {
        return sendApiError(
          reply,
          403,
          'AUTH_FORBIDDEN_ADMIN_REQUIRED',
          'Only the first-time setup session can create the root account.',
        );
      }

      const parseResult = setupRootRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: 'Invalid request payload',
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { username, password } = parseResult.data;
      const result = createRoot(
        { db: fastify.db, sqlite: fastify.sqlite },
        { callerId: request.user.sub, username, password },
      );
      if (!result.ok) {
        switch (result.reason) {
          case 'already-complete':
            return sendApiError(
              reply,
              409,
              'AUTH_SETUP_ALREADY_COMPLETE',
              'Setup is already complete.',
            );
          case 'expired':
            return sendApiError(
              reply,
              401,
              'AUTH_SETUP_SESSION_EXPIRED',
              'The setup session has expired',
            );
          case 'caller-gone':
            return sendApiError(
              reply,
              401,
              'AUTH_SESSION_INVALID',
              'Session is invalid or expired',
            );
          case 'username-taken': {
            const message = 'This username is already taken';
            return sendApiError(reply, 409, 'AUTH_USERNAME_TAKEN', {
              message,
              fieldErrors: { username: { code: 'AUTH_USERNAME_TAKEN', message } },
            });
          }
        }
      }

      try {
        removeSetupFile(setupFileDir);
      } catch {
        const file = path.join(setupFileDir, SETUP_FILE_NAME);
        request.log.warn({ file }, 'Could not delete the setup credentials file');
      }

      const response = issueSignIn(
        {
          db: fastify.db,
          signToken: (payload, expiresIn) => fastify.jwt.sign(payload, { expiresIn }),
        },
        result.user,
        signInContext(request, false),
      );
      return reply.send(response);
    },
  );
};
