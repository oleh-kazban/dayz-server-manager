import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email'),
  role: text('role', { enum: ['admin', 'moderator', 'viewer'] })
    .notNull()
    .default('viewer'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: text('status', {
    enum: ['stopped', 'starting', 'running', 'stopping', 'failed'],
  })
    .notNull()
    .default('stopped'),
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
