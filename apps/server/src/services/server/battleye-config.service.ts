import fs from 'node:fs';

import {
  isServerActiveStatus,
  rconIpSchema,
  rconPasswordSchema,
  type ServerStatus,
  type SyncBattlEyeConfigResponseDto,
  syncBattlEyeConfigResponseSchema,
} from '@aegis/api-contracts';

import {
  backupAndRemoveFile,
  ConfigStorageError,
  writeFileAtomically,
} from './config-atomic-writer';
import {
  getPlatformPathImpl,
  isHostAbsolutePath,
  isNonRelativeSubpath,
  isPathContainedWithin,
  normalizeRelativeSubpath,
  type PlatformPathImpl,
  safeLstat,
  safeRealpath,
  safeStat,
  validateLexicalCandidate,
} from './server-path-safety';

const STALE_BATTLEYE_ACTIVE_REGEX = /^beserver(?:_x64)?_active_[a-z0-9_.-]+\.cfg$/i;

export interface BattlEyeConfigSource {
  id: string;
  name: string;
  status: ServerStatus;
  installPath: string;
  profilePath: string;
  rconPort: number;
  rconIp: string;
}

export interface BattlEyeSyncLogger {
  warn: (obj: Record<string, unknown>, msg: string) => void;
}

export interface BattlEyeSyncOptions {
  platform?: NodeJS.Platform;
  backupRootDir?: string;
  logger?: BattlEyeSyncLogger;
}

interface ValidatedBattlEyeTargets {
  platform: NodeJS.Platform;
  pathImpl: PlatformPathImpl;
  installReal: string;
  profileSegments: string[];
  battleyeFilename: 'BEServer_x64.cfg' | 'beserver_x64.cfg';
  staleActivePaths: string[];
}

export function getBattlEyeConfigFilename(
  platform: NodeJS.Platform = process.platform,
): 'BEServer_x64.cfg' | 'beserver_x64.cfg' {
  return platform === 'win32' ? 'BEServer_x64.cfg' : 'beserver_x64.cfg';
}

export function renderBattlEyeCfg(
  server: Pick<BattlEyeConfigSource, 'rconPort' | 'rconIp'>,
  rconPassword: string,
): string {
  if (!rconPasswordSchema.safeParse(rconPassword).success) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'RCON password violates BattlEye character or length constraints.',
    );
  }
  if (!rconIpSchema.safeParse(server.rconIp).success) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'RCON bind IP must be a valid IPv4 address.',
    );
  }

  const lines = [
    `RConPassword ${rconPassword}`,
    `RConPort ${server.rconPort}`,
    `RConIP ${server.rconIp}`,
    'RestrictRCon 0',
  ];

  return `${lines.join('\n')}\n`;
}

function splitCleanRelativeSegments(
  subpath: string,
  pathImpl: PlatformPathImpl,
  label: string,
): string[] {
  const normalized = normalizeRelativeSubpath(subpath, pathImpl);
  const rawSegments = normalized.split(pathImpl.sep).filter(Boolean);
  if (
    rawSegments.length === 0 ||
    rawSegments.some(segment => segment === '.' || segment === '..')
  ) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      `${label} resolves to an empty relative path.`,
    );
  }
  return rawSegments;
}

function verifyExistingSegmentsContained(
  baseReal: string,
  segments: string[],
  platform: NodeJS.Platform,
  label: string,
): string | null {
  const pathImpl = getPlatformPathImpl(platform);
  let cursor = baseReal;

  for (const segment of segments) {
    cursor = pathImpl.join(cursor, segment);
    const lstat = safeLstat(cursor);
    if (!lstat.exists) {
      return null;
    }
    const stat = safeStat(cursor);
    if (!stat.exists || !stat.stat.isDirectory()) {
      throw new ConfigStorageError('CONFIG_PATH_INVALID', `${label} is not a directory.`);
    }
    const segmentReal = safeRealpath(cursor);
    if (!segmentReal || !isPathContainedWithin(segmentReal, baseReal, platform, false)) {
      throw new ConfigStorageError(
        'CONFIG_PATH_INVALID',
        `${label} escapes installation directory containment boundaries.`,
      );
    }
  }

  return safeRealpath(cursor);
}

function inspectExistingBattlEyeTargets(
  battleyeCandidate: string,
  battleyeFilename: string,
  installReal: string,
  platform: NodeJS.Platform,
): string[] {
  const pathImpl = getPlatformPathImpl(platform);
  const battleyeLstat = safeLstat(battleyeCandidate);
  if (!battleyeLstat.exists) {
    return [];
  }
  if (battleyeLstat.stat.isSymbolicLink() || !battleyeLstat.stat.isDirectory()) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'BattlEye directory must be a non-symlink directory.',
    );
  }

  const battleyeReal = safeRealpath(battleyeCandidate);
  if (!battleyeReal || !isPathContainedWithin(battleyeReal, installReal, platform, false)) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'BattlEye directory escapes installation directory containment boundaries.',
    );
  }

  const targetCfg = pathImpl.join(battleyeReal, battleyeFilename);
  const cfgLstat = safeLstat(targetCfg);
  if (cfgLstat.exists && (cfgLstat.stat.isSymbolicLink() || !cfgLstat.stat.isFile())) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      `Target BattlEye file '${battleyeFilename}' must be a regular non-symlink file.`,
    );
  }

  const entries = fs.readdirSync(battleyeReal, { withFileTypes: true });
  const staleActivePaths: string[] = [];
  for (const entry of entries) {
    if (!STALE_BATTLEYE_ACTIVE_REGEX.test(entry.name)) {
      continue;
    }
    const staleCandidate = pathImpl.join(battleyeReal, entry.name);
    if (entry.isSymbolicLink() || !entry.isFile()) {
      throw new ConfigStorageError(
        'CONFIG_PATH_INVALID',
        `Stale BattlEye active file '${entry.name}' must be a regular non-symlink file.`,
      );
    }
    staleActivePaths.push(staleCandidate);
  }

  return staleActivePaths.sort((a, b) => a.localeCompare(b));
}

function resolveInstallAndProfile(
  server: Pick<BattlEyeConfigSource, 'installPath' | 'profilePath'>,
  platform: NodeJS.Platform,
): { installReal: string; profileSegments: string[] } {
  const pathImpl = getPlatformPathImpl(platform);
  const installLexical = validateLexicalCandidate(server.installPath, platform);
  if (!installLexical.valid || !isHostAbsolutePath(installLexical.trimmed, platform)) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Installation path must be a valid host-absolute filesystem path.',
    );
  }

  const installStat = safeStat(installLexical.trimmed);
  if (!installStat.exists || !installStat.stat.isDirectory()) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Installation directory does not exist on the host.',
    );
  }
  const installReal = safeRealpath(installLexical.trimmed);
  if (!installReal) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Failed to resolve canonical installation directory path.',
    );
  }

  const profileLexical = validateLexicalCandidate(server.profilePath, platform);
  if (!profileLexical.valid || isNonRelativeSubpath(profileLexical.trimmed, platform)) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Profile path must be relative to the installation directory.',
    );
  }
  const profileSegments = splitCleanRelativeSegments(
    profileLexical.trimmed,
    pathImpl,
    'Profile path',
  );

  return { installReal, profileSegments };
}

/**
 * Real path of the server's existing profiles directory, or `null` when it does not exist yet.
 * The profile path must stay inside the installation directory (no `..`, no symlink escape);
 * otherwise `CONFIG_PATH_INVALID` is thrown. Also used by the log reader (DSM-00206).
 */
export function resolveProfileDirectory(
  server: Pick<BattlEyeConfigSource, 'installPath' | 'profilePath'>,
  platform: NodeJS.Platform = process.platform,
): string | null {
  const { installReal, profileSegments } = resolveInstallAndProfile(server, platform);
  return verifyExistingSegmentsContained(installReal, profileSegments, platform, 'Profile path');
}

function validateAndResolveTargets(
  server: BattlEyeConfigSource,
  platform: NodeJS.Platform,
): ValidatedBattlEyeTargets {
  const pathImpl = getPlatformPathImpl(platform);
  const { installReal, profileSegments } = resolveInstallAndProfile(server, platform);
  const profileReal = verifyExistingSegmentsContained(
    installReal,
    profileSegments,
    platform,
    'Profile path',
  );

  const battleyeFilename = getBattlEyeConfigFilename(platform);
  const staleActivePaths = profileReal
    ? inspectExistingBattlEyeTargets(
        pathImpl.join(profileReal, 'BattlEye'),
        battleyeFilename,
        installReal,
        platform,
      )
    : [];

  return { platform, pathImpl, installReal, profileSegments, battleyeFilename, staleActivePaths };
}

function ensureContainedSubdirChain(
  baseReal: string,
  segments: string[],
  platform: NodeJS.Platform,
  rejectLeafSymlink: boolean,
): string {
  const pathImpl = getPlatformPathImpl(platform);
  let cursor = baseReal;

  for (let i = 0; i < segments.length; i += 1) {
    cursor = pathImpl.join(cursor, segments[i]);
    const isLast = i === segments.length - 1;
    const lstat = safeLstat(cursor);
    if (!lstat.exists) {
      fs.mkdirSync(cursor);
    } else if (rejectLeafSymlink && isLast && lstat.stat.isSymbolicLink()) {
      throw new ConfigStorageError(
        'CONFIG_PATH_INVALID',
        'Target configuration subdirectory must not be a symbolic link.',
      );
    }
    const resolved = safeRealpath(cursor);
    if (
      !resolved ||
      !isPathContainedWithin(resolved, baseReal, platform, false) ||
      !fs.statSync(resolved).isDirectory()
    ) {
      throw new ConfigStorageError(
        'CONFIG_PATH_INVALID',
        'Provisioned directory escaped installation directory boundaries.',
      );
    }
    cursor = resolved;
  }

  return cursor;
}

function executeValidatedSync(
  server: BattlEyeConfigSource,
  content: string,
  targets: ValidatedBattlEyeTargets,
  backupRootDir: string | undefined,
): SyncBattlEyeConfigResponseDto {
  const backupPaths: string[] = [];
  const staleActiveFilesRemoved: string[] = [];

  const profileReal = ensureContainedSubdirChain(
    targets.installReal,
    targets.profileSegments,
    targets.platform,
    false,
  );
  const battleyeReal = ensureContainedSubdirChain(
    profileReal,
    ['BattlEye'],
    targets.platform,
    true,
  );
  const battleyeCfgPath = targets.pathImpl.join(battleyeReal, targets.battleyeFilename);

  const battleyeResult = writeFileAtomically({
    targetPath: battleyeCfgPath,
    content,
    serverId: server.id,
    fileName: targets.battleyeFilename,
    backupRootDir,
    platform: targets.platform,
    mode: 0o600,
  });
  if (battleyeResult.backupPath) {
    backupPaths.push(battleyeResult.backupPath);
  }

  for (const stalePath of targets.staleActivePaths) {
    const staleBackup = backupAndRemoveFile({
      targetPath: stalePath,
      serverId: server.id,
      fileName: targets.pathImpl.basename(stalePath),
      backupRootDir,
      platform: targets.platform,
    });
    if (staleBackup) {
      backupPaths.push(staleBackup);
    }
    staleActiveFilesRemoved.push(stalePath);
  }

  return syncBattlEyeConfigResponseSchema.parse({
    serverId: server.id,
    syncedAt: new Date().toISOString(),
    battleyeCfgPath,
    battleyeCfgWritten: battleyeResult.written,
    staleActiveFilesRemoved,
    backupPaths,
  });
}

export class BattlEyeConfigService {
  syncBattlEyeConfig(
    server: BattlEyeConfigSource,
    rconPassword: string | null,
    options: BattlEyeSyncOptions = {},
  ): SyncBattlEyeConfigResponseDto {
    if (isServerActiveStatus(server.status)) {
      throw new ConfigStorageError(
        'SERVER_RUNNING_CONFIG_LOCKED',
        `Cannot synchronize configuration while "${server.name}" is ${server.status}.`,
      );
    }
    if (rconPassword === null || rconPassword === '') {
      throw new ConfigStorageError(
        'CONFIG_RCON_PASSWORD_REQUIRED',
        'An RCON password must be configured before syncing BattlEye configuration.',
      );
    }
    // Rendering validates the credentials, so nothing touches the filesystem when they are invalid.
    const content = renderBattlEyeCfg(server, rconPassword);
    const targets = validateAndResolveTargets(server, options.platform ?? process.platform);
    return executeValidatedSync(server, content, targets, options.backupRootDir);
  }

  tryAutoSyncOnSave(
    server: BattlEyeConfigSource,
    rconPassword: string | null,
    options: BattlEyeSyncOptions = {},
  ): SyncBattlEyeConfigResponseDto | null {
    if (isServerActiveStatus(server.status) || rconPassword === null || rconPassword === '') {
      return null;
    }

    const platform = options.platform ?? process.platform;
    const installLexical = validateLexicalCandidate(server.installPath, platform);
    if (!installLexical.valid || !isHostAbsolutePath(installLexical.trimmed, platform)) {
      return null;
    }
    const installStat = safeStat(installLexical.trimmed);
    if (!installStat.exists || !installStat.stat.isDirectory()) {
      return null;
    }

    try {
      const content = renderBattlEyeCfg(server, rconPassword);
      const targets = validateAndResolveTargets(server, platform);
      return executeValidatedSync(server, content, targets, options.backupRootDir);
    } catch (err) {
      const errorCode = err instanceof ConfigStorageError ? err.errorCode : 'CONFIG_WRITE_FAILED';
      const message = err instanceof Error ? err.message : 'Unknown auto-sync error';
      options.logger?.warn(
        { serverId: server.id, errorCode, message },
        'Best-effort BattlEye config auto-sync skipped after server save',
      );
      return null;
    }
  }
}

export const battlEyeConfigService = new BattlEyeConfigService();
