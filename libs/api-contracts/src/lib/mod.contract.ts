import { z } from 'zod';

export const MOD_SOURCE_TYPE = {
  WORKSHOP: 'workshop',
  LOCAL: 'local',
} as const;

export const MOD_SOURCE_TYPE_VALUES = [MOD_SOURCE_TYPE.WORKSHOP, MOD_SOURCE_TYPE.LOCAL] as const;

export const modSourceTypeSchema = z.enum(MOD_SOURCE_TYPE_VALUES);
export type ModSourceType = z.infer<typeof modSourceTypeSchema>;

export const MOD_LOAD_TARGET = {
  CLIENT_SERVER: 'client_server',
  SERVER_ONLY: 'server_only',
  CLIENT_OPTIONAL: 'client_optional',
} as const;

export const MOD_LOAD_TARGET_VALUES = [
  MOD_LOAD_TARGET.CLIENT_SERVER,
  MOD_LOAD_TARGET.SERVER_ONLY,
  MOD_LOAD_TARGET.CLIENT_OPTIONAL,
] as const;

export const modLoadTargetSchema = z.enum(MOD_LOAD_TARGET_VALUES);
export type ModLoadTarget = z.infer<typeof modLoadTargetSchema>;

export const MOD_SYNC_STATUS = {
  UP_TO_DATE: 'up_to_date',
  UPDATE_AVAILABLE: 'update_available',
  NOT_SYNCED: 'not_synced',
  LOCAL: 'local',
} as const;

export const MOD_SYNC_STATUS_VALUES = [
  MOD_SYNC_STATUS.UP_TO_DATE,
  MOD_SYNC_STATUS.UPDATE_AVAILABLE,
  MOD_SYNC_STATUS.NOT_SYNCED,
  MOD_SYNC_STATUS.LOCAL,
] as const;

export const modSyncStatusSchema = z.enum(MOD_SYNC_STATUS_VALUES);
export type ModSyncStatus = z.infer<typeof modSyncStatusSchema>;

export const workshopIdSchema = z
  .string()
  .trim()
  .regex(/^\d{1,20}$/, 'Workshop ID must be a 1–20 digit numeric Steam PublishedFileId');

export const modFolderNameSchema = z
  .string()
  .trim()
  .min(2, 'Mod folder name must start with @ and include at least one character')
  .max(128, 'Mod folder name must be at most 128 characters')
  .refine(val => val.startsWith('@'), 'Mod folder name must start with @')
  .refine(val => !val.includes('\0'), 'Null bytes are forbidden in mod folder names')
  .refine(val => !val.includes('..'), 'Path traversal (..) is not permitted in mod folder names')
  .refine(
    val => !/[;/\\]/.test(val),
    'Mod folder name cannot contain semicolons or path separators',
  );

export const modIdParamSchema = z.object({
  id: z.string().uuid('Invalid server ID format. Must be a valid UUID.'),
  modId: z.string().uuid('Invalid mod ID format. Must be a valid UUID.'),
});
export type ModIdParamDto = z.infer<typeof modIdParamSchema>;

export const serverModSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string().uuid(),
  sourceType: modSourceTypeSchema,
  loadTarget: modLoadTargetSchema,
  workshopId: z.string().nullable(),
  workshopUrl: z.string().url().nullable(),
  folderName: z.string(),
  name: z.string().min(1).max(200),
  sizeBytes: z.number().int().nonnegative().nullable(),
  remoteUpdatedAt: z.string().datetime().or(z.date()).nullable(),
  syncedWorkshopUpdatedAt: z.string().datetime().or(z.date()).nullable(),
  lastSyncedAt: z.string().datetime().or(z.date()).nullable(),
  syncStatus: modSyncStatusSchema,
  enabled: z.boolean(),
  loadOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type ServerModDto = z.infer<typeof serverModSchema>;

export const launchParamsPreviewSchema = z.object({
  modFlag: z.string(),
  serverModFlag: z.string(),
  combinedArgs: z.array(z.string()),
  missingFolderCount: z.number().int().nonnegative(),
});
export type LaunchParamsPreviewDto = z.infer<typeof launchParamsPreviewSchema>;

export const serverModsListResponseSchema = z.object({
  mods: z.array(serverModSchema),
  launchPreview: launchParamsPreviewSchema,
  updateAvailableCount: z.number().int().nonnegative(),
});
export type ServerModsListResponseDto = z.infer<typeof serverModsListResponseSchema>;

export const addWorkshopModSchema = z.object({
  sourceType: z.literal(MOD_SOURCE_TYPE.WORKSHOP),
  workshopId: workshopIdSchema,
  name: z.string().trim().min(1, 'Mod name is required').max(200),
  folderName: z
    .union([modFolderNameSchema, z.literal('')])
    .optional()
    .default(''),
  loadTarget: modLoadTargetSchema.default(MOD_LOAD_TARGET.CLIENT_SERVER),
  enabled: z.boolean().default(true),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  remoteUpdatedAt: z.string().datetime().or(z.date()).nullable().optional(),
  markAsInstalled: z.boolean().optional().default(false),
});

export const addLocalModSchema = z.object({
  sourceType: z.literal(MOD_SOURCE_TYPE.LOCAL),
  name: z.string().trim().min(1, 'Mod name is required').max(200),
  folderName: modFolderNameSchema,
  loadTarget: modLoadTargetSchema.default(MOD_LOAD_TARGET.CLIENT_SERVER),
  enabled: z.boolean().default(true),
});

export const addServerModSchema = z.discriminatedUnion('sourceType', [
  addWorkshopModSchema,
  addLocalModSchema,
]);
export type AddServerModDto = z.input<typeof addServerModSchema>;

export const batchAddModItemSchema = addWorkshopModSchema.extend({
  sourceType: z.literal(MOD_SOURCE_TYPE.WORKSHOP).default(MOD_SOURCE_TYPE.WORKSHOP),
  markAsInstalled: z.boolean().optional(),
});

export const batchAddServerModsSchema = z.object({
  mods: z.array(batchAddModItemSchema).min(1).max(200),
  markAsInstalled: z.boolean().optional(),
});
export type BatchAddServerModsDto = z.input<typeof batchAddServerModsSchema>;

export const batchAddServerModsResponseSchema = z.object({
  added: z.array(serverModSchema),
  skippedCount: z.number().int().nonnegative(),
  mods: z.array(serverModSchema),
  launchPreview: launchParamsPreviewSchema,
  updateAvailableCount: z.number().int().nonnegative(),
});
export type BatchAddServerModsResponseDto = z.infer<typeof batchAddServerModsResponseSchema>;

export const updateServerModSchema = z
  .object({
    name: z.string().trim().min(1, 'Mod name is required').max(200).optional(),
    folderName: modFolderNameSchema.optional(),
    loadTarget: modLoadTargetSchema.optional(),
    enabled: z.boolean().optional(),
    markSynced: z.boolean().optional(),
  })
  .refine(
    data =>
      data.name !== undefined ||
      data.folderName !== undefined ||
      data.loadTarget !== undefined ||
      data.enabled !== undefined ||
      data.markSynced !== undefined,
    { message: 'At least one field must be provided for update' },
  );
export type UpdateServerModDto = z.infer<typeof updateServerModSchema>;

export const reorderServerModsSchema = z.object({
  modIds: z.array(z.string().uuid()),
});
export type ReorderServerModsDto = z.infer<typeof reorderServerModsSchema>;

export const workshopLookupRequestSchema = z.object({
  input: z.string().trim().min(1, 'Steam Workshop URL or PublishedFileId is required').max(512),
});
export type WorkshopLookupRequestDto = z.infer<typeof workshopLookupRequestSchema>;

export const workshopResolvedItemSchema = z.object({
  workshopId: workshopIdSchema,
  name: z.string(),
  suggestedFolderName: z.string(),
  shortDescription: z.string().nullable(),
  previewUrl: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  remoteUpdatedAt: z.string().datetime().nullable(),
  subscriptions: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
export type WorkshopResolvedItemDto = z.infer<typeof workshopResolvedItemSchema>;

export const workshopLookupResponseSchema = z.object({
  kind: z.enum(['item', 'collection']),
  collectionTitle: z.string().nullable(),
  items: z.array(workshopResolvedItemSchema),
  skippedCount: z.number().int().nonnegative(),
});
export type WorkshopLookupResponseDto = z.infer<typeof workshopLookupResponseSchema>;

export const WORKSHOP_SEARCH_MAX_PAGE = 1000;

export const workshopSearchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(1).max(WORKSHOP_SEARCH_MAX_PAGE).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type WorkshopSearchQueryDto = z.input<typeof workshopSearchQuerySchema>;

export const workshopSearchResponseSchema = z.object({
  items: z.array(workshopResolvedItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type WorkshopSearchResponseDto = z.infer<typeof workshopSearchResponseSchema>;
