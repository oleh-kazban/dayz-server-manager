import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { SERVER_STATUS, SERVER_STATUS_VALUES } from '@aegis/api-contracts';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  email: text('email'),
  role: text('role', { enum: ['admin', 'moderator', 'viewer'] })
    .notNull()
    .default('viewer'),
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
  rconPassword: text('rcon_password'),
  launchParameters: text('launch_parameters'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Server = typeof servers.$inferSelect;
export type NewServer = typeof servers.$inferInsert;
