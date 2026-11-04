import { z } from 'zod';

export const serverStatusSchema = z.enum(['stopped', 'starting', 'running', 'stopping', 'failed']);
export type ServerStatus = z.infer<typeof serverStatusSchema>;

export const serverSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  description: z.string().nullable().optional(),
  status: serverStatusSchema,
  gamePort: z.number().int().min(1024).max(65535),
  queryPort: z.number().int().min(1024).max(65535),
  rconPort: z.number().int().min(1024).max(65535),
  isDefault: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type ServerSummaryDto = z.infer<typeof serverSummarySchema>;

export const serverDetailSchema = serverSummarySchema.extend({
  installPath: z.string().min(1),
  profilePath: z.string().min(1),
  missionPath: z.string().min(1),
  launchParameters: z.string().nullable().optional(),
});
export type ServerDetailDto = z.infer<typeof serverDetailSchema>;

export const createServerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(64),
    description: z.string().max(256).optional(),
    installPath: z.string().min(1, 'Installation path is required'),
    profilePath: z.string().min(1, 'Profile path is required'),
    missionPath: z.string().min(1, 'Mission path is required'),
    gamePort: z.number().int().min(1024).max(65535).default(2302),
    queryPort: z.number().int().min(1024).max(65535).default(27016),
    rconPort: z.number().int().min(1024).max(65535).default(2310),
    rconPassword: z.string().min(6).optional(),
    launchParameters: z.string().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    data =>
      data.gamePort !== data.queryPort &&
      data.gamePort !== data.rconPort &&
      data.queryPort !== data.rconPort,
    {
      message: 'gamePort, queryPort, and rconPort must all be distinct ports',
      path: ['gamePort'],
    },
  );
export type CreateServerDto = z.infer<typeof createServerSchema>;

export const updateServerSchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    description: z.string().max(256).nullable().optional(),
    installPath: z.string().min(1).optional(),
    profilePath: z.string().min(1).optional(),
    missionPath: z.string().min(1).optional(),
    gamePort: z.number().int().min(1024).max(65535).optional(),
    queryPort: z.number().int().min(1024).max(65535).optional(),
    rconPort: z.number().int().min(1024).max(65535).optional(),
    rconPassword: z.string().min(6).nullable().optional(),
    launchParameters: z.string().nullable().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    data => {
      const ports = [data.gamePort, data.queryPort, data.rconPort].filter(
        (p): p is number => p !== undefined,
      );
      return new Set(ports).size === ports.length;
    },
    {
      message: 'Specified ports must not conflict with one another',
      path: ['gamePort'],
    },
  );
export type UpdateServerDto = z.infer<typeof updateServerSchema>;
