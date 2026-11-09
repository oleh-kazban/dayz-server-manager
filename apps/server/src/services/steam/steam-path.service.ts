import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface PathValidationResult {
  valid: boolean;
  errorCode?:
    | 'STORAGE_PATH_INVALID'
    | 'STORAGE_PATH_NOT_WRITABLE'
    | 'INVALID_STEAMCMD_PATH'
    | 'INSUFFICIENT_STORAGE_SPACE';
  message?: string;
  freeBytes?: number;
}

export class SteamPathService {
  private readonly MIN_FREE_BYTES = 1024 * 1024 * 1024; // 1 GB (GUARD-01)
  public readonly WARNING_FREE_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB (REQ-01)

  /**
   * Enforces that a path is lexical, absolute, and contains no directory traversal sequences.
   */
  public validateLexicalPath(targetPath: string): { valid: boolean; message?: string } {
    if (!targetPath || typeof targetPath !== 'string') {
      return { valid: false, message: 'Path must be a non-empty string.' };
    }
    const trimmed = targetPath.trim();
    if (trimmed.length === 0 || trimmed.length > 512) {
      return { valid: false, message: 'Path length must be between 1 and 512 characters.' };
    }
    if (trimmed.includes('\0')) {
      return { valid: false, message: 'Null bytes are forbidden in paths.' };
    }
    if (trimmed.includes('..')) {
      return { valid: false, message: 'Path traversal (..) is not permitted.' };
    }
    if (/[<>"|?*]/.test(trimmed)) {
      return { valid: false, message: 'Path contains invalid filesystem characters.' };
    }
    const isAbsolute = path.win32.isAbsolute(trimmed) || path.posix.isAbsolute(trimmed);
    if (!isAbsolute) {
      return { valid: false, message: 'Path must be an absolute filesystem path.' };
    }
    return { valid: true };
  }

  /**
   * Validates that SteamCMD executable exists and is runnable.
   */
  public validateSteamCmdPath(cmdPath: string): PathValidationResult {
    const lexical = this.validateLexicalPath(cmdPath);
    if (!lexical.valid) {
      return {
        valid: false,
        errorCode: 'STORAGE_PATH_INVALID',
        message: lexical.message,
      };
    }

    const resolved = path.resolve(cmdPath);
    if (!fs.existsSync(resolved)) {
      return {
        valid: false,
        errorCode: 'INVALID_STEAMCMD_PATH',
        message: `SteamCMD path does not exist: '${resolved}'`,
      };
    }

    try {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        const winExe = path.join(resolved, 'steamcmd.exe');
        const shExe = path.join(resolved, 'steamcmd.sh');
        if (!fs.existsSync(winExe) && !fs.existsSync(shExe)) {
          return {
            valid: false,
            errorCode: 'INVALID_STEAMCMD_PATH',
            message: `Directory '${resolved}' does not contain steamcmd.exe or steamcmd.sh`,
          };
        }
      } else {
        if (process.platform !== 'win32') {
          try {
            fs.accessSync(resolved, fs.constants.X_OK);
          } catch {
            return {
              valid: false,
              errorCode: 'INVALID_STEAMCMD_PATH',
              message: `SteamCMD binary '${resolved}' lacks execution permissions`,
            };
          }
        }
      }
    } catch (err) {
      return {
        valid: false,
        errorCode: 'INVALID_STEAMCMD_PATH',
        message: `Failed to inspect SteamCMD path: ${(err as Error).message}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates that storage path exists or is creatable, writable, and has sufficient capacity.
   */
  public validateStoragePath(targetPath: string): PathValidationResult {
    const lexical = this.validateLexicalPath(targetPath);
    if (!lexical.valid) {
      return {
        valid: false,
        errorCode: 'STORAGE_PATH_INVALID',
        message: lexical.message,
      };
    }

    const resolved = path.resolve(targetPath);
    let probeDir = resolved;

    // If path does not exist, find nearest existing ancestor to test write/capacity
    while (!fs.existsSync(probeDir)) {
      const parent = path.dirname(probeDir);
      if (parent === probeDir) {
        break;
      }
      probeDir = parent;
    }

    if (!fs.existsSync(probeDir)) {
      return {
        valid: false,
        errorCode: 'STORAGE_PATH_NOT_WRITABLE',
        message: `Path root is not accessible: '${resolved}'`,
      };
    }

    // Test write permission by creating and removing a transient probe file
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const probeFile = path.join(probeDir, `.dsm_probe_${Date.now()}_${randomSuffix}.tmp`);
    try {
      fs.writeFileSync(probeFile, 'DSM_WRITE_PROBE');
      fs.unlinkSync(probeFile);
    } catch (err) {
      return {
        valid: false,
        errorCode: 'STORAGE_PATH_NOT_WRITABLE',
        message: `Target path '${resolved}' is not writable: ${(err as Error).message}`,
      };
    }

    // Query volume disk space
    const freeBytes = this.getAvailableDiskSpace(probeDir);
    if (freeBytes < this.MIN_FREE_BYTES) {
      return {
        valid: false,
        errorCode: 'INSUFFICIENT_STORAGE_SPACE',
        message: `Target path '${resolved}' has insufficient free disk space (${(freeBytes / (1024 * 1024)).toFixed(0)}MB free, min 1GB required)`,
        freeBytes,
      };
    }

    return { valid: true, freeBytes };
  }

  /**
   * Queries available free disk space on the partition containing the target directory.
   */
  public getAvailableDiskSpace(targetPath: string): number {
    let probeDir = path.resolve(targetPath);
    while (!fs.existsSync(probeDir)) {
      const parent = path.dirname(probeDir);
      if (parent === probeDir) break;
      probeDir = parent;
    }

    try {
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(probeDir);
        return Number(stats.bavail) * Number(stats.bsize);
      }
    } catch {
      // Fallback
    }

    // Default 100 GB fallback if statfs is unavailable in platform/test environment
    return 100 * 1024 * 1024 * 1024;
  }

  /**
   * Queries volume capacity (total and free bytes) on the partition containing the target directory.
   */
  public getVolumeCapacity(targetPath: string): { totalBytes: number; freeBytes: number } | null {
    if (!targetPath) return null;
    let probeDir = path.resolve(targetPath);
    while (!fs.existsSync(probeDir)) {
      const parent = path.dirname(probeDir);
      if (parent === probeDir) break;
      probeDir = parent;
    }

    try {
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(probeDir);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        return { totalBytes, freeBytes };
      }
    } catch {
      // Return null if statfs fails
    }
    return null;
  }
}

export const steamPathService = new SteamPathService();
