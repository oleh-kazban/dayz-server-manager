import fs from 'node:fs';
import path from 'node:path';

import { verifyPassword } from './crypto';
import { initDatabase } from './db';
import { users } from './schema';

describe('Database Initialization & Seeding', () => {
  it('initializes in-memory database and auto-seeds default admin', () => {
    const instance = initDatabase({ dbPath: ':memory:' });

    try {
      const seededUsers = instance.db.select().from(users).all();
      expect(seededUsers).toHaveLength(1);

      const admin = seededUsers[0];
      expect(admin.username).toBe('admin');
      expect(admin.role).toBe('admin');
      expect(verifyPassword('admin', admin.passwordHash)).toBe(true);
    } finally {
      instance.close();
    }
  });

  it('initializes file-based database and creates directory if missing', () => {
    const tempDir = path.resolve(process.cwd(), 'tmp/test-db');
    const tempDbPath = path.join(tempDir, 'temp.sqlite');

    try {
      const instance = initDatabase({ dbPath: tempDbPath });
      try {
        const seededUsers = instance.db.select().from(users).all();
        expect(seededUsers).toHaveLength(1);
      } finally {
        instance.close();
      }
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
