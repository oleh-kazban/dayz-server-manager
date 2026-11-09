import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SteamPathService, steamPathService } from './steam-path.service';

describe('SteamPathService (apps/server/src/services/steam)', () => {
  let service: SteamPathService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new SteamPathService();
  });

  describe('validateLexicalPath (GUARD-01)', () => {
    it('accepts valid absolute paths', () => {
      const validWin = 'C:\\steamcmd\\steamcmd.exe';
      const validPosix = '/usr/games/steamcmd';
      expect(service.validateLexicalPath(validWin).valid).toBe(true);
      expect(service.validateLexicalPath(validPosix).valid).toBe(true);
    });

    it('rejects empty or non-string paths', () => {
      expect(service.validateLexicalPath('').valid).toBe(false);
      expect(service.validateLexicalPath('   ').valid).toBe(false);
      // @ts-expect-error testing invalid type
      expect(service.validateLexicalPath(null).valid).toBe(false);
    });

    it('rejects paths containing null bytes', () => {
      expect(service.validateLexicalPath('C:\\steamcmd\0\\malicious').valid).toBe(false);
    });

    it('rejects directory traversal sequences', () => {
      expect(service.validateLexicalPath('C:\\steamcmd\\..\\windows\\system32').valid).toBe(false);
      expect(service.validateLexicalPath('/var/dayz/../etc/shadow').valid).toBe(false);
    });

    it('rejects relative paths', () => {
      expect(service.validateLexicalPath('relative\\path\\steamcmd').valid).toBe(false);
      expect(service.validateLexicalPath('./relative').valid).toBe(false);
    });
  });

  describe('getVolumeCapacity (REQ-13)', () => {
    it('returns null if targetPath is empty or undefined', () => {
      expect(service.getVolumeCapacity('')).toBeNull();
      // @ts-expect-error testing falsy input
      expect(service.getVolumeCapacity(null)).toBeNull();
      // @ts-expect-error testing falsy input
      expect(service.getVolumeCapacity(undefined)).toBeNull();
    });

    it('returns totalBytes and freeBytes for an existing directory', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-capacity-test-'));
      try {
        vi.spyOn(fs, 'statfsSync').mockReturnValue({
          blocks: 100_000_000n,
          bavail: 25_000_000n,
          bsize: 4096n,
        } as unknown as fs.StatFs);

        const capacity = service.getVolumeCapacity(tempDir);
        expect(capacity).not.toBeNull();
        expect(capacity?.totalBytes).toBe(409_600_000_000); // 100M * 4096
        expect(capacity?.freeBytes).toBe(102_400_000_000); // 25M * 4096
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('resolves parent directory when path does not yet exist', () => {
      const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-parent-test-'));
      const nonExistentChild = path.join(tempParent, 'nested', 'deep', 'workshop');

      try {
        const statfsSpy = vi.spyOn(fs, 'statfsSync').mockReturnValue({
          blocks: 50_000_000n,
          bavail: 10_000_000n,
          bsize: 4096n,
        } as unknown as fs.StatFs);

        const capacity = service.getVolumeCapacity(nonExistentChild);

        expect(capacity).not.toBeNull();
        expect(capacity?.totalBytes).toBe(204_800_000_000);
        expect(capacity?.freeBytes).toBe(40_960_000_000);
        expect(statfsSpy).toHaveBeenCalledWith(path.resolve(tempParent));
      } finally {
        fs.rmSync(tempParent, { recursive: true, force: true });
      }
    });

    it('returns null when statfsSync throws an error', () => {
      vi.spyOn(fs, 'statfsSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const capacity = service.getVolumeCapacity(os.tmpdir());
      expect(capacity).toBeNull();
    });

    it('returns null when statfsSync is not available in environment', () => {
      const originalStatfs = fs.statfsSync;
      try {
        // @ts-expect-error simulating environment where statfsSync is undefined
        fs.statfsSync = undefined;
        const capacity = service.getVolumeCapacity(os.tmpdir());
        expect(capacity).toBeNull();
      } finally {
        fs.statfsSync = originalStatfs;
      }
    });
  });

  describe('singleton export', () => {
    it('exports singleton steamPathService instance', () => {
      expect(steamPathService).toBeInstanceOf(SteamPathService);
    });
  });
});
