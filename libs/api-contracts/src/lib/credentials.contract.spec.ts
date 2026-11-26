import { describe, expect, it } from 'vitest';

import { createPasswordSchema, passwordSchema, usernameSchema } from './credentials.contract';

const messageOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map(i => i.message) ?? [];

describe('passwordSchema', () => {
  it('accepts a password that meets every rule', () => {
    expect(passwordSchema.safeParse('Str0ng!Pass').success).toBe(true);
  });

  it('accepts the 8 and 64 character boundaries', () => {
    expect(passwordSchema.safeParse('Aa1!aaaa').success).toBe(true);
    expect(passwordSchema.safeParse(`Aa1!${'a'.repeat(60)}`).success).toBe(true);
  });

  it('rejects 7 and 65 characters with the Password subject', () => {
    expect(messageOf(passwordSchema.safeParse('Aa1!aaa'))).toContain(
      'Password must be at least 8 characters',
    );
    expect(messageOf(passwordSchema.safeParse(`Aa1!${'a'.repeat(61)}`))).toContain(
      'Password must not exceed 64 characters',
    );
  });

  it.each([
    ['NoNumber!Pass', 'Password must contain at least 1 number'],
    ['NOLOWER1!PASS', 'Password must contain at least 1 lowercase letter'],
    ['noupper1!pass', 'Password must contain at least 1 uppercase letter'],
    ['NoSpecial1Pass', 'Password must contain at least 1 special symbol'],
    ['Has Space1!', 'Whitespace is not permitted in passwords'],
  ])('rejects %j with its message', (value, message) => {
    expect(messageOf(passwordSchema.safeParse(value))).toContain(message);
  });
});

describe('createPasswordSchema', () => {
  it('uses the subject only in the two length messages', () => {
    const schema = createPasswordSchema('New password');
    expect(messageOf(schema.safeParse('Aa1!aaa'))).toContain(
      'New password must be at least 8 characters',
    );
    expect(messageOf(schema.safeParse(`Aa1!${'a'.repeat(61)}`))).toContain(
      'New password must not exceed 64 characters',
    );
    expect(messageOf(schema.safeParse('NoNumber!Pass'))).toContain(
      'Password must contain at least 1 number',
    );
  });
});

describe('usernameSchema', () => {
  it.each(['abc', 'a.b_c-d', 'A1'.repeat(16)])('accepts %j', value => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it('rejects 2 characters and 33 characters with their messages', () => {
    expect(messageOf(usernameSchema.safeParse('ab'))).toContain(
      'Username must be at least 3 characters',
    );
    expect(messageOf(usernameSchema.safeParse('a'.repeat(33)))).toContain(
      'Username must not exceed 32 characters',
    );
  });

  it.each(['has space', 'ünï', 'a@b', 'a/b', 'a:b'])(
    'rejects %j with the character rule',
    value => {
      expect(messageOf(usernameSchema.safeParse(value))).toContain(
        'Username may contain only letters, digits, ".", "_" and "-"',
      );
    },
  );
});
