import { describe, expect, it } from 'vitest';

import { validateSetupForm } from './setup.schema';

const valid = { username: 'owner', password: 'Str0ng!Pass1', confirmPassword: 'Str0ng!Pass1' };

describe('validateSetupForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validateSetupForm(valid)).toEqual({});
  });

  it('accepts the boundary lengths of the username (3 and 32) and password (8 and 64)', () => {
    const longPassword = `Aa1!${'a'.repeat(60)}`;
    expect(
      validateSetupForm({
        username: 'abc',
        password: 'Aa1!aaaa',
        confirmPassword: 'Aa1!aaaa',
      }),
    ).toEqual({});
    expect(
      validateSetupForm({
        username: 'a'.repeat(32),
        password: longPassword,
        confirmPassword: longPassword,
      }),
    ).toEqual({});
  });

  it.each([
    ['empty', '', 'Username is required'],
    ['under 3 characters', 'ab', 'Username must be at least 3 characters'],
    ['over 32 characters', 'a'.repeat(33), 'Username must not exceed 32 characters'],
    [
      'containing another character',
      'bad name',
      'Username may contain only letters, digits, ".", "_" and "-"',
    ],
  ])('reports a username that is %s', (_name, username, message) => {
    expect(validateSetupForm({ ...valid, username })).toEqual({ username: message });
  });

  it.each([
    ['empty', '', 'Password is required'],
    ['under 8 characters', 'Aa1!aaa', 'Password must be at least 8 characters'],
    ['over 64 characters', `Aa1!${'a'.repeat(61)}`, 'Password must not exceed 64 characters'],
    ['without a digit', 'NoNumberPass!', 'Password must contain at least 1 number'],
    [
      'without a lowercase letter',
      'ALLUPPER123!',
      'Password must contain at least 1 lowercase letter',
    ],
    [
      'without an uppercase letter',
      'alllower123!',
      'Password must contain at least 1 uppercase letter',
    ],
    [
      'without a special symbol',
      'NoSymbolPass123',
      'Password must contain at least 1 special symbol',
    ],
    ['with whitespace', 'Str0ng !Pass1', 'Whitespace is not permitted in passwords'],
  ])('reports a password that is %s', (_name, password, message) => {
    expect(validateSetupForm({ ...valid, password, confirmPassword: password })).toEqual({
      password: message,
    });
  });

  it('reports one message per field, all fields at once', () => {
    expect(validateSetupForm({ username: '', password: '', confirmPassword: '' })).toEqual({
      username: 'Username is required',
      password: 'Password is required',
    });
  });

  it('reports a different confirmation on the confirm field', () => {
    expect(validateSetupForm({ ...valid, confirmPassword: 'Different2@Pass' })).toEqual({
      confirmPassword: 'Passwords do not match',
    });
  });

  it('reports an empty confirmation as a mismatch when the password is valid', () => {
    expect(validateSetupForm({ ...valid, confirmPassword: '' })).toEqual({
      confirmPassword: 'Passwords do not match',
    });
  });

  it('checks the confirmation only when the password itself is valid', () => {
    expect(validateSetupForm({ ...valid, password: 'short', confirmPassword: 'other' })).toEqual({
      password: 'Password must be at least 8 characters',
    });
  });
});
