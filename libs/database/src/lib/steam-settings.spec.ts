import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { deriveVaultKey, encryptVaultSecret } from './crypto';
import { initDatabase } from './db';
import { runMigrations } from './migrations';
import { steamSettings } from './schema';

describe('Steam Settings Persistence & Migration 0004 (libs/database)', () => {
  it('initializes steam_settings table with default singleton row during database boot', () => {
    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      const records = instance.db.select().from(steamSettings).all();
      expect(records).toHaveLength(1);

      const defaultRow = records[0];
      expect(defaultRow.id).toBe('default');
      expect(defaultRow.authMode).toBe('anonymous');
      expect(defaultRow.gameServerAppId).toBe(223350);
      expect(defaultRow.workshopAppId).toBe(221100);
      expect(defaultRow.branch).toBe('public');
      expect(defaultRow.sessionStatus).toBe('UNAUTHENTICATED');
      expect(defaultRow.steamPasswordEncrypted).toBeNull();
      expect(defaultRow.branchPasswordEncrypted).toBeNull();
      expect(defaultRow.steamCmdPath).toBeDefined();
      expect(defaultRow.steamWorkshopPath).toBeDefined();
      expect(defaultRow.steamMetaPath).toBeDefined();
    } finally {
      instance.close();
    }
  });

  it('runs migration 0004_steam_settings on a raw sqlite database and creates correct columns', () => {
    const rawDb = new Database(':memory:');
    try {
      runMigrations(rawDb);

      const tableInfo = rawDb.pragma("table_info('steam_settings')") as {
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
      }[];

      const columnNames = tableInfo.map(c => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('steam_cmd_path');
      expect(columnNames).toContain('steam_workshop_path');
      expect(columnNames).toContain('steam_meta_path');
      expect(columnNames).toContain('auth_mode');
      expect(columnNames).toContain('steam_username');
      expect(columnNames).toContain('steam_password_encrypted');
      expect(columnNames).toContain('game_server_app_id');
      expect(columnNames).toContain('workshop_app_id');
      expect(columnNames).toContain('branch');
      expect(columnNames).toContain('branch_password_encrypted');
      expect(columnNames).toContain('session_status');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');

      const seeded = rawDb.prepare('SELECT * FROM steam_settings WHERE id = ?').get('default');
      expect(seeded).toBeDefined();
    } finally {
      rawDb.close();
    }
  });

  it('is idempotent: running migrations multiple times does not duplicate or overwrite the singleton row', () => {
    const rawDb = new Database(':memory:');
    try {
      runMigrations(rawDb);

      // Modify the default row
      rawDb
        .prepare(
          "UPDATE steam_settings SET branch = 'experimental', steam_username = 'custom_operator' WHERE id = 'default'",
        )
        .run();

      // Run migrations again
      runMigrations(rawDb);

      const row = rawDb
        .prepare('SELECT branch, steam_username FROM steam_settings WHERE id = ?')
        .get('default') as { branch: string; steam_username: string };

      expect(row.branch).toBe('experimental');
      expect(row.steam_username).toBe('custom_operator');

      const totalRows = rawDb.prepare('SELECT COUNT(*) as count FROM steam_settings').get() as {
        count: number;
      };
      expect(totalRows.count).toBe(1);
    } finally {
      rawDb.close();
    }
  });

  it('persists encrypted credentials and updates session status (REQ-03, REQ-04)', () => {
    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      const vaultKey = deriveVaultKey('test-vault-secret');
      const encryptedPassword = encryptVaultSecret('OperatorSteamPassword2026!', vaultKey);
      const encryptedBranchPass = encryptVaultSecret('PrivateBranchPass!', vaultKey);

      const now = new Date();
      instance.db
        .update(steamSettings)
        .set({
          authMode: 'account',
          steamUsername: 'dayz_dedicated_admin',
          steamPasswordEncrypted: encryptedPassword,
          branch: 'private_testing',
          branchPasswordEncrypted: encryptedBranchPass,
          sessionStatus: 'AUTHENTICATED',
          updatedAt: now,
        })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const updated = instance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get();

      expect(updated).toBeDefined();
      expect(updated!.authMode).toBe('account');
      expect(updated!.steamUsername).toBe('dayz_dedicated_admin');
      expect(updated!.steamPasswordEncrypted).toBe(encryptedPassword);
      expect(updated!.branchPasswordEncrypted).toBe(encryptedBranchPass);
      expect(updated!.sessionStatus).toBe('AUTHENTICATED');
    } finally {
      instance.close();
    }
  });
});
