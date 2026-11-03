import { z } from 'zod';

export const signInSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, { error: 'Username or email is required' })
    .refine(val => !val.includes('@') || z.email().safeParse(val).success, {
      error: 'Please enter a valid email address',
    }),
  password: z.string().min(1, { error: 'Password is required' }),
  rememberMe: z.boolean(),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
