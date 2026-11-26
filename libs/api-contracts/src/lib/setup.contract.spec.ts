import { describe, expect, it } from 'vitest';

import { signInResponseSchema } from './auth.contract';
import { setupRootRequestSchema, setupRootResponseSchema } from './setup.contract';

const valid = { username: 'root.user', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass' };

describe('setupRootRequestSchema', () => {
  it('accepts a valid body', () => {
    expect(setupRootRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('puts a password mismatch on confirmPassword', () => {
    const result = setupRootRequestSchema.safeParse({ ...valid, confirmPassword: 'Other1!Pass' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find(i => i.path.includes('confirmPassword'));
    expect(issue?.message).toBe('Passwords do not match');
  });

  it('requires the confirmation', () => {
    const result = setupRootRequestSchema.safeParse({ ...valid, confirmPassword: '' });
    expect(result.error?.issues.map(i => i.message)).toContain('Password confirmation is required');
  });

  it('reports the username rule on username', () => {
    const result = setupRootRequestSchema.safeParse({ ...valid, username: 'a b' });
    expect(result.error?.issues[0].path).toEqual(['username']);
  });

  it('reports the password rule on password', () => {
    const result = setupRootRequestSchema.safeParse({
      ...valid,
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.error?.issues.some(i => i.path[0] === 'password')).toBe(true);
  });

  it('rejects a body without fields', () => {
    expect(setupRootRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('setupRootResponseSchema', () => {
  it('is the sign-in response schema', () => {
    expect(setupRootResponseSchema).toBe(signInResponseSchema);
  });
});
