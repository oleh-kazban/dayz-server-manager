import { z } from 'zod';

export const SERVER_STATUS = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  FAILED: 'failed',
} as const;

export const SERVER_STATUS_VALUES = [
  SERVER_STATUS.STOPPED,
  SERVER_STATUS.STARTING,
  SERVER_STATUS.RUNNING,
  SERVER_STATUS.STOPPING,
  SERVER_STATUS.FAILED,
] as const;

export const serverStatusSchema = z.enum(SERVER_STATUS_VALUES);
export type ServerStatus = z.infer<typeof serverStatusSchema>;

export const ACTIVE_SERVER_STATUSES: readonly ServerStatus[] = [
  SERVER_STATUS.RUNNING,
  SERVER_STATUS.STARTING,
  SERVER_STATUS.STOPPING,
];

const ACTIVE_SERVER_STATUS_SET = new Set<ServerStatus>(ACTIVE_SERVER_STATUSES);

export function isServerActiveStatus(status: ServerStatus): boolean {
  return ACTIVE_SERVER_STATUS_SET.has(status);
}

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

export const safePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(val => !val.includes('\0'), 'Null bytes are forbidden')
  .refine(val => !val.includes('..'), 'Path traversal (..) is not permitted')
  .refine(
    val => !/[<>"|?*]/.test(val) && !Array.from(val).some(c => c.charCodeAt(0) < 32),
    'Path contains invalid filesystem characters',
  )
  .refine(val => {
    const colonIndex = val.indexOf(':');
    if (colonIndex === -1) return true;
    return colonIndex === 1 && /^[a-zA-Z]/.test(val) && val.indexOf(':', 2) === -1;
  }, 'Colons are only permitted in Windows drive letter prefixes');

export const launchParametersSchema = z
  .string()
  .max(1024)
  .refine(val => !val.includes('\0'), 'Null bytes are forbidden');

export const serverIdParamSchema = z.object({
  id: z.string().uuid('Invalid server ID format. Must be a valid UUID.'),
});
export type ServerIdParamDto = z.infer<typeof serverIdParamSchema>;

export const serverDetailSchema = serverSummarySchema.extend({
  installPath: safePathSchema,
  profilePath: safePathSchema,
  missionPath: safePathSchema,
  launchParameters: launchParametersSchema.nullable().optional(),
});
export type ServerDetailDto = z.infer<typeof serverDetailSchema>;

export const createServerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(64),
    description: z.string().max(256).optional(),
    installPath: safePathSchema,
    profilePath: safePathSchema,
    missionPath: safePathSchema,
    gamePort: z.number().int().min(1024).max(65535).default(2302),
    queryPort: z.number().int().min(1024).max(65535).default(27016),
    rconPort: z.number().int().min(1024).max(65535).default(2310),
    rconPassword: z.string().min(6).optional(),
    launchParameters: launchParametersSchema.optional(),
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
    installPath: safePathSchema.optional(),
    profilePath: safePathSchema.optional(),
    missionPath: safePathSchema.optional(),
    gamePort: z.number().int().min(1024).max(65535).optional(),
    queryPort: z.number().int().min(1024).max(65535).optional(),
    rconPort: z.number().int().min(1024).max(65535).optional(),
    rconPassword: z.string().min(6).nullable().optional(),
    launchParameters: launchParametersSchema.nullable().optional(),
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
