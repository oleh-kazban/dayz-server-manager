import { z } from 'zod';

export const signInSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, 'Username or email is required')
    .refine(val => !val.includes('@') || z.string().email().safeParse(val).success, {
      message: 'Please enter a valid email address',
    }),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
