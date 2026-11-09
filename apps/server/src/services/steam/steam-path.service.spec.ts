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
      // @ts-expect-error testing invalid type
      expect(service.validateLexicalPath(undefined).valid).toBe(false);
    });

    it('rejects path length exceeding 512 characters', () => {
      const longPath = 'C:\\' + 'a'.repeat(515);
      const res = service.validateLexicalPath(longPath);
      expect(res.valid).toBe(false);
      expect(res.message).toContain('between 1 and 512');
    });

    it('rejects paths containing null bytes', () => {
      expect(service.validateLexicalPath('C:\\steamcmd\0\\malicious').valid).toBe(false);
    });

    it('rejects directory traversal sequences', () => {
      expect(service.validateLexicalPath('C:\\steamcmd\\..\\windows\\system32').valid).toBe(false);
      expect(service.validateLexicalPath('/var/dayz/../etc/shadow').valid).toBe(false);
    });

    it('rejects invalid filesystem characters [<>"|?*]', () => {
      expect(service.validateLexicalPath('C:\\steamcmd\\<invalid>').valid).toBe(false);
      expect(service.validateLexicalPath('C:\\steamcmd\\pipe|name').valid).toBe(false);
      expect(service.validateLexicalPath('C:\\steamcmd\\wild*card').valid).toBe(false);
    });

    it('rejects relative paths', () => {
      expect(service.validateLexicalPath('relative\\path\\steamcmd').valid).toBe(false);
      expect(service.validateLexicalPath('./relative').valid).toBe(false);
      expect(service.validateLexicalPath('steamcmd').valid).toBe(false);
    });
  });

  describe('validateSteamCmdPath', () => {
    it('returns STORAGE_PATH_INVALID when lexical validation fails', () => {
      const res = service.validateSteamCmdPath('relative/steamcmd');
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('STORAGE_PATH_INVALID');
    });

    it('returns INVALID_STEAMCMD_PATH when path does not exist on disk', () => {
      const nonExistent =
        process.platform === 'win32'
          ? 'C:\\dsm_non_existent_steamcmd.exe'
          : '/dsm_non_existent_steamcmd';
      const res = service.validateSteamCmdPath(nonExistent);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('INVALID_STEAMCMD_PATH');
      expect(res.message).toContain('does not exist');
    });

    it('returns INVALID_STEAMCMD_PATH for directory missing both steamcmd.exe and steamcmd.sh', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-empty-cmd-'));
      try {
        const res = service.validateSteamCmdPath(tempDir);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_STEAMCMD_PATH');
        expect(res.message).toContain('does not contain steamcmd.exe or steamcmd.sh');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns valid: true for directory containing steamcmd.exe', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-win-cmd-'));
      try {
        fs.writeFileSync(path.join(tempDir, 'steamcmd.exe'), 'mock-exe');
        const res = service.validateSteamCmdPath(tempDir);
        expect(res.valid).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns valid: true for directory containing steamcmd.sh', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-sh-cmd-'));
      try {
        fs.writeFileSync(path.join(tempDir, 'steamcmd.sh'), 'mock-sh');
        const res = service.validateSteamCmdPath(tempDir);
        expect(res.valid).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns valid: true for an executable file target', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-file-cmd-'));
      const exeFile = path.join(tempDir, 'steamcmd.exe');
      try {
        fs.writeFileSync(exeFile, 'mock-binary');
        const res = service.validateSteamCmdPath(exeFile);
        expect(res.valid).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('checks execution permissions on non-windows platforms and fails when X_OK is missing', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-perm-cmd-'));
      const binFile = path.join(tempDir, 'steamcmd');
      fs.writeFileSync(binFile, 'mock-binary');

      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        vi.spyOn(fs, 'accessSync').mockImplementation(() => {
          throw new Error('EACCES: permission denied');
        });

        const res = service.validateSteamCmdPath(binFile);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_STEAMCMD_PATH');
        expect(res.message).toContain('lacks execution permissions');
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('handles statSync exception gracefully returning INVALID_STEAMCMD_PATH', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-stat-err-'));
      try {
        vi.spyOn(fs, 'statSync').mockImplementation(() => {
          throw new Error('EIO: i/o error');
        });
        const res = service.validateSteamCmdPath(tempDir);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INVALID_STEAMCMD_PATH');
        expect(res.message).toContain('Failed to inspect SteamCMD path');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('validateStoragePath', () => {
    it('returns STORAGE_PATH_INVALID when lexical validation fails', () => {
      const res = service.validateStoragePath('../relative/storage');
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('STORAGE_PATH_INVALID');
    });

    it('returns STORAGE_PATH_NOT_WRITABLE when root directory is not accessible', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const res = service.validateStoragePath(
        process.platform === 'win32' ? 'Z:\\missing\\vol' : '/inaccessible/root/vol',
      );
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('STORAGE_PATH_NOT_WRITABLE');
      expect(res.message).toContain('Path root is not accessible');
    });

    it('returns STORAGE_PATH_NOT_WRITABLE when probe write fails', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-write-fail-'));
      try {
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
          throw new Error('EROFS: read-only file system');
        });

        const res = service.validateStoragePath(tempDir);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('STORAGE_PATH_NOT_WRITABLE');
        expect(res.message).toContain('is not writable');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns INSUFFICIENT_STORAGE_SPACE when free space is under 1 GB (GUARD-01)', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-space-fail-'));
      try {
        vi.spyOn(service, 'getAvailableDiskSpace').mockReturnValue(500 * 1024 * 1024); // 500 MB

        const res = service.validateStoragePath(tempDir);
        expect(res.valid).toBe(false);
        expect(res.errorCode).toBe('INSUFFICIENT_STORAGE_SPACE');
        expect(res.freeBytes).toBe(500 * 1024 * 1024);
        expect(res.message).toContain('min 1GB required');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('returns valid: true and freeBytes for writable path with sufficient disk space', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-space-ok-'));
      try {
        vi.spyOn(service, 'getAvailableDiskSpace').mockReturnValue(50 * 1024 * 1024 * 1024); // 50 GB

        const res = service.validateStoragePath(tempDir);
        expect(res.valid).toBe(true);
        expect(res.freeBytes).toBe(50 * 1024 * 1024 * 1024);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('getAvailableDiskSpace', () => {
    it('returns calculated free bytes from statfsSync when available', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-space-calc-'));
      try {
        vi.spyOn(fs, 'statfsSync').mockReturnValue({
          bavail: 10_000_000n,
          bsize: 4096n,
        } as unknown as fs.StatFs);

        const freeBytes = service.getAvailableDiskSpace(tempDir);
        expect(freeBytes).toBe(40_960_000_000);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('resolves parent directory when target path does not exist', () => {
      const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-space-parent-'));
      const nonExistentChild = path.join(tempParent, 'missing', 'child', 'path');
      try {
        vi.spyOn(fs, 'statfsSync').mockReturnValue({
          bavail: 5_000_000n,
          bsize: 4096n,
        } as unknown as fs.StatFs);

        const freeBytes = service.getAvailableDiskSpace(nonExistentChild);
        expect(freeBytes).toBe(20_480_000_000);
      } finally {
        fs.rmSync(tempParent, { recursive: true, force: true });
      }
    });

    it('returns 100GB fallback when statfsSync throws', () => {
      vi.spyOn(fs, 'statfsSync').mockImplementation(() => {
        throw new Error('statfs failed');
      });

      const freeBytes = service.getAvailableDiskSpace(os.tmpdir());
      expect(freeBytes).toBe(100 * 1024 * 1024 * 1024);
    });

    it('returns 100GB fallback when statfsSync is undefined', () => {
      const orig = fs.statfsSync;
      try {
        // @ts-expect-error testing undefined statfsSync
        fs.statfsSync = undefined;
        const freeBytes = service.getAvailableDiskSpace(os.tmpdir());
        expect(freeBytes).toBe(100 * 1024 * 1024 * 1024);
      } finally {
        fs.statfsSync = orig;
      }
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
