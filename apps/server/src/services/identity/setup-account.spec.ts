import { eq } from 'drizzle-orm';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase, users } from '@aegis/database';

import { ensureSetupAccount } from './setup-account';

vi.mock('./setup-file', async importOriginal => ({
  ...(await importOriginal<typeof import('./setup-file')>()),
  writeSetupFile: vi.fn(() => {
    throw new Error('cannot write the setup file');
  }),
}));

describe('ensureSetupAccount', () => {
  let dbi: DatabaseInstance;
  let dataDir: string;

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    dataDir = mkdtempSync(path.join(tmpdir(), 'aegis-setup-account-'));
  });

  afterEach(() => {
    dbi.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('throws and rolls the setup user back when the setup file cannot be written', () => {
    expect(() => ensureSetupAccount({ db: dbi.db, sqlite: dbi.sqlite, dataDir })).toThrow(
      'cannot write the setup file',
    );

    expect(dbi.db.select().from(users).where(eq(users.role, 'setup')).all()).toEqual([]);
  });
});
