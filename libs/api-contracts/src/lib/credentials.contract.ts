import { z } from 'zod';

/** The password rule, once. `subject` names the field in the two length messages. */
export const createPasswordSchema = (subject: string) =>
  z
    .string()
    .min(8, `${subject} must be at least 8 characters`)
    .max(64, `${subject} must not exceed 64 characters`)
    .regex(/\d/, 'Password must contain at least 1 number')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(
      /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`\\]/,
      'Password must contain at least 1 special symbol',
    )
    .regex(/^\S+$/, 'Whitespace is not permitted in passwords');

export const passwordSchema = createPasswordSchema('Password');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must not exceed 32 characters')
  .regex(/^[A-Za-z0-9._-]+$/, 'Username may contain only letters, digits, ".", "_" and "-"');
