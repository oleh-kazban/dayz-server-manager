import { z } from 'zod';

export const LAUNCH_CPU_COUNT_RANGE = { min: 1, max: 64 } as const;
export const LAUNCH_FPS_RANGE = { min: 1, max: 200 } as const;

const cpuCountSchema = z
  .number()
  .int('CPU count must be a whole number')
  .min(
    LAUNCH_CPU_COUNT_RANGE.min,
    `CPU count must be between ${LAUNCH_CPU_COUNT_RANGE.min} and ${LAUNCH_CPU_COUNT_RANGE.max}`,
  )
  .max(
    LAUNCH_CPU_COUNT_RANGE.max,
    `CPU count must be between ${LAUNCH_CPU_COUNT_RANGE.min} and ${LAUNCH_CPU_COUNT_RANGE.max}`,
  );

const limitFpsSchema = z
  .number()
  .int('FPS limit must be a whole number')
  .min(
    LAUNCH_FPS_RANGE.min,
    `FPS limit must be between ${LAUNCH_FPS_RANGE.min} and ${LAUNCH_FPS_RANGE.max}`,
  )
  .max(
    LAUNCH_FPS_RANGE.max,
    `FPS limit must be between ${LAUNCH_FPS_RANGE.min} and ${LAUNCH_FPS_RANGE.max}`,
  );

/**
 * Operator-editable DayZ server launch options (DSM-00125).
 *
 * Every key defaults to its "off" value so a stored `{}` (or a row written before a key
 * existed) parses to "no operator flags". Unknown keys are rejected: there is deliberately
 * no free-form argument channel.
 */
export const launchOptionsSchema = z
  .object({
    cpuCount: cpuCountSchema.nullable().default(null),
    limitFPS: limitFpsSchema.nullable().default(null),
    doLogs: z.boolean().default(false),
    adminLog: z.boolean().default(false),
    netLog: z.boolean().default(false),
    freezeCheck: z.boolean().default(false),
    scriptDebug: z.boolean().default(false),
    filePatching: z.boolean().default(false),
  })
  .strict();
export type LaunchOptionsDto = z.infer<typeof launchOptionsSchema>;
export type LaunchOptionsInput = z.input<typeof launchOptionsSchema>;

export const EMPTY_LAUNCH_OPTIONS: LaunchOptionsDto = Object.freeze({
  cpuCount: null,
  limitFPS: null,
  doLogs: false,
  adminLog: false,
  netLog: false,
  freezeCheck: false,
  scriptDebug: false,
  filePatching: false,
});

/** Options applied to newly created servers (equivalent to `-cpuCount=4 -doLogs -adminLog -netLog`). */
export const DEFAULT_LAUNCH_OPTIONS: LaunchOptionsDto = Object.freeze({
  ...EMPTY_LAUNCH_OPTIONS,
  cpuCount: 4,
  doLogs: true,
  adminLog: true,
  netLog: true,
});

export const LAUNCH_PLATFORM_VALUES = ['win32', 'linux'] as const;
export const launchPlatformSchema = z.enum(LAUNCH_PLATFORM_VALUES);
export type LaunchPlatform = z.infer<typeof launchPlatformSchema>;

export const LAUNCH_ARG_SOURCE = {
  MANAGED: 'managed',
  MODS: 'mods',
  OPERATOR: 'operator',
} as const;
export const LAUNCH_ARG_SOURCE_VALUES = [
  LAUNCH_ARG_SOURCE.MANAGED,
  LAUNCH_ARG_SOURCE.MODS,
  LAUNCH_ARG_SOURCE.OPERATOR,
] as const;
export const launchArgSourceSchema = z.enum(LAUNCH_ARG_SOURCE_VALUES);
export type LaunchArgSource = z.infer<typeof launchArgSourceSchema>;

export const LAUNCH_ISSUE_CODE_VALUES = [
  'LAUNCH_INSTALL_PATH_INVALID',
  'LAUNCH_PROFILE_PATH_INVALID',
  'LAUNCH_PORT_INVALID',
  'LAUNCH_MOD_FOLDER_INVALID',
  'LAUNCH_OPTION_INVALID',
  'LAUNCH_ARG_UNSAFE',
  'LAUNCH_MOD_FOLDER_MISSING',
  'LAUNCH_FILE_PATCHING_ENABLED',
  'LAUNCH_SCRIPT_DEBUG_ENABLED',
] as const;
export const launchIssueCodeSchema = z.enum(LAUNCH_ISSUE_CODE_VALUES);
export type LaunchIssueCode = z.infer<typeof launchIssueCodeSchema>;

export const launchIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  code: launchIssueCodeSchema,
  message: z.string().min(1),
  field: z.string().optional(),
});
export type LaunchIssueDto = z.infer<typeof launchIssueSchema>;

export const launchArgSegmentSchema = z.object({
  arg: z.string().min(1),
  source: launchArgSourceSchema,
});
export type LaunchArgSegmentDto = z.infer<typeof launchArgSegmentSchema>;

/**
 * Process execution contract consumed by the supervisor (DSM-00113):
 * `spawn(executable, args, { cwd, shell: false })`, refused when `ready` is false.
 * `commandLine` is for display/copy only and must never be executed.
 */
export const launchCommandSchema = z.object({
  ready: z.boolean(),
  executable: z.string(),
  cwd: z.string(),
  args: z.array(z.string()),
  commandLine: z.string(),
  segments: z.array(launchArgSegmentSchema),
  issues: z.array(launchIssueSchema),
});
export type LaunchCommandDto = z.infer<typeof launchCommandSchema>;

export const launchModContextSchema = z.object({
  modFolders: z.array(z.string()),
  serverModFolders: z.array(z.string()),
  missingFolderCount: z.number().int().nonnegative(),
});
export type LaunchModContextDto = z.infer<typeof launchModContextSchema>;

/** A serverDZ.cfg edit lock that blocks starting the server (DSM-00124 / DSM-00169). */
export const launchEditLockSchema = z.object({
  holderName: z.string().min(1),
  acquiredAt: z.string().datetime(),
});
export type LaunchEditLockDto = z.infer<typeof launchEditLockSchema>;

export const launchCommandPreviewSchema = z.object({
  serverId: z.string().uuid(),
  platform: launchPlatformSchema,
  mods: launchModContextSchema,
  command: launchCommandSchema,
  /** Active serverDZ.cfg edit lock: while set, a start is refused (409). */
  editLock: launchEditLockSchema.nullable(),
});
export type LaunchCommandPreviewDto = z.infer<typeof launchCommandPreviewSchema>;
