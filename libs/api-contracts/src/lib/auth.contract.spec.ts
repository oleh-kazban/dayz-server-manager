import { describe, expect, it } from 'vitest';

import {
  authUserSchema,
  refreshResponseSchema,
  USER_ROLE_VALUES,
  userRoleSchema,
} from './auth.contract';

describe('Auth contract roles', () => {
  it('lists root, admin and setup as the role values', () => {
    expect([...USER_ROLE_VALUES]).toEqual(['root', 'admin', 'setup']);
  });

  it('builds userRoleSchema from USER_ROLE_VALUES', () => {
    expect([...userRoleSchema.options]).toEqual([...USER_ROLE_VALUES]);
  });

  it.each(['root', 'admin', 'setup'])('userRoleSchema accepts %s', role => {
    expect(userRoleSchema.safeParse(role).success).toBe(true);
  });

  it.each(['moderator', 'viewer', 'superadmin', '', null, undefined])(
    'userRoleSchema rejects %s',
    role => {
      expect(userRoleSchema.safeParse(role).success).toBe(false);
    },
  );

  it.each(['root', 'admin', 'setup'])('authUserSchema accepts a user with role %s', role => {
    const result = authUserSchema.safeParse({ id: 'u1', username: 'name', role });
    expect(result.success).toBe(true);
  });

  it.each(['viewer', '', undefined])('authUserSchema rejects a user with role %s', role => {
    expect(authUserSchema.safeParse({ id: 'u1', username: 'name', role }).success).toBe(false);
  });
});

describe('refreshResponseSchema (AC-4)', () => {
  it('accepts a response with the rotated refresh token', () => {
    const result = refreshResponseSchema.safeParse({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('rejects a response with a %s refresh token', (_name, refreshToken) => {
    const result = refreshResponseSchema.safeParse({
      accessToken: 'access',
      refreshToken,
      expiresIn: 900,
    });

    expect(result.success).toBe(false);
  });
});
