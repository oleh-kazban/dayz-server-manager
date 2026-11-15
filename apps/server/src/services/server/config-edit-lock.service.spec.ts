import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFIG_FILE_KIND } from '@aegis/api-contracts';
import {
  configEditLocks,
  type DatabaseInstance,
  initDatabase,
  servers,
  users,
} from '@aegis/database';

import { ConfigStorageError } from './config-atomic-writer';
import {
  CONFIG_EDIT_LOCK_TTL_MS,
  ConfigEditLockService,
  resolveUserDisplayName,
} from './config-edit-lock.service';

const KIND = CONFIG_FILE_KIND.SERVER_DZ;
const SERVER_ID = '22222222-2222-4222-a222-222222222222';
const ALICE = { id: 'user-alice', username: 'alice', displayName: 'Alice A.' };
const BOB = { id: 'user-bob', username: 'bob', displayName: '   ' };
const TAB_1 = '00000000-0000-4000-a000-000000000001';
const TAB_2 = '00000000-0000-4000-a000-000000000002';
const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);

function expectStorageError(fn: () => unknown, errorCode: string): ConfigStorageError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigStorageError);
    expect((err as ConfigStorageError).errorCode).toBe(errorCode);
    return err as ConfigStorageError;
  }
  throw new Error(`expected ${errorCode} to be thrown`);
}

describe('ConfigEditLockService', () => {
  let dbi: DatabaseInstance;
  let now: number;
  let locks: ConfigEditLockService;

  const lockRows = () => dbi.db.select().from(configEditLocks).all();
  const setStatus = (status: 'stopped' | 'running' | 'starting' | 'stopping' | 'failed') =>
    dbi.sqlite.prepare('UPDATE servers SET status = ? WHERE id = ?').run(status, SERVER_ID);

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    now = T0;
    locks = new ConfigEditLockService(dbi.db, dbi.sqlite, () => now);
    for (const user of [ALICE, BOB]) {
      dbi.db
        .insert(users)
        .values({ ...user, passwordHash: 'x', role: 'admin', createdAt: new Date(T0) })
        .run();
    }
    dbi.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Lock Target',
        status: 'stopped',
        installPath: 'C:\\DayZ',
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        createdAt: new Date(T0),
        updatedAt: new Date(T0),
      })
      .run();
  });

  afterEach(() => {
    dbi.close();
  });

  it('resolves display names, falling back to the username for blank or missing names', () => {
    expect(resolveUserDisplayName('Alice A.', 'alice')).toBe('Alice A.');
    expect(resolveUserDisplayName('  ', 'bob')).toBe('bob');
    expect(resolveUserDisplayName(null, 'carol')).toBe('carol');
  });

  it('acquires a lock that expires after the TTL and reports holder details', () => {
    const lock = locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });

    expect(lock).toEqual({
      serverId: SERVER_ID,
      fileKind: KIND,
      sessionToken: TAB_1,
      userId: ALICE.id,
      holderName: 'Alice A.',
      acquiredAt: new Date(T0),
      expiresAt: new Date(T0 + CONFIG_EDIT_LOCK_TTL_MS),
    });
    expect(CONFIG_EDIT_LOCK_TTL_MS).toBe(120_000);
    expect(lockRows()).toHaveLength(1);
  });

  it('renews for the same session, keeping acquiredAt and extending expiresAt', () => {
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    now = T0 + 60_000;
    const renewed = locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });

    expect(renewed.acquiredAt).toEqual(new Date(T0));
    expect(renewed.expiresAt).toEqual(new Date(T0 + 60_000 + CONFIG_EDIT_LOCK_TTL_MS));
    expect(lockRows()).toHaveLength(1);
  });

  it('refuses another tab of the same admin and another admin with holder name and time', () => {
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    const before = lockRows();

    for (const actor of [
      { userId: ALICE.id, sessionToken: TAB_2 },
      { userId: BOB.id, sessionToken: TAB_2 },
      { userId: BOB.id, sessionToken: TAB_1 },
    ]) {
      const err = expectStorageError(
        () => locks.acquire(SERVER_ID, KIND, actor),
        'CONFIG_EDIT_LOCKED',
      );
      expect(err.statusCode).toBe(409);
      expect(err.params).toEqual({
        holderName: 'Alice A.',
        acquiredAt: new Date(T0).toISOString(),
      });
    }
    expect(lockRows()).toEqual(before);
  });

  it('refuses while the server is starting, running, or stopping and creates no lock', () => {
    for (const status of ['starting', 'running', 'stopping'] as const) {
      setStatus(status);
      const err = expectStorageError(
        () => locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
        'SERVER_RUNNING_CONFIG_LOCKED',
      );
      expect(err.params).toEqual({ id: SERVER_ID, name: 'Lock Target', status });
    }
    setStatus('failed');
    expect(locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }).userId).toBe(
      ALICE.id,
    );
  });

  it('refuses unknown servers with SERVER_NOT_FOUND', () => {
    expectStorageError(
      () =>
        locks.acquire('99999999-9999-4999-a999-999999999999', KIND, {
          userId: ALICE.id,
          sessionToken: TAB_1,
        }),
      'SERVER_NOT_FOUND',
    );
    expect(lockRows()).toHaveLength(0);
  });

  it('lets a new session in once the previous lock has expired, without logging a takeover', () => {
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    now = T0 + CONFIG_EDIT_LOCK_TTL_MS;
    expect(locks.getActive(SERVER_ID, KIND)).toBeNull();

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const lock = locks.acquire(
      SERVER_ID,
      KIND,
      { userId: BOB.id, sessionToken: TAB_2 },
      { logger },
    );
    expect(lock.holderName).toBe('bob');
    expect(lock.acquiredAt).toEqual(new Date(now));
    expect(logger.info).not.toHaveBeenCalled();
    expect(lockRows()).toHaveLength(1);
  });

  it('takes over an active lock, logs both holders, and the old session loses heartbeat and save rights', () => {
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    now = T0 + 5_000;
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const taken = locks.acquire(
      SERVER_ID,
      KIND,
      { userId: BOB.id, sessionToken: TAB_2 },
      { takeover: true, logger },
    );

    expect(taken).toMatchObject({ userId: BOB.id, sessionToken: TAB_2, acquiredAt: new Date(now) });
    expect(logger.info).toHaveBeenCalledWith(
      {
        serverId: SERVER_ID,
        fileKind: KIND,
        previousHolder: { userId: ALICE.id, name: 'Alice A.' },
        newHolder: { userId: BOB.id, name: 'bob' },
      },
      'Configuration edit lock taken over',
    );
    expectStorageError(
      () => locks.heartbeat(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
    expectStorageError(
      () => locks.assertHeld(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
    expect(locks.getActive(SERVER_ID, KIND)?.sessionToken).toBe(TAB_2);

    // Takeover without a logger is still permitted.
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }, { takeover: true });
    expect(locks.getActive(SERVER_ID, KIND)?.userId).toBe(ALICE.id);
  });

  it('heartbeat extends the holder lock and refuses missing, expired, or foreign locks', () => {
    expectStorageError(
      () => locks.heartbeat(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );

    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    now = T0 + 30_000;
    const beat = locks.heartbeat(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    expect(beat.expiresAt).toEqual(new Date(T0 + 30_000 + CONFIG_EDIT_LOCK_TTL_MS));
    expect(beat.acquiredAt).toEqual(new Date(T0));

    expectStorageError(
      () => locks.heartbeat(SERVER_ID, KIND, { userId: BOB.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
    expect(lockRows()[0].expiresAt).toEqual(beat.expiresAt);

    now = beat.expiresAt.getTime();
    expectStorageError(
      () => locks.heartbeat(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
    expect(lockRows()[0].expiresAt).toEqual(beat.expiresAt);
  });

  it('release deletes only the caller session lock', () => {
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });

    expect(locks.release(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_2 })).toBe(false);
    expect(locks.release(SERVER_ID, KIND, { userId: BOB.id, sessionToken: TAB_1 })).toBe(false);
    expect(lockRows()).toHaveLength(1);

    expect(locks.release(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 })).toBe(true);
    expect(lockRows()).toHaveLength(0);
    expect(locks.release(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 })).toBe(false);
  });

  it('assertHeld passes only for the exact session and user', () => {
    expectStorageError(
      () => locks.assertHeld(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    expect(() =>
      locks.assertHeld(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
    ).not.toThrow();
    expectStorageError(
      () => locks.assertHeld(SERVER_ID, KIND, { userId: BOB.id, sessionToken: TAB_1 }),
      'CONFIG_LOCK_NOT_HELD',
    );
  });

  it('assertNoActiveEditLock throws SERVER_CONFIG_EDIT_IN_PROGRESS only for non-expired locks', () => {
    expect(() => locks.assertNoActiveEditLock(SERVER_ID)).not.toThrow();

    locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    const err = expectStorageError(
      () => locks.assertNoActiveEditLock(SERVER_ID),
      'SERVER_CONFIG_EDIT_IN_PROGRESS',
    );
    expect(err.statusCode).toBe(409);
    expect(err.params).toEqual({ holderName: 'Alice A.', acquiredAt: new Date(T0).toISOString() });

    now = T0 + CONFIG_EDIT_LOCK_TTL_MS;
    expect(() => locks.assertNoActiveEditLock(SERVER_ID)).not.toThrow();
  });

  it('toResponse reports heldByYou per session token', () => {
    const lock = locks.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    const base = {
      holderUserId: ALICE.id,
      holderName: 'Alice A.',
      acquiredAt: new Date(T0).toISOString(),
      expiresAt: new Date(T0 + CONFIG_EDIT_LOCK_TTL_MS).toISOString(),
    };
    expect(locks.toResponse(lock, { userId: ALICE.id, sessionToken: TAB_1 })).toEqual({
      ...base,
      heldByYou: true,
    });
    expect(locks.toResponse(lock, { userId: ALICE.id, sessionToken: TAB_2 })).toEqual({
      ...base,
      heldByYou: false,
    });
    expect(locks.toResponse(lock, { userId: ALICE.id })).toEqual({ ...base, heldByYou: false });
  });

  it('rolls back and reports CONFIG_WRITE_FAILED when the persisted lock cannot be read back', () => {
    // The clock jumps past the TTL between the write and the read-back inside the transaction.
    const ticks = [T0, T0, T0 + CONFIG_EDIT_LOCK_TTL_MS + 1];
    const jumpy = new ConfigEditLockService(dbi.db, dbi.sqlite, () => ticks.shift() ?? T0);

    const err = expectStorageError(
      () => jumpy.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 }),
      'CONFIG_WRITE_FAILED',
    );
    expect(err.statusCode).toBe(500);
    expect(lockRows()).toHaveLength(0);
  });

  it('uses Date.now by default', () => {
    const realClock = new ConfigEditLockService(dbi.db, dbi.sqlite);
    const before = Date.now();
    const lock = realClock.acquire(SERVER_ID, KIND, { userId: ALICE.id, sessionToken: TAB_1 });
    expect(lock.acquiredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(lock.expiresAt.getTime() - lock.acquiredAt.getTime()).toBe(CONFIG_EDIT_LOCK_TTL_MS);
  });
});
