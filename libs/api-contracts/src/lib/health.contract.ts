import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export type HealthResponseDto = z.infer<typeof healthResponseSchema>;
