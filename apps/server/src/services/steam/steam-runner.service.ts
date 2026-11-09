import { type ChildProcess, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { SteamChallengeType, SteamDiagnosticsResultDto } from '@aegis/api-contracts';
import { decryptVaultSecret, type SteamSettings } from '@aegis/database';

import { type SseHub, sseHub } from '../realtime/sse-hub';

import { type SteamPathService, steamPathService } from './steam-path.service';

export type SteamSessionStatusType =
  'UNAUTHENTICATED' | 'AUTHENTICATED' | 'CHALLENGE_REQUIRED' | 'EXPIRED';

export interface ActiveChallenge {
  challengeId: string;
  type: SteamChallengeType;
  process: ChildProcess;
  timeoutTimer: NodeJS.Timeout;
  createdAt: number;
  timeoutSeconds: number;
}

export class SteamRunnerService {
  private activeChallenges = new Map<string, ActiveChallenge>();
  private activeDiagnosticProcess: ChildProcess | null = null;
  private isRunningOperation = false;

  constructor(
    private hub: SseHub = sseHub,
    private pathService: SteamPathService = steamPathService,
  ) {}

  public resolveBinaryPath(configuredPath: string): string {
    const resolved = path.resolve(configuredPath);
    if (!fs.existsSync(resolved)) {
      return resolved;
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      const winExe = path.join(resolved, 'steamcmd.exe');
      if (fs.existsSync(winExe)) return winExe;
      const shExe = path.join(resolved, 'steamcmd.sh');
      if (fs.existsSync(shExe)) return shExe;
    }
    return resolved;
  }

  public isBusy(): boolean {
    return (
      this.isRunningOperation ||
      this.activeChallenges.size > 0 ||
      this.activeDiagnosticProcess !== null
    );
  }

  private validateAllPaths(settings: SteamSettings, logs: string[]) {
    const cmdVal = this.pathService.validateSteamCmdPath(settings.steamCmdPath);
    const steamCmdValid = cmdVal.valid;
    logs.push(
      `[${new Date().toISOString()}] SteamCMD binary check: ${steamCmdValid ? 'VALID' : 'INVALID'} (${settings.steamCmdPath})`,
    );

    const workshopVal = this.pathService.validateStoragePath(settings.steamWorkshopPath);
    const workshopWritable = workshopVal.valid;
    const workshopFreeBytes =
      workshopVal.freeBytes ?? this.pathService.getAvailableDiskSpace(settings.steamWorkshopPath);
    logs.push(
      `[${new Date().toISOString()}] Workshop path check: ${workshopWritable ? 'WRITABLE' : 'UNWRITABLE'} (${(workshopFreeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB free)`,
    );

    const metaVal = this.pathService.validateStoragePath(settings.steamMetaPath);
    const metaWritable = metaVal.valid;
    const metaFreeBytes =
      metaVal.freeBytes ?? this.pathService.getAvailableDiskSpace(settings.steamMetaPath);
    logs.push(
      `[${new Date().toISOString()}] Meta path check: ${metaWritable ? 'WRITABLE' : 'UNWRITABLE'} (${(metaFreeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB free)`,
    );

    return {
      steamCmdValid,
      workshopWritable,
      workshopFreeBytes,
      metaWritable,
      metaFreeBytes,
    };
  }

  private buildProbeArgs(
    settings: SteamSettings,
    vaultKey: Buffer | undefined,
    logs: string[],
  ): string[] {
    const args: string[] = [];
    if (settings.steamMetaPath && fs.existsSync(settings.steamMetaPath)) {
      args.push('+@ShutdownOnFailedCommand', '1', '+@NoPromptForPassword', '1');
    }

    if (settings.authMode === 'account' && settings.steamUsername) {
      let password = '';
      if (settings.steamPasswordEncrypted && vaultKey) {
        try {
          password = decryptVaultSecret(settings.steamPasswordEncrypted, vaultKey);
        } catch {
          logs.push(`[${new Date().toISOString()}] Warning: Failed to decrypt Steam credentials.`);
        }
      }
      if (password) {
        args.push('+login', settings.steamUsername, password);
      } else {
        args.push('+login', settings.steamUsername);
      }
    } else {
      args.push('+login', 'anonymous');
    }

    args.push('+quit');
    return args;
  }

  private async executeChildProbe(
    binaryPath: string,
    args: string[],
    cwd: string | undefined,
    logs: string[],
  ): Promise<{ code: number | null; output: string }> {
    return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(binaryPath, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd,
      });

      this.activeDiagnosticProcess = child;
      let stdoutAcc = '';
      let stderrAcc = '';

      child.stdout.on('data', chunk => {
        const text = chunk.toString();
        stdoutAcc += text;
        logs.push(`[STDOUT] ${text.trimEnd()}`);
      });

      child.stderr.on('data', chunk => {
        const text = chunk.toString();
        stderrAcc += text;
        logs.push(`[STDERR] ${text.trimEnd()}`);
      });

      const timer = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          // Ignore
        }
        reject(new Error('SteamCMD diagnostics timed out after 30 seconds'));
      }, 30_000);

      child.on('error', err => {
        clearTimeout(timer);
        reject(err);
      });

      child.on('close', code => {
        clearTimeout(timer);
        resolve({ code, output: `${stdoutAcc}\n${stderrAcc}` });
      });
    });
  }

  /**
   * Executes connection and configuration diagnostics probe (REQ-07).
   */
  public async runDiagnostics(
    settings: SteamSettings,
    vaultKey?: Buffer,
  ): Promise<SteamDiagnosticsResultDto> {
    if (this.isBusy()) {
      const error = new Error('Another Steam task or diagnostic run is currently in progress.');
      (error as unknown as { errorCode: string }).errorCode = 'TASK_CONCURRENCY_CONFLICT';
      throw error;
    }

    this.isRunningOperation = true;
    const logs: string[] = [];
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] Starting SteamCMD diagnostics probe`);

    const pathStats = this.validateAllPaths(settings, logs);
    if (!pathStats.steamCmdValid) {
      this.isRunningOperation = false;
      return {
        success: false,
        steamCmdValid: false,
        workshopPathWritable: pathStats.workshopWritable,
        workshopFreeBytes: pathStats.workshopFreeBytes,
        metaPathWritable: pathStats.metaWritable,
        metaFreeBytes: pathStats.metaFreeBytes,
        connectionSuccess: false,
        logs,
        timestamp,
      };
    }

    const binaryPath = this.resolveBinaryPath(settings.steamCmdPath);
    let connectionSuccess = false;
    let latencyMs: number | undefined;
    let steamCmdVersion: string | undefined;

    const args = this.buildProbeArgs(settings, vaultKey, logs);
    logs.push(
      `[${new Date().toISOString()}] Executing probe: ${binaryPath} +login [mode=${settings.authMode}] +quit`,
    );

    const startTime = Date.now();
    try {
      const cwd = fs.existsSync(settings.steamMetaPath) ? settings.steamMetaPath : undefined;
      const execResult = await this.executeChildProbe(binaryPath, args, cwd, logs);

      latencyMs = Date.now() - startTime;
      logs.push(
        `[${new Date().toISOString()}] SteamCMD exited with code ${execResult.code} (${latencyMs}ms)`,
      );

      const versionMatch =
        execResult.output.match(/Steam Console Client \(c\) Valve Corporation - build (\d+)/i) ||
        execResult.output.match(/SteamCMD version\s+([^\r\n]+)/i);
      if (versionMatch) {
        steamCmdVersion = versionMatch[1];
      }

      if (
        execResult.output.includes('Waiting for user info...OK') ||
        execResult.output.includes('Logged in OK') ||
        execResult.output.includes('Connecting anonymously to Steam Public...OK') ||
        execResult.code === 0
      ) {
        connectionSuccess = true;
      }
    } catch (err) {
      logs.push(`[${new Date().toISOString()}] Diagnostics error: ${(err as Error).message}`);
    } finally {
      this.activeDiagnosticProcess = null;
      this.isRunningOperation = false;
    }

    return {
      success:
        pathStats.steamCmdValid &&
        pathStats.workshopWritable &&
        pathStats.metaWritable &&
        connectionSuccess,
      steamCmdValid: pathStats.steamCmdValid,
      steamCmdVersion,
      workshopPathWritable: pathStats.workshopWritable,
      workshopFreeBytes: pathStats.workshopFreeBytes,
      metaPathWritable: pathStats.metaWritable,
      metaFreeBytes: pathStats.metaFreeBytes,
      connectionSuccess,
      latencyMs,
      logs,
      timestamp,
    };
  }

  /**
   * Spawns an interactive authenticated SteamCMD run and monitors for 2FA prompts (REQ-05).
   */
  public async spawnAuthenticatedLogin(
    settings: SteamSettings,
    vaultKey: Buffer,
    onStatusChange?: (status: SteamSessionStatusType) => void,
  ): Promise<void> {
    if (this.isBusy()) {
      const error = new Error('Another Steam task is currently active.');
      (error as unknown as { errorCode: string }).errorCode = 'TASK_CONCURRENCY_CONFLICT';
      throw error;
    }

    this.isRunningOperation = true;
    const binaryPath = this.resolveBinaryPath(settings.steamCmdPath);

    let password = '';
    if (settings.steamPasswordEncrypted) {
      password = decryptVaultSecret(settings.steamPasswordEncrypted, vaultKey);
    }

    const args: string[] = ['+login', settings.steamUsername || '', password, '+quit'];

    const child = spawn(binaryPath, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: fs.existsSync(settings.steamMetaPath) ? settings.steamMetaPath : undefined,
    });

    const challengeId = crypto.randomUUID();

    const OTP_PROMPT_REGEX = /(?:Enter your Steam Guard code|Steam Guard code):/i;
    const MOBILE_PUSH_REGEX =
      /(?:Waiting for confirmation in your Steam Mobile App|Steam Mobile Confirmation)/i;
    const SUCCESS_LOGIN_REGEX = /(?:Logged in OK|Waiting for user info\.\.\.OK)/i;

    child.stdout.on('data', chunk => {
      const text = chunk.toString();

      if (SUCCESS_LOGIN_REGEX.test(text)) {
        if (onStatusChange) onStatusChange('AUTHENTICATED');
        this.hub.broadcast('steam.auth.status', { status: 'AUTHENTICATED' });
        this.cleanupChallenge(challengeId);
      }

      if (OTP_PROMPT_REGEX.test(text)) {
        this.handleChallengeDetected(challengeId, 'OTP_CODE', child, onStatusChange);
      } else if (MOBILE_PUSH_REGEX.test(text)) {
        this.handleChallengeDetected(challengeId, 'MOBILE_PUSH', child, onStatusChange);
      }
    });

    child.on('close', () => {
      this.cleanupChallenge(challengeId);
      this.isRunningOperation = false;
    });

    child.on('error', () => {
      this.cleanupChallenge(challengeId);
      this.isRunningOperation = false;
    });
  }

  private handleChallengeDetected(
    challengeId: string,
    type: SteamChallengeType,
    process: ChildProcess,
    onStatusChange?: (status: SteamSessionStatusType) => void,
  ): void {
    if (this.activeChallenges.has(challengeId)) {
      return;
    }

    const timeoutSeconds = 90;
    const createdAt = Date.now();

    const timeoutTimer = setTimeout(() => {
      this.expireChallenge(challengeId, onStatusChange);
    }, timeoutSeconds * 1000);

    this.activeChallenges.set(challengeId, {
      challengeId,
      type,
      process,
      timeoutTimer,
      createdAt,
      timeoutSeconds,
    });

    if (onStatusChange) onStatusChange('CHALLENGE_REQUIRED');
    this.hub.broadcast('steam.auth.status', { status: 'CHALLENGE_REQUIRED' });

    this.hub.broadcast('steam.auth.challenge', {
      challengeId,
      type,
      timeoutSeconds,
      createdAt: new Date(createdAt).toISOString(),
    });
  }

  public submitChallengeOtp(challengeId: string, code: string): void {
    const challenge = this.activeChallenges.get(challengeId);

    if (!challenge) {
      const err = new Error('Challenge session not found or has expired.');
      (err as unknown as { errorCode: string }).errorCode = 'CHALLENGE_NOT_FOUND_OR_EXPIRED';
      throw err;
    }

    const { process } = challenge;
    if (process.killed || !process.stdin || process.stdin.destroyed || !process.stdin.writable) {
      this.cleanupChallenge(challengeId);
      const err = new Error('SteamCMD process has already exited or stdin is unwritable.');
      (err as unknown as { errorCode: string }).errorCode = 'CHALLENGE_PROCESS_INVALID';
      throw err;
    }

    process.stdin.write(`${code.trim()}\n`);
  }

  public abortChallenge(challengeId: string): void {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      const err = new Error('Challenge session not found or has expired.');
      (err as unknown as { errorCode: string }).errorCode = 'CHALLENGE_NOT_FOUND_OR_EXPIRED';
      throw err;
    }

    try {
      challenge.process.kill('SIGTERM');
    } catch {
      // Ignore
    }

    this.cleanupChallenge(challengeId);
    this.hub.broadcast('steam.auth.challenge.expired', { challengeId });
  }

  private expireChallenge(
    challengeId: string,
    onStatusChange?: (status: SteamSessionStatusType) => void,
  ): void {
    const challenge = this.activeChallenges.get(challengeId);
    if (challenge) {
      try {
        challenge.process.kill('SIGTERM');
      } catch {
        // Ignore
      }
      this.cleanupChallenge(challengeId);
      if (onStatusChange) onStatusChange('EXPIRED');
      this.hub.broadcast('steam.auth.status', { status: 'EXPIRED' });
      this.hub.broadcast('steam.auth.challenge.expired', { challengeId });
    }
  }

  private cleanupChallenge(challengeId: string): void {
    const challenge = this.activeChallenges.get(challengeId);
    if (challenge) {
      clearTimeout(challenge.timeoutTimer);
      this.activeChallenges.delete(challengeId);
    }
    this.isRunningOperation = false;
  }

  public clearSessionTokens(metaPath: string): { success: boolean; clearedCount: number } {
    if (!fs.existsSync(metaPath)) {
      return { success: true, clearedCount: 0 };
    }

    let clearedCount = 0;
    try {
      const entries = fs.readdirSync(metaPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith('ssfn')) {
          const filePath = path.join(metaPath, entry.name);
          fs.unlinkSync(filePath);
          clearedCount++;
        }
      }

      const configDir = path.join(metaPath, 'config');
      if (fs.existsSync(configDir)) {
        const vdfFile = path.join(configDir, 'config.vdf');
        if (fs.existsSync(vdfFile)) {
          fs.unlinkSync(vdfFile);
          clearedCount++;
        }
        const vdfBak = path.join(configDir, 'config.vdf.bak');
        if (fs.existsSync(vdfBak)) {
          fs.unlinkSync(vdfBak);
          clearedCount++;
        }
      }
    } catch (err) {
      const error = new Error(`Failed to clear session tokens: ${(err as Error).message}`);
      (error as unknown as { errorCode: string }).errorCode = 'SESSION_CLEAR_FAILED';
      throw error;
    }

    return { success: true, clearedCount };
  }
}

export const steamRunnerService = new SteamRunnerService();
