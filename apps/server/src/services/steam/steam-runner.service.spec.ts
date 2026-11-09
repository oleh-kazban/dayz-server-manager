import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptVaultSecret, type SteamSettings } from '@aegis/database';

import type { SseHub } from '../realtime/sse-hub';

import type { SteamPathService } from './steam-path.service';
import { SteamRunnerService } from './steam-runner.service';

interface MockChildProcess extends EventEmitter {
  stdin: PassThrough & { destroyed?: boolean; writable?: boolean };
  stdout: EventEmitter;
  stderr: EventEmitter;
  killed: boolean;
  kill: (signal?: string) => boolean;
}

function createMockChildProcess(): MockChildProcess {
  const proc = new EventEmitter() as MockChildProcess;
  const stdin = new PassThrough() as PassThrough & { destroyed?: boolean; writable?: boolean };
  stdin.writable = true;
  proc.stdin = stdin;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn().mockImplementation(() => {
    proc.killed = true;
    return true;
  });
  return proc;
}

const mockSpawn = vi.fn();

vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => mockSpawn(...args),
  };
});

describe('SteamRunnerService (apps/server/src/services/steam)', () => {
  let mockHub: SseHub;
  let runner: SteamRunnerService;
  let mockProc: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHub = {
      subscribe: vi.fn(),
      broadcast: vi.fn(),
      sendTo: vi.fn(),
      destroy: vi.fn(),
    } as unknown as SseHub;

    mockProc = createMockChildProcess();
    mockSpawn.mockReturnValue(mockProc);

    const mockPathService = {
      validateSteamCmdPath: vi.fn().mockReturnValue({ valid: true }),
      validateStoragePath: vi
        .fn()
        .mockReturnValue({ valid: true, freeBytes: 100 * 1024 * 1024 * 1024 }),
      getAvailableDiskSpace: vi.fn().mockReturnValue(100 * 1024 * 1024 * 1024),
      validateLexicalPath: vi.fn().mockReturnValue({ valid: true }),
    } as unknown as SteamPathService;

    runner = new SteamRunnerService(mockHub, mockPathService);
  });

  describe('Session Token Purge (REQ-04)', () => {
    let tempMetaDir: string;

    beforeEach(() => {
      tempMetaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-steam-meta-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempMetaDir)) {
        fs.rmSync(tempMetaDir, { recursive: true, force: true });
      }
    });

    it('clears ssfn files and config.vdf while leaving other files intact', () => {
      const ssfn1 = path.join(tempMetaDir, 'ssfn123456789012345');
      const ssfn2 = path.join(tempMetaDir, 'ssfn987654321098765');
      const preserveFile = path.join(tempMetaDir, 'appmanifest_223350.acf');

      const configDir = path.join(tempMetaDir, 'config');
      fs.mkdirSync(configDir, { recursive: true });
      const vdfFile = path.join(configDir, 'config.vdf');
      const vdfBak = path.join(configDir, 'config.vdf.bak');

      fs.writeFileSync(ssfn1, 'token-data-1');
      fs.writeFileSync(ssfn2, 'token-data-2');
      fs.writeFileSync(preserveFile, 'manifest-data');
      fs.writeFileSync(vdfFile, 'vdf-content');
      fs.writeFileSync(vdfBak, 'vdf-backup');

      const result = runner.clearSessionTokens(tempMetaDir);

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(4); // 2 ssfn + vdf + vdf.bak

      expect(fs.existsSync(ssfn1)).toBe(false);
      expect(fs.existsSync(ssfn2)).toBe(false);
      expect(fs.existsSync(vdfFile)).toBe(false);
      expect(fs.existsSync(vdfBak)).toBe(false);
      expect(fs.existsSync(preserveFile)).toBe(true);
    });

    it('returns 0 cleared count if meta path does not exist', () => {
      const nonExistent = path.join(tempMetaDir, 'non_existent_subdir');
      const result = runner.clearSessionTokens(nonExistent);
      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
    });
  });

  describe('2FA Challenge Detection & Dispatch (REQ-05, REQ-06)', () => {
    const fakeSettings: SteamSettings = {
      id: 'default',
      steamCmdPath:
        process.platform === 'win32' ? 'C:\\steamcmd\\steamcmd.exe' : '/usr/games/steamcmd',
      steamWorkshopPath: os.tmpdir(),
      steamMetaPath: os.tmpdir(),
      authMode: 'account',
      steamUsername: 'test_operator',
      steamPasswordEncrypted: null,
      gameServerAppId: 223350,
      workshopAppId: 221100,
      branch: 'public',
      branchPasswordEncrypted: null,
      sessionStatus: 'UNAUTHENTICATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const vaultKey = Buffer.alloc(32, 1);

    it('detects OTP challenge prompt from stdout and broadcasts event', async () => {
      const statusChangeSpy = vi.fn();
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, vaultKey, statusChangeSpy);

      // Simulate stdout emitting OTP prompt
      mockProc.stdout.emit(
        'data',
        Buffer.from('Logging in user test_operator...\nEnter your Steam Guard code: '),
      );

      expect(statusChangeSpy).toHaveBeenCalledWith('CHALLENGE_REQUIRED');
      expect(mockHub.broadcast).toHaveBeenCalledWith('steam.auth.status', {
        status: 'CHALLENGE_REQUIRED',
      });
      expect(mockHub.broadcast).toHaveBeenCalledWith(
        'steam.auth.challenge',
        expect.objectContaining({
          type: 'OTP_CODE',
          timeoutSeconds: 90,
        }),
      );

      mockProc.emit('close', 0);
      await loginPromise;
    });

    it('detects Mobile Push challenge prompt from stdout', async () => {
      const statusChangeSpy = vi.fn();
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, vaultKey, statusChangeSpy);

      mockProc.stdout.emit(
        'data',
        Buffer.from('Waiting for confirmation in your Steam Mobile App...'),
      );

      expect(statusChangeSpy).toHaveBeenCalledWith('CHALLENGE_REQUIRED');
      expect(mockHub.broadcast).toHaveBeenCalledWith(
        'steam.auth.challenge',
        expect.objectContaining({
          type: 'MOBILE_PUSH',
          timeoutSeconds: 90,
        }),
      );

      mockProc.emit('close', 0);
      await loginPromise;
    });

    it('detects successful login and updates session status to AUTHENTICATED', async () => {
      const statusChangeSpy = vi.fn();
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, vaultKey, statusChangeSpy);

      mockProc.stdout.emit('data', Buffer.from('Waiting for user info...OK\nLogged in OK\n'));

      expect(statusChangeSpy).toHaveBeenCalledWith('AUTHENTICATED');
      expect(mockHub.broadcast).toHaveBeenCalledWith('steam.auth.status', {
        status: 'AUTHENTICATED',
      });

      mockProc.emit('close', 0);
      await loginPromise;
    });
  });

  describe('Challenge Response & Stdin Pipeline (GUARD-02)', () => {
    const fakeSettings: SteamSettings = {
      id: 'default',
      steamCmdPath: 'steamcmd',
      steamWorkshopPath: os.tmpdir(),
      steamMetaPath: os.tmpdir(),
      authMode: 'account',
      steamUsername: 'test_operator',
      steamPasswordEncrypted: null,
      gameServerAppId: 223350,
      workshopAppId: 221100,
      branch: 'public',
      branchPasswordEncrypted: null,
      sessionStatus: 'UNAUTHENTICATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('pipes submitted OTP code to active process stdin', async () => {
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, Buffer.alloc(32));

      mockProc.stdout.emit('data', Buffer.from('Enter your Steam Guard code: '));

      const challengeCall = vi
        .mocked(mockHub.broadcast)
        .mock.calls.find(call => call[0] === 'steam.auth.challenge');
      expect(challengeCall).toBeDefined();
      const challengeId = (challengeCall![1] as { challengeId: string }).challengeId;

      let pipedData = '';
      mockProc.stdin.on('data', chunk => {
        pipedData += chunk.toString();
      });

      runner.submitChallengeOtp(challengeId, '9X7K2');
      expect(pipedData).toBe('9X7K2\n');

      mockProc.emit('close', 0);
      await loginPromise;
    });

    it('throws CHALLENGE_NOT_FOUND_OR_EXPIRED when challengeId is unknown (GUARD-02)', () => {
      expect(() => runner.submitChallengeOtp('unknown-challenge-uuid', '8K9B2')).toThrow(
        'Challenge session not found or has expired.',
      );
    });

    it('throws CHALLENGE_PROCESS_INVALID when process is killed or stdin is dead (GUARD-02)', async () => {
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, Buffer.alloc(32));
      mockProc.stdout.emit('data', Buffer.from('Enter your Steam Guard code: '));

      const challengeCall = vi
        .mocked(mockHub.broadcast)
        .mock.calls.find(call => call[0] === 'steam.auth.challenge');
      const challengeId = (challengeCall![1] as { challengeId: string }).challengeId;

      mockProc.killed = true;

      expect(() => runner.submitChallengeOtp(challengeId, '8K9B2')).toThrow(
        'SteamCMD process has already exited or stdin is unwritable.',
      );

      mockProc.emit('close', 0);
      await loginPromise;
    });

    it('abortChallenge terminates process with SIGTERM and broadcasts expiration', async () => {
      const loginPromise = runner.spawnAuthenticatedLogin(fakeSettings, Buffer.alloc(32));
      mockProc.stdout.emit('data', Buffer.from('Enter your Steam Guard code: '));

      const challengeCall = vi
        .mocked(mockHub.broadcast)
        .mock.calls.find(call => call[0] === 'steam.auth.challenge');
      const challengeId = (challengeCall![1] as { challengeId: string }).challengeId;

      runner.abortChallenge(challengeId);

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockHub.broadcast).toHaveBeenCalledWith('steam.auth.challenge.expired', {
        challengeId,
      });

      mockProc.emit('close', 0);
      await loginPromise;
    });

    it('enforces concurrency lock: rejects concurrent runs with TASK_CONCURRENCY_CONFLICT', async () => {
      const firstRun = runner.spawnAuthenticatedLogin(fakeSettings, Buffer.alloc(32));

      await expect(runner.spawnAuthenticatedLogin(fakeSettings, Buffer.alloc(32))).rejects.toThrow(
        'Another Steam task is currently active.',
      );

      mockProc.emit('close', 0);
      await firstRun;
    });
  });

  describe('Diagnostics Probe Execution & Session Ticket Prioritization (REQ-07, REQ-12)', () => {
    let tempMetaDir: string;
    const testVaultKey = Buffer.alloc(32, 2);
    const fakeSettingsWithPassword: SteamSettings = {
      id: 'default',
      steamCmdPath:
        process.platform === 'win32' ? 'C:\\steamcmd\\steamcmd.exe' : '/usr/games/steamcmd',
      steamWorkshopPath: os.tmpdir(),
      steamMetaPath: os.tmpdir(),
      authMode: 'account',
      steamUsername: 'dayz_operator',
      steamPasswordEncrypted: null,
      gameServerAppId: 223350,
      workshopAppId: 221100,
      branch: 'public',
      branchPasswordEncrypted: null,
      sessionStatus: 'UNAUTHENTICATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      tempMetaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-steam-probe-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempMetaDir)) {
        fs.rmSync(tempMetaDir, { recursive: true, force: true });
      }
    });

    it('buildProbeArgs omits raw password argument when session tickets (ssfn*) or sessionStatus === AUTHENTICATED are present (REQ-12)', () => {
      const encryptedPassword = encryptVaultSecret('VaultPasswordSecret!', testVaultKey);

      // Subcase 1: sessionStatus is AUTHENTICATED -> omits password
      const authenticatedSettings: SteamSettings = {
        ...fakeSettingsWithPassword,
        steamMetaPath: tempMetaDir,
        steamPasswordEncrypted: encryptedPassword,
        sessionStatus: 'AUTHENTICATED',
      };
      const logsAuth: string[] = [];
      const argsAuth = (
        runner as unknown as {
          buildProbeArgs: (s: SteamSettings, k: Buffer, l: string[]) => string[];
        }
      ).buildProbeArgs(authenticatedSettings, testVaultKey, logsAuth);

      expect(argsAuth).toEqual([
        '+@ShutdownOnFailedCommand',
        '1',
        '+@NoPromptForPassword',
        '1',
        '+login',
        'dayz_operator',
        '+quit',
      ]);
      expect(argsAuth).not.toContain('VaultPasswordSecret!');
      expect(logsAuth.some(l => l.includes('Prioritizing cached session tickets'))).toBe(true);

      // Subcase 2: sessionStatus is UNAUTHENTICATED but ssfn ticket file exists in metaPath -> omits password
      fs.writeFileSync(path.join(tempMetaDir, 'ssfn784628461984'), 'mock-ssfn-ticket');
      const unauthWithSsfn: SteamSettings = {
        ...fakeSettingsWithPassword,
        steamMetaPath: tempMetaDir,
        steamPasswordEncrypted: encryptedPassword,
        sessionStatus: 'UNAUTHENTICATED',
      };
      const logsSsfn: string[] = [];
      const argsSsfn = (
        runner as unknown as {
          buildProbeArgs: (s: SteamSettings, k: Buffer, l: string[]) => string[];
        }
      ).buildProbeArgs(unauthWithSsfn, testVaultKey, logsSsfn);

      expect(argsSsfn).toEqual([
        '+@ShutdownOnFailedCommand',
        '1',
        '+@NoPromptForPassword',
        '1',
        '+login',
        'dayz_operator',
        '+quit',
      ]);
      expect(argsSsfn).not.toContain('VaultPasswordSecret!');
      expect(logsSsfn.some(l => l.includes('Prioritizing cached session tickets'))).toBe(true);

      // Subcase 3: No ssfn file and sessionStatus UNAUTHENTICATED -> includes decrypted password
      const emptyMetaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-steam-empty-'));
      try {
        const unauthNoSsfn: SteamSettings = {
          ...fakeSettingsWithPassword,
          steamMetaPath: emptyMetaDir,
          steamPasswordEncrypted: encryptedPassword,
          sessionStatus: 'UNAUTHENTICATED',
        };
        const logsNoTicket: string[] = [];
        const argsNoTicket = (
          runner as unknown as {
            buildProbeArgs: (s: SteamSettings, k: Buffer, l: string[]) => string[];
          }
        ).buildProbeArgs(unauthNoSsfn, testVaultKey, logsNoTicket);

        expect(argsNoTicket).toEqual([
          '+@ShutdownOnFailedCommand',
          '1',
          '+@NoPromptForPassword',
          '1',
          '+login',
          'dayz_operator',
          'VaultPasswordSecret!',
          '+quit',
        ]);
      } finally {
        fs.rmSync(emptyMetaDir, { recursive: true, force: true });
      }
    });

    it('executeChildProbe detects 2FA challenge, broadcasts SSE event, extends timeout to 90s, and handles OTP submission (REQ-12)', async () => {
      vi.useFakeTimers();
      try {
        const onStatusChangeSpy = vi.fn();
        const diagPromise = runner.runDiagnostics(
          {
            ...fakeSettingsWithPassword,
            steamMetaPath: tempMetaDir,
          },
          testVaultKey,
          onStatusChangeSpy,
        );

        // 1. Emit OTP challenge prompt from child stdout
        mockProc.stdout.emit(
          'data',
          Buffer.from('Logging in user dayz_operator...\nEnter your Steam Guard code: '),
        );

        // 2. Verify challenge detected, status change triggered, and SSE events broadcasted
        expect(onStatusChangeSpy).toHaveBeenCalledWith('CHALLENGE_REQUIRED');
        expect(mockHub.broadcast).toHaveBeenCalledWith('steam.auth.status', {
          status: 'CHALLENGE_REQUIRED',
        });
        expect(mockHub.broadcast).toHaveBeenCalledWith(
          'steam.auth.challenge',
          expect.objectContaining({
            type: 'OTP_CODE',
            timeoutSeconds: 90,
          }),
        );

        // 3. Verify timeout extension: Advance past initial 30s timeout (to 45s) -> should NOT time out
        await vi.advanceTimersByTimeAsync(45_000);
        expect(mockProc.killed).toBe(false);
        expect(mockProc.kill).not.toHaveBeenCalled();

        // 4. Handle OTP submission via pipeline
        const challengeCall = vi
          .mocked(mockHub.broadcast)
          .mock.calls.find(call => call[0] === 'steam.auth.challenge');
        expect(challengeCall).toBeDefined();
        const challengeId = (challengeCall![1] as { challengeId: string }).challengeId;

        let pipedData = '';
        mockProc.stdin.on('data', chunk => {
          pipedData += chunk.toString();
        });

        runner.submitChallengeOtp(challengeId, '6F3P1');
        expect(pipedData).toBe('6F3P1\n');

        // 5. Simulate login confirmation and process close
        mockProc.stdout.emit(
          'data',
          Buffer.from('Waiting for user info...OK\nLogged in OK\nSteamCMD version 1730000000\n'),
        );
        expect(onStatusChangeSpy).toHaveBeenCalledWith('AUTHENTICATED');
        expect(mockHub.broadcast).toHaveBeenCalledWith('steam.auth.status', {
          status: 'AUTHENTICATED',
        });

        mockProc.emit('close', 0);
        const result = await diagPromise;

        expect(result.success).toBe(true);
        expect(result.connectionSuccess).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('executeChildProbe times out after 90 seconds if extended challenge is not resolved (REQ-12)', async () => {
      vi.useFakeTimers();
      try {
        const diagPromise = runner.runDiagnostics(
          {
            ...fakeSettingsWithPassword,
            steamMetaPath: tempMetaDir,
          },
          testVaultKey,
        );

        mockProc.stdout.emit('data', Buffer.from('Enter your Steam Guard code: '));

        await vi.advanceTimersByTimeAsync(91_000);

        const result = await diagPromise;
        expect(result.success).toBe(false);
        expect(result.connectionSuccess).toBe(false);
        expect(result.logs.some(l => l.includes('timed out after 90 seconds'))).toBe(true);
        expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
