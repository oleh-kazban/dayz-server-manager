import { z } from 'zod';

export const ServerStatusEnum = z.enum(['STARTING', 'RUNNING', 'STOPPED', 'STOPPING', 'FAILED']);

export type ServerStatus = z.infer<typeof ServerStatusEnum>;

export const ServerStatusResponseSchema = z.object({
  status: ServerStatusEnum,
  pid: z.number().nullable(),
  port: z.number(),
  rconPort: z.number(),
  uptimeSeconds: z.number(),
  serverName: z.string(),
  maxPlayers: z.number(),
  activePlayers: z.number(),
  ip: z.string(),
  version: z.string(),
  map: z.string(),
});

export type ServerStatusResponse = z.infer<typeof ServerStatusResponseSchema>;

export const TelemetrySampleSchema = z.object({
  hostCpuPercent: z.number(),
  hostRamUsedMb: z.number(),
  hostRamTotalMb: z.number(),
  serverFps: z.number(),
  timestamp: z.number(),
});

export type TelemetrySample = z.infer<typeof TelemetrySampleSchema>;

export const ServerActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  taskId: z.string().optional(),
});

export type ServerActionResponse = z.infer<typeof ServerActionResponseSchema>;

export const StopServerRequestSchema = z.object({
  graceful: z.boolean().default(true),
  delaySec: z.number().int().min(0).default(60),
});

export type StopServerRequest = z.infer<typeof StopServerRequestSchema>;
