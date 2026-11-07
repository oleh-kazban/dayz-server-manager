import { z } from 'zod';

export const sessionDtoSchema = z.object({
  id: z.string().min(1),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  deviceSummary: z.string(),
  lastActiveAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isCurrent: z.boolean(),
});
export type SessionDto = z.infer<typeof sessionDtoSchema>;

export const sessionListResponseSchema = z.object({
  sessions: z.array(sessionDtoSchema),
  totalCount: z.number().int().nonnegative(),
});
export type SessionListResponseDto = z.infer<typeof sessionListResponseSchema>;

export const revokeOthersResponseSchema = z.object({
  revokedCount: z.number().int().nonnegative(),
  message: z.string(),
});
export type RevokeOthersResponseDto = z.infer<typeof revokeOthersResponseSchema>;
