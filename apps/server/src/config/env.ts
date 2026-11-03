import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:4200,http://127.0.0.1:4200'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SESSION_SECRET: z.string().min(16).default('super-secret-dev-session-key-32-chars-long'),
    DSM_ADMIN_PASSWORD: z.string().min(8).optional(),
    DATABASE_PATH: z.string().optional(),
  })
  .refine(
    data => {
      if (data.NODE_ENV === 'production') {
        return (
          data.SESSION_SECRET !== 'super-secret-dev-session-key-32-chars-long' &&
          data.SESSION_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message:
        'SESSION_SECRET must be an explicit, strong secret (at least 32 characters) outside development and tests',
      path: ['SESSION_SECRET'],
    },
  );

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(env: Record<string, string | undefined> = process.env): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }

  return result.data;
}
