import { and, eq, gt } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import {
  type ConfigFileKind,
  type ConfigLockResponseDto,
  configLockResponseSchema,
  isServerActiveStatus,
} from '@aegis/api-contracts';
import {
  configEditLocks,
  type DatabaseInstance,
  type DsmDatabase,
  servers,
  users,
} from '@aegis/database';

import { ConfigStorageError } from './config-atomic-writer';

export const CONFIG_EDIT_LOCK_TTL_MS = 120_000;

export type Clock = () => number;

export type ConfigServiceLogger = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;

export interface ConfigLockActor {
  userId: string;
  sessionToken: string;
}

export interface ConfigLockViewer {
  userId: string;
  sessionToken?: string;
}

export interface ActiveConfigLock {
  serverId: string;
  fileKind: ConfigFileKind;
  sessionToken: string;
  userId: string;
  holderName: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface AcquireConfigLockOptions {
  takeover?: boolean;
  logger?: ConfigServiceLogger;
}

export function resolveUserDisplayName(displayName: string | null, username: string): string {
  return displayName && displayName.trim().length > 0 ? displayName : username;
}

function isHeldBy(lock: ActiveConfigLock, actor: ConfigLockActor): boolean {
  return lock.sessionToken === actor.sessionToken && lock.userId === actor.userId;
}

function lockConflictError(lock: ActiveConfigLock): ConfigStorageError {
  return new ConfigStorageError(
    'CONFIG_EDIT_LOCKED',
    `Configuration is being edited by ${lock.holderName} since ${lock.acquiredAt.toISOString()}.`,
    { holderName: lock.holderName, acquiredAt: lock.acquiredAt.toISOString() },
  );
}

function lockNotHeldError(): ConfigStorageError {
  return new ConfigStorageError(
    'CONFIG_LOCK_NOT_HELD',
    'This editor session does not hold the configuration edit lock.',
  );
}

export class ConfigEditLockService {
  constructor(
    private readonly db: DsmDatabase,
    private readonly sqlite: DatabaseInstance['sqlite'],
    private readonly clock: Clock = Date.now,
  ) {}

  private selectLocks(serverId: string, fileKind?: ConfigFileKind): ActiveConfigLock[] {
    const conditions = [
      eq(configEditLocks.serverId, serverId),
      gt(configEditLocks.expiresAt, new Date(this.clock())),
    ];
    if (fileKind) {
      conditions.push(eq(configEditLocks.fileKind, fileKind));
    }
    return this.db
      .select({
        lock: configEditLocks,
        displayName: users.displayName,
        username: users.username,
      })
      .from(configEditLocks)
      .innerJoin(users, eq(users.id, configEditLocks.userId))
      .where(and(...conditions))
      .all()
      .map(row => ({
        serverId: row.lock.serverId,
        fileKind: row.lock.fileKind,
        sessionToken: row.lock.sessionToken,
        userId: row.lock.userId,
        holderName: resolveUserDisplayName(row.displayName, row.username),
        acquiredAt: row.lock.acquiredAt,
        expiresAt: row.lock.expiresAt,
      }));
  }

  getActive(serverId: string, fileKind: ConfigFileKind): ActiveConfigLock | null {
    return this.selectLocks(serverId, fileKind)[0] ?? null;
  }

  toResponse(lock: ActiveConfigLock, viewer: ConfigLockViewer): ConfigLockResponseDto {
    return configLockResponseSchema.parse({
      holderUserId: lock.userId,
      holderName: lock.holderName,
      acquiredAt: lock.acquiredAt.toISOString(),
      expiresAt: lock.expiresAt.toISOString(),
      heldByYou:
        viewer.sessionToken !== undefined &&
        isHeldBy(lock, { userId: viewer.userId, sessionToken: viewer.sessionToken }),
    });
  }

  acquire(
    serverId: string,
    fileKind: ConfigFileKind,
    actor: ConfigLockActor,
    options: AcquireConfigLockOptions = {},
  ): ActiveConfigLock {
    const run = this.sqlite.transaction(() => {
      const server = this.db
        .select({ id: servers.id, name: servers.name, status: servers.status })
        .from(servers)
        .where(eq(servers.id, serverId))
        .get();
      if (!server) {
        throw new ConfigStorageError('SERVER_NOT_FOUND', `Server with ID '${serverId}' not found`);
      }
      if (isServerActiveStatus(server.status)) {
        throw new ConfigStorageError(
          'SERVER_RUNNING_CONFIG_LOCKED',
          `Cannot edit configuration while "${server.name}" is ${server.status}.`,
          { id: server.id, name: server.name, status: server.status },
        );
      }

      const current = this.getActive(serverId, fileKind);
      const renewing = current !== null && isHeldBy(current, actor);
      if (current && !renewing && !options.takeover) {
        throw lockConflictError(current);
      }

      const now = this.clock();
      const acquiredAt = renewing ? current.acquiredAt : new Date(now);
      const expiresAt = new Date(now + CONFIG_EDIT_LOCK_TTL_MS);
      this.db
        .insert(configEditLocks)
        .values({
          serverId,
          fileKind,
          sessionToken: actor.sessionToken,
          userId: actor.userId,
          acquiredAt,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [configEditLocks.serverId, configEditLocks.fileKind],
          set: { sessionToken: actor.sessionToken, userId: actor.userId, acquiredAt, expiresAt },
        })
        .run();

      const acquired = this.getActive(serverId, fileKind);
      if (!acquired) {
        throw new ConfigStorageError('CONFIG_WRITE_FAILED', 'Failed to persist edit lock.');
      }
      return { acquired, previous: current && !renewing ? current : null };
    });

    const { acquired, previous } = run.immediate();
    if (previous) {
      options.logger?.info(
        {
          serverId,
          fileKind,
          previousHolder: { userId: previous.userId, name: previous.holderName },
          newHolder: { userId: acquired.userId, name: acquired.holderName },
        },
        'Configuration edit lock taken over',
      );
    }
    return acquired;
  }

  heartbeat(serverId: string, fileKind: ConfigFileKind, actor: ConfigLockActor): ActiveConfigLock {
    const now = this.clock();
    const result = this.db
      .update(configEditLocks)
      .set({ expiresAt: new Date(now + CONFIG_EDIT_LOCK_TTL_MS) })
      .where(
        and(
          eq(configEditLocks.serverId, serverId),
          eq(configEditLocks.fileKind, fileKind),
          eq(configEditLocks.sessionToken, actor.sessionToken),
          eq(configEditLocks.userId, actor.userId),
          gt(configEditLocks.expiresAt, new Date(now)),
        ),
      )
      .run();
    const lock = result.changes > 0 ? this.getActive(serverId, fileKind) : null;
    if (!lock) {
      throw lockNotHeldError();
    }
    return lock;
  }

  release(serverId: string, fileKind: ConfigFileKind, actor: ConfigLockActor): boolean {
    const result = this.db
      .delete(configEditLocks)
      .where(
        and(
          eq(configEditLocks.serverId, serverId),
          eq(configEditLocks.fileKind, fileKind),
          eq(configEditLocks.sessionToken, actor.sessionToken),
          eq(configEditLocks.userId, actor.userId),
        ),
      )
      .run();
    return result.changes > 0;
  }

  assertHeld(serverId: string, fileKind: ConfigFileKind, actor: ConfigLockActor): void {
    const lock = this.getActive(serverId, fileKind);
    if (!lock || !isHeldBy(lock, actor)) {
      throw lockNotHeldError();
    }
  }

  assertNoActiveEditLock(serverId: string): void {
    const lock = this.selectLocks(serverId)[0];
    if (lock) {
      throw new ConfigStorageError(
        'SERVER_CONFIG_EDIT_IN_PROGRESS',
        `Server configuration is being edited by ${lock.holderName} since ${lock.acquiredAt.toISOString()}.`,
        { holderName: lock.holderName, acquiredAt: lock.acquiredAt.toISOString() },
      );
    }
  }
}
