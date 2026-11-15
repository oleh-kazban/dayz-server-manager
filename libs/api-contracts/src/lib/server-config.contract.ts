import { z } from 'zod';

export const SERVER_CONFIG_MAX_BYTES = 64 * 1024;

export const CONFIG_FILE_KIND = {
  SERVER_DZ: 'server_dz',
} as const;

export const CONFIG_FILE_KIND_VALUES = [CONFIG_FILE_KIND.SERVER_DZ] as const;

export const configFileKindSchema = z.enum(CONFIG_FILE_KIND_VALUES);
export type ConfigFileKind = z.infer<typeof configFileKindSchema>;

export const CONFIG_EOL_VALUES = ['crlf', 'lf'] as const;

export const configEolSchema = z.enum(CONFIG_EOL_VALUES);
export type ConfigEol = z.infer<typeof configEolSchema>;

export const CONFIG_REVISION_SOURCE = {
  EDITOR: 'editor',
  RESTORE: 'restore',
  TEMPLATE: 'template',
  EXTERNAL: 'external',
} as const;

export const CONFIG_REVISION_SOURCE_VALUES = [
  CONFIG_REVISION_SOURCE.EDITOR,
  CONFIG_REVISION_SOURCE.RESTORE,
  CONFIG_REVISION_SOURCE.TEMPLATE,
  CONFIG_REVISION_SOURCE.EXTERNAL,
] as const;

export const configRevisionSourceSchema = z.enum(CONFIG_REVISION_SOURCE_VALUES);
export type ConfigRevisionSource = z.infer<typeof configRevisionSourceSchema>;

export const CONFIG_DIAGNOSTIC_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export const CONFIG_DIAGNOSTIC_SEVERITY_VALUES = [
  CONFIG_DIAGNOSTIC_SEVERITY.ERROR,
  CONFIG_DIAGNOSTIC_SEVERITY.WARNING,
] as const;

export const configDiagnosticSeveritySchema = z.enum(CONFIG_DIAGNOSTIC_SEVERITY_VALUES);
export type ConfigDiagnosticSeverity = z.infer<typeof configDiagnosticSeveritySchema>;

export const CONFIG_DIAGNOSTIC_CODE_VALUES = [
  'UNTERMINATED_STRING',
  'UNTERMINATED_COMMENT',
  'UNEXPECTED_CHARACTER',
  'UNEXPECTED_TOKEN',
  'UNEXPECTED_CLOSING_BRACE',
  'MISSING_SEMICOLON',
  'MISSING_EQUALS',
  'MISSING_VALUE',
  'MISSING_CLASS_NAME',
  'MISSING_CLASS_BODY',
  'UNCLOSED_CLASS',
  'UNCLOSED_ARRAY',
  'NESTED_ARRAY_UNSUPPORTED',
  'ARRAY_BRACKETS_MISMATCH',
  'DUPLICATE_SETTING',
  'UNKNOWN_SETTING',
  'INVALID_TYPE',
  'INVALID_VALUE',
  'OUT_OF_RANGE',
  'NON_RECOMMENDED_VALUE',
  'MISSION_TEMPLATE_MISSING',
  'MISSION_NOT_FOUND',
  'STEAM_QUERY_PORT_CONFLICT',
] as const;

export const configDiagnosticCodeSchema = z.enum(CONFIG_DIAGNOSTIC_CODE_VALUES);
export type ConfigDiagnosticCode = z.infer<typeof configDiagnosticCodeSchema>;

// Line and column are 1-based; endColumn points one past the last character.
export const configDiagnosticSchema = z.object({
  severity: configDiagnosticSeveritySchema,
  code: configDiagnosticCodeSchema,
  message: z.string().min(1),
  line: z.number().int().min(1),
  column: z.number().int().min(1),
  endLine: z.number().int().min(1),
  endColumn: z.number().int().min(1),
});
export type ConfigDiagnosticDto = z.infer<typeof configDiagnosticSchema>;

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint < 0x80) {
      bytes += 1;
    } else if (codePoint < 0x800) {
      bytes += 2;
    } else if (codePoint < 0x10000) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }
  return bytes;
}

export const serverConfigContentSchema = z
  .string()
  .refine(
    val => utf8ByteLength(val) <= SERVER_CONFIG_MAX_BYTES,
    `Configuration must not exceed ${SERVER_CONFIG_MAX_BYTES} bytes`,
  );

export const configContentHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'Content hash must be a lowercase SHA-256 hex digest');

export const configSessionTokenSchema = z.string().uuid('Session token must be a valid UUID');

export const serverDzProjectionSchema = z.object({
  missionTemplate: z.string().min(1).nullable(),
  steamQueryPort: z.number().int().min(1024).max(65535),
  maxPlayers: z.number().int().min(1).max(200),
});
export type ServerDzProjectionDto = z.infer<typeof serverDzProjectionSchema>;

export const configLockResponseSchema = z.object({
  holderUserId: z.string().min(1),
  holderName: z.string().min(1),
  acquiredAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  heldByYou: z.boolean(),
});
export type ConfigLockResponseDto = z.infer<typeof configLockResponseSchema>;

export const configRevisionSummarySchema = z.object({
  id: z.string().uuid(),
  source: configRevisionSourceSchema,
  authorUserId: z.string().min(1).nullable(),
  authorName: z.string().min(1).nullable(),
  contentHash: configContentHashSchema,
  createdAt: z.string().datetime(),
});
export type ConfigRevisionSummaryDto = z.infer<typeof configRevisionSummarySchema>;

export const configRevisionListSchema = z.array(configRevisionSummarySchema);
export type ConfigRevisionListDto = z.infer<typeof configRevisionListSchema>;

export const configRevisionDetailSchema = configRevisionSummarySchema.extend({
  content: z.string(),
});
export type ConfigRevisionDetailDto = z.infer<typeof configRevisionDetailSchema>;

export const configRevisionParamSchema = z.object({
  id: z.string().uuid('Invalid server ID format. Must be a valid UUID.'),
  revisionId: z.string().uuid('Invalid revision ID format. Must be a valid UUID.'),
});
export type ConfigRevisionParamDto = z.infer<typeof configRevisionParamSchema>;

export const getServerDzConfigQuerySchema = z.object({
  sessionToken: configSessionTokenSchema.optional(),
});
export type GetServerDzConfigQueryDto = z.infer<typeof getServerDzConfigQuerySchema>;

export const serverDzConfigResponseSchema = z.object({
  exists: z.boolean(),
  content: z.string().nullable(),
  contentHash: configContentHashSchema.nullable(),
  eol: configEolSchema,
  hasBom: z.boolean(),
  sizeBytes: z.number().int().min(0),
  projection: serverDzProjectionSchema.nullable(),
  serverRunning: z.boolean(),
  lock: configLockResponseSchema.nullable(),
  latestRevision: configRevisionSummarySchema.nullable(),
});
export type ServerDzConfigResponseDto = z.infer<typeof serverDzConfigResponseSchema>;

export const acquireConfigLockRequestSchema = z.object({
  sessionToken: configSessionTokenSchema,
  takeover: z.boolean().optional(),
});
export type AcquireConfigLockRequestDto = z.infer<typeof acquireConfigLockRequestSchema>;

export const configLockSessionRequestSchema = z.object({
  sessionToken: configSessionTokenSchema,
});
export type ConfigLockSessionRequestDto = z.infer<typeof configLockSessionRequestSchema>;

export const releaseConfigLockResponseSchema = z.object({
  released: z.boolean(),
});
export type ReleaseConfigLockResponseDto = z.infer<typeof releaseConfigLockResponseSchema>;

export const validateServerDzConfigRequestSchema = z.object({
  content: serverConfigContentSchema,
});
export type ValidateServerDzConfigRequestDto = z.infer<typeof validateServerDzConfigRequestSchema>;

export const validateServerDzConfigResponseSchema = z.object({
  valid: z.boolean(),
  diagnostics: z.array(configDiagnosticSchema),
});
export type ValidateServerDzConfigResponseDto = z.infer<
  typeof validateServerDzConfigResponseSchema
>;

export const saveServerDzConfigRequestSchema = z.object({
  sessionToken: configSessionTokenSchema,
  baseHash: configContentHashSchema,
  content: serverConfigContentSchema,
});
export type SaveServerDzConfigRequestDto = z.infer<typeof saveServerDzConfigRequestSchema>;

export const saveServerDzConfigResponseSchema = z.object({
  contentHash: configContentHashSchema,
  projection: serverDzProjectionSchema,
  diagnostics: z.array(configDiagnosticSchema),
  revision: configRevisionSummarySchema,
});
export type SaveServerDzConfigResponseDto = z.infer<typeof saveServerDzConfigResponseSchema>;

export const restoreConfigRevisionRequestSchema = z.object({
  sessionToken: configSessionTokenSchema,
  baseHash: configContentHashSchema,
});
export type RestoreConfigRevisionRequestDto = z.infer<typeof restoreConfigRevisionRequestSchema>;

export const bootstrapServerDzConfigRequestSchema = z.object({
  sessionToken: configSessionTokenSchema,
});
export type BootstrapServerDzConfigRequestDto = z.infer<
  typeof bootstrapServerDzConfigRequestSchema
>;

export const syncBattlEyeConfigResponseSchema = z.object({
  serverId: z.string().uuid(),
  syncedAt: z.string().datetime(),
  battleyeCfgPath: z.string().min(1),
  battleyeCfgWritten: z.boolean(),
  staleActiveFilesRemoved: z.array(z.string()),
  backupPaths: z.array(z.string()),
});
export type SyncBattlEyeConfigResponseDto = z.infer<typeof syncBattlEyeConfigResponseSchema>;
