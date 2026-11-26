import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SETUP_FILE_NAME, writeSetupFile } from './setup-file';

// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test fixture value
const PAIR = { username: 'setup-1a2b3c4d5e6f', password: 'Zk3-pQ9_vL2xW8nB5mT7rY1uC4hJ6dA0' };

// Absolute System32 paths: a PATH `whoami` can be another tool (GNU whoami under Git Bash)
const SYSTEM32 = path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32');

function capture(command: string, args: string[]): string {
  const result = spawnSync(path.join(SYSTEM32, `${command}.exe`), args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.stdout;
}

describe('setup credentials file ACL on Windows', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'aegis-setup-acl-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it.skipIf(process.platform !== 'win32')(
    'grants access only to the current user and Administrators, with no inherited entries',
    () => {
      const file = writeSetupFile(dir, PAIR, new Date('2026-11-25T23:36:00.000Z'));
      expect(path.basename(file)).toBe(SETUP_FILE_NAME);

      const saved = path.join(dir, 'acl.sddl');
      spawnSync(path.join(SYSTEM32, 'icacls.exe'), [file, '/save', saved], { windowsHide: true });
      // icacls writes the SDDL as UTF-16LE; SIDs and aliases are locale-independent
      const sddl = readFileSync(saved).toString('utf16le');
      const aces = [...sddl.matchAll(/\(([^()]*)\)/g)].map(match => match[1].split(';'));
      const trustees = aces.map(ace => ace[5]);
      const [, sid] = capture('whoami', ['/user', '/fo', 'csv', '/nh'])
        .trim()
        .split(',')
        .map(field => field.replaceAll('"', ''));

      expect(aces.length).toBeGreaterThan(0);
      expect(aces.some(ace => ace[1].includes('ID'))).toBe(false);
      expect(trustees).toContain(sid);
      expect(trustees.some(t => t === 'BA' || t === 'S-1-5-32-544')).toBe(true);
      for (const banned of ['WD', 'S-1-1-0', 'BU', 'S-1-5-32-545', 'AU', 'S-1-5-11']) {
        expect(trustees).not.toContain(banned);
      }
      expect(trustees).toHaveLength(2);
    },
  );
});
