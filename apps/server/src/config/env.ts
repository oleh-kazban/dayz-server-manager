import { z } from 'zod';

/** Deny-list entries only: these values are rejected, never used. */
export const FORMER_PUBLIC_SESSION_SECRETS: readonly string[] = [
  'super-secret-dev-session-key-32-chars-long',
  'dev-insecure-secret-change-me-in-production-min-32-chars',
];

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:4200,http://127.0.0.1:4200'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SESSION_SECRET: z.preprocess(
    value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters')
      .refine(value => !FORMER_PUBLIC_SESSION_SECRETS.includes(value), {
        message: 'SESSION_SECRET must not be a former public value',
      })
      .optional(),
  ),
  DSM_ADMIN_PASSWORD: z.string().min(8).optional(),
  DATABASE_PATH: z.string().optional(),
  // Time a new DayZ process must survive before it counts as running (DSM-00162).
  DSM_SERVER_STARTUP_WINDOW_MS: z.coerce.number().int().min(0).default(60_000),
  DSM_SERVER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).default(5_000),
  // Watchdog after RCON #shutdown before the DayZ process is force-killed (DSM-00163).
  DSM_SERVER_STOP_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(60_000),
});

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
