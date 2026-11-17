import { z } from 'zod';

import { launchOptionsSchema } from './launch.contract';

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

/** Why the server process last ended (DSM-00162). Unexpected exits leave status `failed`. */
export const SERVER_EXIT_REASON = {
  START_FAILED: 'start_failed',
  CRASHED: 'crashed',
  EXITED_WHILE_OFFLINE: 'exited_while_offline',
  FORCE_STOPPED: 'force_stopped',
  /** Graceful stop: the process exited after RCON #shutdown. */
  STOPPED: 'stopped',
  /** Graceful stop: the process did not exit in time after #shutdown and was force-killed. */
  SHUTDOWN_TIMEOUT: 'shutdown_timeout',
} as const;

export const SERVER_EXIT_REASON_VALUES = [
  SERVER_EXIT_REASON.START_FAILED,
  SERVER_EXIT_REASON.CRASHED,
  SERVER_EXIT_REASON.EXITED_WHILE_OFFLINE,
  SERVER_EXIT_REASON.FORCE_STOPPED,
  SERVER_EXIT_REASON.STOPPED,
  SERVER_EXIT_REASON.SHUTDOWN_TIMEOUT,
] as const;

export const serverExitReasonSchema = z.enum(SERVER_EXIT_REASON_VALUES);
export type ServerExitReason = z.infer<typeof serverExitReasonSchema>;

/** The running DayZ process, when DSM tracks one. */
export const serverRuntimeSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.string().datetime(),
});
export type ServerRuntimeDto = z.infer<typeof serverRuntimeSchema>;

export const serverLastExitSchema = z.object({
  reason: serverExitReasonSchema,
  exitCode: z.number().int().nullable(),
  signal: z.string().nullable(),
  at: z.string().datetime(),
});
export type ServerLastExitDto = z.infer<typeof serverLastExitSchema>;

/** A graceful stop scheduled for later (DSM-00167); the server keeps running until `executeAt`. */
export const serverPendingStopSchema = z.object({
  executeAt: z.string().datetime(),
  requestedAt: z.string().datetime(),
});
export type ServerPendingStopDto = z.infer<typeof serverPendingStopSchema>;

/** Longest delay a stop request may ask for (DSM-00167). */
export const STOP_DELAY_MAX_SEC = 3600;
/** Longest custom in-game warning a stop request may carry (DSM-00167). */
export const STOP_MESSAGE_MAX_LENGTH = 120;
/** Delays the Stop dialog offers, in seconds; 0 stops now (DSM-00171). */
export const STOP_DELAY_PRESETS_SEC = [0, 60, 300, 600, 900, 1800] as const;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** "5 minutes", "45 seconds", "1 minute 30 seconds" for the in-game warning. */
export function formatStopDelay(delaySec: number): string {
  const minutes = Math.floor(delaySec / 60);
  const seconds = delaySec % 60;
  if (minutes === 0) {
    return plural(seconds, 'second');
  }
  return seconds === 0
    ? plural(minutes, 'minute')
    : `${plural(minutes, 'minute')} ${plural(seconds, 'second')}`;
}

/** Default in-game warning for a delayed stop (DSM-00167). */
export function defaultStopWarning(delaySec: number): string {
  return `Server is shutting down in ${formatStopDelay(delaySec)}. Please find a safe place and log out.`;
}

/** Default in-game warning for a delayed restart (DSM-00168). */
export function defaultRestartWarning(delaySec: number): string {
  return `Server is restarting in ${formatStopDelay(delaySec)}. Please find a safe place and log out.`;
}

/**
 * Body of `POST /servers/:id/stop` (DSM-00167). `delaySec` 0 stops now; otherwise players are
 * warned once via `#say -1` and the stop runs after the delay. The message goes into an RCON
 * command line, so control characters are rejected.
 */
export const stopServerRequestSchema = z
  .object({
    delaySec: z
      .number()
      .int('Delay must be a whole number of seconds')
      .min(0, 'Delay cannot be negative')
      .max(STOP_DELAY_MAX_SEC, `Delay can be at most ${STOP_DELAY_MAX_SEC} seconds`)
      .default(0),
    message: z
      .string()
      .trim()
      .min(1, 'Warning message cannot be empty')
      .max(
        STOP_MESSAGE_MAX_LENGTH,
        `Warning message can be at most ${STOP_MESSAGE_MAX_LENGTH} characters`,
      )
      .refine(
        val => !Array.from(val).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
        'Warning message cannot contain control characters',
      )
      .optional(),
  })
  .strict();
export type StopServerRequestDto = z.input<typeof stopServerRequestSchema>;

/** Body of `POST /servers/:id/restart` (DSM-00168): the stop part of the restart. */
export const restartServerRequestSchema = stopServerRequestSchema;

export const serverSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  description: z.string().nullable().optional(),
  status: serverStatusSchema,
  gamePort: z.number().int().min(1024).max(65535),
  queryPort: z.number().int().min(1024).max(65535),
  rconPort: z.number().int().min(1024).max(65535),
  isDefault: z.boolean(),
  /** Why the process last ended (DSM-00164: shown in the shell after an unexpected exit). */
  lastExit: serverLastExitSchema.nullable(),
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

const IPV4_REGEX =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const RCON_PASSWORD_ASCII_REGEX = /^[\x21\x23-\x26\x28-\x5b\x5d-\x7e]+$/;

function noControlBreakChars(val: string): boolean {
  return !/[\r\n\0]/.test(val);
}

export const serverNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(64)
  .refine(noControlBreakChars, 'Control characters (CR, LF, null bytes) are forbidden');

export const rconIpSchema = z
  .string()
  .regex(IPV4_REGEX, 'RCON IP must be a valid IPv4 address (e.g. 127.0.0.1)');

export const rconPasswordSchema = z
  .string()
  .min(6, 'RCON password must be between 6 and 32 characters')
  .max(32, 'RCON password must be between 6 and 32 characters')
  .regex(
    RCON_PASSWORD_ASCII_REGEX,
    'RCON password must use printable ASCII characters without whitespace, quotes, or backslashes',
  );

export const serverIdParamSchema = z.object({
  id: z.string().uuid('Invalid server ID format. Must be a valid UUID.'),
});
export type ServerIdParamDto = z.infer<typeof serverIdParamSchema>;

export const serverDetailSchema = serverSummarySchema.extend({
  installPath: safePathSchema,
  profilePath: safePathSchema,
  missionPath: safePathSchema,
  launchOptions: launchOptionsSchema,
  maxPlayers: z.number().int().min(1).max(200),
  rconIp: rconIpSchema,
  rconPassword: z.string().nullable(),
  runtime: serverRuntimeSchema.nullable(),
  /** Delayed graceful stop waiting to run (DSM-00167). */
  pendingStop: serverPendingStopSchema.nullable(),
  /** The server starts again once the current or pending stop completes (DSM-00168). */
  restartRequested: z.boolean(),
});
export type ServerDetailDto = z.infer<typeof serverDetailSchema>;

/** SSE `server.status.changed` payload, broadcast on every lifecycle transition. */
export const SERVER_STATUS_CHANGED_EVENT = 'server.status.changed';
export const serverStatusChangedEventSchema = z.object({
  serverId: z.string().uuid(),
  status: serverStatusSchema,
  lastExit: serverLastExitSchema.nullable(),
  /** Also broadcast when a delayed stop is scheduled or cancelled (DSM-00167). */
  pendingStop: serverPendingStopSchema.nullable(),
  restartRequested: z.boolean(),
});
export type ServerStatusChangedEventDto = z.infer<typeof serverStatusChangedEventSchema>;

/** SSE `server.stop.failed`: a delayed stop came due but could not run (DSM-00167). */
export const SERVER_STOP_FAILED_EVENT = 'server.stop.failed';
export const serverStopFailedEventSchema = z.object({
  serverId: z.string().uuid(),
  errorCode: z.string(),
  message: z.string(),
});
export type ServerStopFailedEventDto = z.infer<typeof serverStopFailedEventSchema>;

/** SSE `server.restart.failed`: a restart failed in its stop or its start phase (DSM-00168). */
export const SERVER_RESTART_FAILED_EVENT = 'server.restart.failed';
export const SERVER_RESTART_PHASE_VALUES = ['stop', 'start'] as const;
export const serverRestartFailedEventSchema = serverStopFailedEventSchema.extend({
  phase: z.enum(SERVER_RESTART_PHASE_VALUES),
});
export type ServerRestartFailedEventDto = z.infer<typeof serverRestartFailedEventSchema>;

export const createServerSchema = z
  .object({
    name: serverNameSchema,
    description: z.string().max(256).optional(),
    installPath: safePathSchema,
    profilePath: safePathSchema.optional(),
    missionPath: safePathSchema.optional(),
    gamePort: z.number().int().min(1024).max(65535).default(2302),
    queryPort: z.number().int().min(1024).max(65535).optional(),
    rconPort: z.number().int().min(1024).max(65535).default(2310),
    rconIp: rconIpSchema.default('127.0.0.1'),
    maxPlayers: z
      .number()
      .int()
      .min(1, 'Max players must be between 1 and 200')
      .max(200, 'Max players must be between 1 and 200')
      .optional(),
    rconPassword: rconPasswordSchema.optional(),
    launchOptions: launchOptionsSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    data => {
      if (data.gamePort === data.rconPort) {
        return false;
      }
      if (data.queryPort === undefined) {
        return true;
      }
      return data.queryPort !== data.gamePort && data.queryPort !== data.rconPort;
    },
    {
      message: 'gamePort, queryPort, and rconPort must all be distinct ports',
      path: ['gamePort'],
    },
  );
export type CreateServerDto = z.input<typeof createServerSchema>;

export const updateServerSchema = z
  .object({
    name: serverNameSchema.optional(),
    description: z.string().max(256).nullable().optional(),
    installPath: safePathSchema.optional(),
    missionPath: safePathSchema.optional(),
    gamePort: z.number().int().min(1024).max(65535).optional(),
    rconPort: z.number().int().min(1024).max(65535).optional(),
    rconIp: rconIpSchema.optional(),
    rconPassword: rconPasswordSchema.nullable().optional(),
    launchOptions: launchOptionsSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    data => {
      if (data.gamePort === undefined || data.rconPort === undefined) {
        return true;
      }
      return data.gamePort !== data.rconPort;
    },
    {
      message: 'Specified ports must not conflict with one another',
      path: ['gamePort'],
    },
  );
export type UpdateServerDto = z.infer<typeof updateServerSchema>;

export const SERVER_FS_PATH_TARGET = {
  INSTALL_PATH: 'installPath',
  PROFILE_PATH: 'profilePath',
  BATTLEYE_PATH: 'battleyePath',
  MISSION_PATH: 'missionPath',
} as const;

export const SERVER_FS_PATH_TARGET_VALUES = [
  SERVER_FS_PATH_TARGET.INSTALL_PATH,
  SERVER_FS_PATH_TARGET.PROFILE_PATH,
  SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
  SERVER_FS_PATH_TARGET.MISSION_PATH,
] as const;

export const serverFsPathTargetSchema = z.enum(SERVER_FS_PATH_TARGET_VALUES);
export type ServerFsPathTarget = z.infer<typeof serverFsPathTargetSchema>;

export const SERVER_FS_CHECK_STATUS = {
  VALID: 'valid',
  WARNING: 'warning',
  ERROR: 'error',
  SKIPPED: 'skipped',
} as const;

export const SERVER_FS_CHECK_STATUS_VALUES = [
  SERVER_FS_CHECK_STATUS.VALID,
  SERVER_FS_CHECK_STATUS.WARNING,
  SERVER_FS_CHECK_STATUS.ERROR,
  SERVER_FS_CHECK_STATUS.SKIPPED,
] as const;

export const serverFsCheckStatusSchema = z.enum(SERVER_FS_CHECK_STATUS_VALUES);
export type ServerFsCheckStatus = z.infer<typeof serverFsCheckStatusSchema>;

export const SERVER_FS_ISSUE_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export const SERVER_FS_ISSUE_SEVERITY_VALUES = [
  SERVER_FS_ISSUE_SEVERITY.ERROR,
  SERVER_FS_ISSUE_SEVERITY.WARNING,
] as const;

export const serverFsIssueSeveritySchema = z.enum(SERVER_FS_ISSUE_SEVERITY_VALUES);
export type ServerFsIssueSeverity = z.infer<typeof serverFsIssueSeveritySchema>;

export const SERVER_FS_ISSUE_CODE_VALUES = [
  'PATH_LEXICAL_INVALID',
  'PATH_PLATFORM_MISMATCH',
  'INSTALL_PATH_NOT_ABSOLUTE',
  'INSTALL_DIR_MISSING',
  'INSTALL_PATH_NOT_DIRECTORY',
  'EXECUTABLE_MISSING',
  'EXECUTABLE_NOT_FILE',
  'EXECUTABLE_NOT_EXECUTABLE',
  'PROFILE_PATH_NOT_RELATIVE',
  'PROFILE_SYMLINK_ESCAPE',
  'PROFILE_DIR_MISSING',
  'PROFILE_PATH_NOT_DIRECTORY',
  'PROFILE_DIR_NOT_WRITABLE',
  'BATTLEYE_DIR_MISSING',
  'BATTLEYE_PATH_NOT_DIRECTORY',
  'BATTLEYE_DIR_NOT_WRITABLE',
  'MPMISSIONS_DIR_MISSING',
  'MPMISSIONS_PATH_NOT_DIRECTORY',
  'MISSION_PATH_NOT_RELATIVE',
  'MISSION_DIR_MISSING',
  'MISSION_PATH_NOT_DIRECTORY',
  'MISSION_SYMLINK_ESCAPE',
  'MISSION_INIT_SCRIPT_MISSING',
  'MISSION_ECONOMY_DB_MISSING',
] as const;

export const serverFsIssueCodeSchema = z.enum(SERVER_FS_ISSUE_CODE_VALUES);
export type ServerFsIssueCode = z.infer<typeof serverFsIssueCodeSchema>;

export const validateServerPathsRequestSchema = z.object({
  installPath: safePathSchema.optional(),
  profilePath: safePathSchema.optional(),
  missionPath: safePathSchema.optional(),
});
export type ValidateServerPathsRequestDto = z.infer<typeof validateServerPathsRequestSchema>;

export const serverFsDiagnosticIssueSchema = z.object({
  target: serverFsPathTargetSchema,
  severity: serverFsIssueSeveritySchema,
  code: serverFsIssueCodeSchema,
  message: z.string().min(1),
  path: z.string().nullable().optional(),
});
export type ServerFsDiagnosticIssueDto = z.infer<typeof serverFsDiagnosticIssueSchema>;

export const serverFsPathStatusSchema = z.object({
  target: serverFsPathTargetSchema,
  configuredPath: z.string(),
  resolvedPath: z.string().nullable(),
  status: serverFsCheckStatusSchema,
  exists: z.boolean(),
  isDirectory: z.boolean().nullable().optional(),
  writable: z.boolean().nullable().optional(),
  executablePath: z.string().nullable().optional(),
  executablePresent: z.boolean().nullable().optional(),
  executableRunnable: z.boolean().nullable().optional(),
  hasInitScript: z.boolean().nullable().optional(),
  hasEconomyDb: z.boolean().nullable().optional(),
});
export type ServerFsPathStatusDto = z.infer<typeof serverFsPathStatusSchema>;

export const discoveredMissionSchema = z.object({
  name: z.string().min(1),
  relativePath: z.string().min(1),
  resolvedPath: z.string().min(1),
  hasInitScript: z.boolean(),
  hasEconomyDb: z.boolean(),
});
export type DiscoveredMissionDto = z.infer<typeof discoveredMissionSchema>;

export const validateServerPathsResponseSchema = z.object({
  serverId: z.string().uuid(),
  valid: z.boolean(),
  platform: z.string().min(1),
  checkedAt: z.string().datetime(),
  paths: z.object({
    installPath: serverFsPathStatusSchema,
    profilePath: serverFsPathStatusSchema,
    battleyePath: serverFsPathStatusSchema,
    missionPath: serverFsPathStatusSchema,
  }),
  discoveredMissions: z.array(discoveredMissionSchema),
  issues: z.array(serverFsDiagnosticIssueSchema),
});
export type ValidateServerPathsResponseDto = z.infer<typeof validateServerPathsResponseSchema>;
