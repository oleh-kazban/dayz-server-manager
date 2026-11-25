import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '@aegis/api-contracts';

import { sendApiError } from '../utils/api-error';

export const ADMIN_FORBIDDEN_MESSAGE =
  'Administrator privileges are required to perform this action.';
export const ROOT_FORBIDDEN_MESSAGE = 'Root privileges are required to perform this action.';

/** Routes a non-admin role may call after `authenticate`, as "METHOD pattern". */
export const ROLE_GATE_OPEN_ROUTES: ReadonlySet<string> = new Set(['GET /api/v1/auth/me']);

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === 'root' || role === 'admin';
}

const forbidAdmin = (reply: FastifyReply) =>
  sendApiError(reply, 403, 'AUTH_FORBIDDEN_ADMIN_REQUIRED', ADMIN_FORBIDDEN_MESSAGE);

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  if (!isAdminRole(request.user?.role)) {
    return forbidAdmin(reply);
  }
  return undefined;
}

export async function requireRoot(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  if (request.user?.role !== 'root') {
    return sendApiError(reply, 403, 'AUTH_FORBIDDEN_ROOT_REQUIRED', ROOT_FORBIDDEN_MESSAGE);
  }
  return undefined;
}

/** Default-deny: only admin and root pass, unless the route is in the allowlist. */
export async function enforceRoleGate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  const key = `${request.method} ${request.routeOptions.url}`;
  if (isAdminRole(request.user?.role) || ROLE_GATE_OPEN_ROUTES.has(key)) {
    return undefined;
  }
  return forbidAdmin(reply);
}
