import { and, eq, ne } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import { changePasswordSchema, updateProfileSchema } from '@aegis/api-contracts';
import { hashPassword, sessions, users, verifyPassword } from '@aegis/database';

import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

export const registerProfileRoutes: FastifyPluginAsync = async fastify => {
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = fastify.db.select().from(users).where(eq(users.id, request.user.sub)).get();
      if (!user) {
        return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
      }

      return reply.send({
        id: user.id,
        username: user.username,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        role: user.role,
        timezone: user.timezone ?? 'UTC',
        timeFormat: user.timeFormat ?? '24h',
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      });
    },
  );

  fastify.patch(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = updateProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: 'Invalid profile update payload',
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { displayName, email, timezone, timeFormat } = parseResult.data;

      // Validate timezone as IANA identifier if provided
      if (timezone !== undefined) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch {
          return sendApiError(reply, 400, 'VALIDATION_FAILED', 'Invalid IANA timezone identifier');
        }
      }

      // Check user exists
      const user = fastify.db.select().from(users).where(eq(users.id, request.user.sub)).get();
      if (!user) {
        return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
      }

      // GUARD-03: whitelisted mutations only (username and role are strictly immutable)
      const updates: Partial<typeof users.$inferInsert> = {};
      if (displayName !== undefined) {
        updates.displayName = displayName;
      }
      if (email !== undefined) {
        updates.email = email === '' ? null : email;
      }
      if (timezone !== undefined) {
        updates.timezone = timezone;
      }
      if (timeFormat !== undefined) {
        updates.timeFormat = timeFormat;
      }

      if (Object.keys(updates).length > 0) {
        fastify.db.update(users).set(updates).where(eq(users.id, user.id)).run();
      }

      const updated = fastify.db.select().from(users).where(eq(users.id, user.id)).get();
      if (!updated) {
        return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
      }

      return reply.send({
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName ?? null,
        email: updated.email ?? null,
        role: updated.role,
        timezone: updated.timezone ?? 'UTC',
        timeFormat: updated.timeFormat ?? '24h',
        createdAt: updated.createdAt.toISOString(),
        lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
      });
    },
  );

  fastify.post(
    '/change-password',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = changePasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0]?.message || 'Invalid password change payload',
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { currentPassword, newPassword } = parseResult.data;

      const user = fastify.db.select().from(users).where(eq(users.id, request.user.sub)).get();
      if (!user) {
        return sendApiError(reply, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
      }

      // GUARD-01: verify currentPassword before any mutation
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return sendApiError(
          reply,
          400,
          'AUTH_PASSWORD_MISMATCH',
          'Current password does not match',
        );
      }

      // Update password hash
      const newPasswordHash = hashPassword(newPassword);
      fastify.db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id))
        .run();

      // Auto-revoke all other sessions for this user (R-01)
      const currentSid = request.user.sid;
      if (currentSid) {
        fastify.db
          .delete(sessions)
          .where(and(eq(sessions.userId, user.id), ne(sessions.id, currentSid)))
          .run();
      }

      return reply.send({
        success: true,
        message: 'Password updated successfully',
      });
    },
  );
};
