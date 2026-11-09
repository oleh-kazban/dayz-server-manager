import { z } from 'zod';

import { safePathSchema } from './server.contract';

export const STEAM_APP_IDS = {
  DAYZ_SERVER_STABLE: 223350,
  DAYZ_SERVER_EXPERIMENTAL: 1042420,
  DAYZ_WORKSHOP: 221100,
} as const;

export const STEAM_AUTH_MODES = ['anonymous', 'account'] as const;
export const steamAuthModeSchema = z.enum(STEAM_AUTH_MODES);
export type SteamAuthMode = z.infer<typeof steamAuthModeSchema>;

export const STEAM_SESSION_STATUSES = [
  'UNAUTHENTICATED',
  'AUTHENTICATED',
  'CHALLENGE_REQUIRED',
  'EXPIRED',
] as const;
export const steamSessionStatusSchema = z.enum(STEAM_SESSION_STATUSES);
export type SteamSessionStatus = z.infer<typeof steamSessionStatusSchema>;

export const storageCapacitySchema = z.object({
  totalBytes: z.number().nonnegative(),
  freeBytes: z.number().nonnegative(),
});
export type StorageCapacity = z.infer<typeof storageCapacitySchema>;

export const storageStatsSchema = z.object({
  workshop: storageCapacitySchema.optional(),
  meta: storageCapacitySchema.optional(),
});
export type StorageStats = z.infer<typeof storageStatsSchema>;

export const steamSettingsSchema = z.object({
  id: z.string(),
  steamCmdPath: safePathSchema,
  steamWorkshopPath: safePathSchema,
  steamMetaPath: safePathSchema,
  authMode: steamAuthModeSchema,
  steamUsername: z.string().nullable().optional(),
  hasPassword: z.boolean(),
  gameServerAppId: z.number().int().positive('Game server App ID must be a positive integer'),
  workshopAppId: z.number().int().positive('Workshop App ID must be a positive integer'),
  branch: z.string().regex(/^[a-zA-Z0-9._-]+$/, 'Branch name contains invalid characters'),
  hasBranchPassword: z.boolean(),
  sessionStatus: steamSessionStatusSchema,
  storageStats: storageStatsSchema.optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type SteamSettingsDto = z.infer<typeof steamSettingsSchema>;

export const updateSteamSettingsSchema = z.object({
  steamCmdPath: safePathSchema.optional(),
  steamWorkshopPath: safePathSchema.optional(),
  steamMetaPath: safePathSchema.optional(),
  authMode: steamAuthModeSchema.optional(),
  steamUsername: z.string().nullable().optional(),
  steamPassword: z.string().optional(),
  gameServerAppId: z
    .number()
    .int()
    .positive('Game server App ID must be a positive integer')
    .optional(),
  workshopAppId: z.number().int().positive('Workshop App ID must be a positive integer').optional(),
  branch: z
    .string()
    .regex(/^[a-zA-Z0-9._-]+$/, 'Branch name contains invalid characters')
    .optional(),
  branchPassword: z.string().nullable().optional(),
});
export type UpdateSteamSettingsDto = z.infer<typeof updateSteamSettingsSchema>;

export const STEAM_CHALLENGE_TYPES = ['OTP_CODE', 'MOBILE_PUSH'] as const;
export const steamChallengeTypeSchema = z.enum(STEAM_CHALLENGE_TYPES);
export type SteamChallengeType = z.infer<typeof steamChallengeTypeSchema>;

export const steamChallengeEventSchema = z.object({
  challengeId: z.string().uuid(),
  type: steamChallengeTypeSchema,
  timeoutSeconds: z.number().default(90),
  createdAt: z.string().datetime(),
});
export type SteamChallengeEventDto = z.infer<typeof steamChallengeEventSchema>;

export const steamChallengeResponseSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[A-Z0-9]{5}$/, 'Must be 5 uppercase alphanumeric characters'),
});
export type SteamChallengeResponseDto = z.infer<typeof steamChallengeResponseSchema>;

export const steamChallengeAbortSchema = z.object({
  challengeId: z.string().uuid(),
});
export type SteamChallengeAbortDto = z.infer<typeof steamChallengeAbortSchema>;

export const steamDiagnosticsResultSchema = z.object({
  success: z.boolean(),
  steamCmdValid: z.boolean(),
  steamCmdVersion: z.string().optional(),
  workshopPathWritable: z.boolean(),
  workshopFreeBytes: z.number(),
  metaPathWritable: z.boolean(),
  metaFreeBytes: z.number(),
  connectionSuccess: z.boolean(),
  latencyMs: z.number().optional(),
  logs: z.array(z.string()),
  timestamp: z.string().datetime().or(z.date()),
});
export type SteamDiagnosticsResultDto = z.infer<typeof steamDiagnosticsResultSchema>;
