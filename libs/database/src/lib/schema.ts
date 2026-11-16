import { desc } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import {
  CONFIG_FILE_KIND_VALUES,
  CONFIG_REVISION_SOURCE_VALUES,
  EMPTY_LAUNCH_OPTIONS,
  type LaunchOptionsDto,
  MOD_LOAD_TARGET,
  MOD_LOAD_TARGET_VALUES,
  MOD_SOURCE_TYPE,
  MOD_SOURCE_TYPE_VALUES,
  SERVER_EXIT_REASON_VALUES,
  SERVER_STATUS,
  SERVER_STATUS_VALUES,
} from '@aegis/api-contracts';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  email: text('email'),
  role: text('role', { enum: ['admin'] })
    .notNull()
    .default('admin'),
  timezone: text('timezone').notNull().default('UTC'),
  timeFormat: text('time_format', { enum: ['12h', '24h'] })
    .notNull()
    .default('24h'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: text('status', { enum: SERVER_STATUS_VALUES }).notNull().default(SERVER_STATUS.STOPPED),
  installPath: text('install_path').notNull(),
  profilePath: text('profile_path').notNull(),
  missionPath: text('mission_path').notNull(),
  gamePort: integer('game_port').notNull().default(2302),
  queryPort: integer('query_port').notNull().default(27016),
  rconPort: integer('rcon_port').notNull().default(2310),
  rconIp: text('rcon_ip').notNull().default('127.0.0.1'),
  maxPlayers: integer('max_players').notNull().default(60),
  rconPassword: text('rcon_password'),
  rconPasswordEncrypted: text('rcon_password_encrypted'),
  launchOptions: text('launch_options', { mode: 'json' })
    .$type<LaunchOptionsDto>()
    .notNull()
    .default(EMPTY_LAUNCH_OPTIONS),
  // Tracked DayZ process (DSM-00162): identity used to re-adopt it after DSM restarts.
  processPid: integer('process_pid'),
  processStartToken: text('process_start_token'),
  processStartedAt: integer('process_started_at', { mode: 'timestamp_ms' }),
  lastExitReason: text('last_exit_reason', { enum: SERVER_EXIT_REASON_VALUES }),
  lastExitCode: integer('last_exit_code'),
  lastExitSignal: text('last_exit_signal'),
  lastExitAt: integer('last_exit_at', { mode: 'timestamp_ms' }),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Server = typeof servers.$inferSelect;
export type NewServer = typeof servers.$inferInsert;

export const steamSettings = sqliteTable('steam_settings', {
  id: text('id').primaryKey(),
  steamCmdPath: text('steam_cmd_path').notNull(),
  steamWorkshopPath: text('steam_workshop_path').notNull(),
  steamMetaPath: text('steam_meta_path').notNull(),
  authMode: text('auth_mode', { enum: ['anonymous', 'account'] })
    .notNull()
    .default('anonymous'),
  steamUsername: text('steam_username'),
  steamPasswordEncrypted: text('steam_password_encrypted'),
  gameServerAppId: integer('game_server_app_id').notNull().default(223350),
  workshopAppId: integer('workshop_app_id').notNull().default(221100),
  branch: text('branch').notNull().default('public'),
  branchPasswordEncrypted: text('branch_password_encrypted'),
  steamWebApiKeyEncrypted: text('steam_web_api_key_encrypted'),
  sessionStatus: text('session_status', {
    enum: ['UNAUTHENTICATED', 'AUTHENTICATED', 'CHALLENGE_REQUIRED', 'EXPIRED'],
  })
    .notNull()
    .default('UNAUTHENTICATED'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type SteamSettings = typeof steamSettings.$inferSelect;
export type NewSteamSettings = typeof steamSettings.$inferInsert;

export const serverMods = sqliteTable('server_mods', {
  id: text('id').primaryKey(),
  serverId: text('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  sourceType: text('source_type', { enum: MOD_SOURCE_TYPE_VALUES })
    .notNull()
    .default(MOD_SOURCE_TYPE.WORKSHOP),
  loadTarget: text('load_target', { enum: MOD_LOAD_TARGET_VALUES })
    .notNull()
    .default(MOD_LOAD_TARGET.CLIENT_SERVER),
  workshopId: text('workshop_id'),
  folderName: text('folder_name').notNull(),
  name: text('name').notNull(),
  sizeBytes: integer('size_bytes'),
  remoteUpdatedAt: integer('remote_updated_at', { mode: 'timestamp' }),
  syncedWorkshopUpdatedAt: integer('synced_workshop_updated_at', { mode: 'timestamp' }),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  loadOrder: integer('load_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type ServerMod = typeof serverMods.$inferSelect;
export type NewServerMod = typeof serverMods.$inferInsert;

export const configEditLocks = sqliteTable(
  'config_edit_locks',
  {
    serverId: text('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    fileKind: text('file_kind', { enum: CONFIG_FILE_KIND_VALUES }).notNull(),
    sessionToken: text('session_token').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    acquiredAt: integer('acquired_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  table => [primaryKey({ columns: [table.serverId, table.fileKind] })],
);

export type ConfigEditLock = typeof configEditLocks.$inferSelect;
export type NewConfigEditLock = typeof configEditLocks.$inferInsert;

export const serverConfigRevisions = sqliteTable(
  'server_config_revisions',
  {
    id: text('id').primaryKey(),
    serverId: text('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    fileKind: text('file_kind', { enum: CONFIG_FILE_KIND_VALUES }).notNull(),
    content: text('content').notNull(),
    contentHash: text('content_hash').notNull(),
    source: text('source', { enum: CONFIG_REVISION_SOURCE_VALUES }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  table => [
    index('idx_server_config_revisions_server_kind_created').on(
      table.serverId,
      table.fileKind,
      desc(table.createdAt),
    ),
  ],
);

export type ServerConfigRevision = typeof serverConfigRevisions.$inferSelect;
export type NewServerConfigRevision = typeof serverConfigRevisions.$inferInsert;
