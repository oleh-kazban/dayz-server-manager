import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  type DiscoveredMissionDto,
  SERVER_FS_CHECK_STATUS,
  SERVER_FS_ISSUE_SEVERITY,
  SERVER_FS_PATH_TARGET,
  type ServerFsCheckStatus,
  type ServerFsDiagnosticIssueDto,
  type ServerFsPathStatusDto,
  type ServerFsPathTarget,
  type ValidateServerPathsResponseDto,
  validateServerPathsResponseSchema,
} from '@aegis/api-contracts';

type PlatformPathImpl = typeof path.win32 | typeof path.posix;

interface InspectionContext {
  platform: NodeJS.Platform;
  pathImpl: PlatformPathImpl;
  issues: ServerFsDiagnosticIssueDto[];
}

type LexicalValidationResult =
  | { valid: true; trimmed: string }
  | { valid: false; code: 'PATH_LEXICAL_INVALID' | 'PATH_PLATFORM_MISMATCH'; message: string };

type SafeStatResult = { exists: true; stat: fs.Stats } | { exists: false; errorCode?: string };

export interface InspectServerPathsInput {
  serverId: string;
  installPath: string;
  profilePath: string;
  missionPath: string;
}

function getPlatformPathImpl(platform: NodeJS.Platform): PlatformPathImpl {
  return platform === 'win32' ? path.win32 : path.posix;
}

function isHostAbsolutePath(targetPath: string, platform: NodeJS.Platform): boolean {
  return getPlatformPathImpl(platform).isAbsolute(targetPath);
}

function isNonRelativeSubpath(trimmed: string, platform: NodeJS.Platform): boolean {
  return isHostAbsolutePath(trimmed, platform) || /^[\\/]/.test(trimmed);
}

function normalizeRelativeSubpath(subpath: string, pathImpl: PlatformPathImpl): string {
  return subpath.replace(/[\\/]+/g, pathImpl.sep);
}

function validateColonPlacement(
  trimmed: string,
  platform: NodeJS.Platform,
): LexicalValidationResult {
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    return { valid: true, trimmed };
  }

  const validDriveColon =
    colonIndex === 1 && /^[a-zA-Z]:[\\/]/.test(trimmed) && trimmed.indexOf(':', 2) === -1;
  if (!validDriveColon) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Colons are only permitted in Windows drive letter prefixes.',
    };
  }

  if (platform !== 'win32') {
    return {
      valid: false,
      code: 'PATH_PLATFORM_MISMATCH',
      message: 'Windows drive letter paths are not valid on this host platform.',
    };
  }

  return { valid: true, trimmed };
}

function validateLexicalCandidate(
  rawPath: string,
  platform: NodeJS.Platform,
): LexicalValidationResult {
  if (!rawPath || typeof rawPath !== 'string') {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path must be a non-empty string.',
    };
  }

  const trimmed = rawPath.trim();
  if (trimmed.length === 0 || trimmed.length > 512) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path length must be between 1 and 512 characters.',
    };
  }

  if (trimmed.includes('\0')) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Null bytes are forbidden in paths.',
    };
  }

  if (trimmed.includes('..')) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path traversal (..) is not permitted.',
    };
  }

  const hasControlChar = Array.from(trimmed).some(ch => ch.charCodeAt(0) < 32);
  if (/[<>"|?*]/.test(trimmed) || hasControlChar) {
    return {
      valid: false,
      code: 'PATH_LEXICAL_INVALID',
      message: 'Path contains invalid filesystem characters.',
    };
  }

  return validateColonPlacement(trimmed, platform);
}

function inspectLexicalPath(
  target: ServerFsPathTarget,
  rawPath: string,
  ctx: InspectionContext,
):
  | { valid: true; configuredPath: string; trimmed: string }
  | { valid: false; configuredPath: string } {
  const isString = typeof rawPath === 'string';
  const configuredPath = isString ? rawPath : '';
  const lexical = validateLexicalCandidate(rawPath, ctx.platform);
  if (!lexical.valid) {
    ctx.issues.push({
      target,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: lexical.code,
      message: lexical.message,
      path: isString ? rawPath : null,
    });
    return { valid: false, configuredPath };
  }
  return { valid: true, configuredPath, trimmed: lexical.trimmed };
}

function isPathContainedWithin(
  candidateReal: string,
  baseReal: string,
  platform: NodeJS.Platform,
  allowEqual = false,
): boolean {
  const pathImpl = getPlatformPathImpl(platform);
  const normalizedCandidate = platform === 'win32' ? candidateReal.toLowerCase() : candidateReal;
  const normalizedBase = platform === 'win32' ? baseReal.toLowerCase() : baseReal;
  const rel = pathImpl.relative(normalizedBase, normalizedCandidate);
  if (rel === '') {
    return allowEqual;
  }
  const escapesParent = rel === '..' || rel.startsWith(`..${pathImpl.sep}`);
  return !escapesParent && !pathImpl.isAbsolute(rel);
}

function safeStat(targetPath: string): SafeStatResult {
  try {
    return { exists: true, stat: fs.statSync(targetPath) };
  } catch (err) {
    return {
      exists: false,
      errorCode: (err as NodeJS.ErrnoException).code,
    };
  }
}

function safeRealpath(targetPath: string): string | null {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

function isDirectoryReadable(dirPath: string, platform: NodeJS.Platform): boolean {
  try {
    const mode = platform === 'win32' ? fs.constants.R_OK : fs.constants.R_OK | fs.constants.X_OK;
    fs.accessSync(dirPath, mode);
    return true;
  } catch {
    return false;
  }
}

function probeDirectoryWritable(dirPath: string, pathImpl: PlatformPathImpl): boolean {
  const probeFile = pathImpl.join(dirPath, `.dsm_fs_probe_${crypto.randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    try {
      fd = fs.openSync(
        probeFile,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o600,
      );
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
      }
    }
    fs.unlinkSync(probeFile);
    return true;
  } catch {
    return false;
  }
}

function compareMissionNames(a: DiscoveredMissionDto, b: DiscoveredMissionDto): number {
  return (
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
    a.name.localeCompare(b.name, 'en')
  );
}

function inspectExecutable(
  resolvedInstall: string,
  ctx: InspectionContext,
): { executablePath: string; executablePresent: boolean; executableRunnable: boolean } {
  const expectedExeName = ctx.platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
  const executablePath = ctx.pathImpl.join(resolvedInstall, expectedExeName);
  const exeStat = safeStat(executablePath);

  if (!exeStat.exists) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'EXECUTABLE_MISSING',
      message: `Required DayZ server executable '${expectedExeName}' was not found in '${resolvedInstall}'.`,
      path: executablePath,
    });
    return { executablePath, executablePresent: false, executableRunnable: false };
  }

  if (!exeStat.stat.isFile()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'EXECUTABLE_NOT_FILE',
      message: `Expected executable '${expectedExeName}' at '${executablePath}' is not a regular file.`,
      path: executablePath,
    });
    return { executablePath, executablePresent: false, executableRunnable: false };
  }

  if (ctx.platform !== 'win32') {
    try {
      fs.accessSync(executablePath, fs.constants.X_OK);
    } catch {
      ctx.issues.push({
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
        code: 'EXECUTABLE_NOT_EXECUTABLE',
        message: `DayZ server binary '${expectedExeName}' lacks execute permissions (X_OK).`,
        path: executablePath,
      });
      return { executablePath, executablePresent: true, executableRunnable: false };
    }
  }

  return { executablePath, executablePresent: true, executableRunnable: true };
}

function inspectInstallPath(
  rawInstallPath: string,
  ctx: InspectionContext,
): { status: ServerFsPathStatusDto; resolvedInstall: string | null } {
  const lexical = inspectLexicalPath(SERVER_FS_PATH_TARGET.INSTALL_PATH, rawInstallPath, ctx);
  if (!lexical.valid) {
    return {
      status: {
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: lexical.configuredPath,
        resolvedPath: null,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: null,
        executablePath: null,
        executablePresent: false,
        executableRunnable: false,
      },
      resolvedInstall: null,
    };
  }

  if (!isHostAbsolutePath(lexical.trimmed, ctx.platform)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'INSTALL_PATH_NOT_ABSOLUTE',
      message: 'Installation path must be an absolute filesystem path.',
      path: lexical.trimmed,
    });
    return {
      status: {
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: rawInstallPath,
        resolvedPath: null,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: null,
        executablePath: null,
        executablePresent: false,
        executableRunnable: false,
      },
      resolvedInstall: null,
    };
  }

  const candidateInstall = ctx.pathImpl.resolve(lexical.trimmed);
  const expectedExeName = ctx.platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
  const installStat = safeStat(candidateInstall);

  if (!installStat.exists) {
    const isPermissionError =
      installStat.errorCode === 'EACCES' || installStat.errorCode === 'EPERM';
    const message = isPermissionError
      ? `Permission denied inspecting installation directory '${candidateInstall}'.`
      : `Installation directory '${candidateInstall}' does not exist.`;
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'INSTALL_DIR_MISSING',
      message,
      path: candidateInstall,
    });
    return {
      status: {
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: rawInstallPath,
        resolvedPath: candidateInstall,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: false,
        executablePath: ctx.pathImpl.join(candidateInstall, expectedExeName),
        executablePresent: false,
        executableRunnable: false,
      },
      resolvedInstall: null,
    };
  }

  if (!installStat.stat.isDirectory()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'INSTALL_PATH_NOT_DIRECTORY',
      message: `Installation path '${candidateInstall}' exists but is not a directory.`,
      path: candidateInstall,
    });
    return {
      status: {
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: rawInstallPath,
        resolvedPath: candidateInstall,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: true,
        isDirectory: false,
        executablePath: ctx.pathImpl.join(candidateInstall, expectedExeName),
        executablePresent: false,
        executableRunnable: false,
      },
      resolvedInstall: null,
    };
  }

  const resolvedInstall = safeRealpath(candidateInstall) ?? candidateInstall;
  if (!isDirectoryReadable(resolvedInstall, ctx.platform)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'INSTALL_DIR_MISSING',
      message: `Installation directory '${resolvedInstall}' lacks read or traverse permissions.`,
      path: resolvedInstall,
    });
    return {
      status: {
        target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
        configuredPath: rawInstallPath,
        resolvedPath: resolvedInstall,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: true,
        isDirectory: true,
        executablePath: ctx.pathImpl.join(resolvedInstall, expectedExeName),
        executablePresent: false,
        executableRunnable: false,
      },
      resolvedInstall: null,
    };
  }

  const exeCheck = inspectExecutable(resolvedInstall, ctx);
  const installValid = exeCheck.executablePresent && exeCheck.executableRunnable;

  return {
    status: {
      target: SERVER_FS_PATH_TARGET.INSTALL_PATH,
      configuredPath: rawInstallPath,
      resolvedPath: resolvedInstall,
      status: installValid ? SERVER_FS_CHECK_STATUS.VALID : SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: true,
      ...exeCheck,
    },
    resolvedInstall,
  };
}

function inspectDiscoveredMissionEntry(
  entry: fs.Dirent,
  mpmissionsReal: string,
  ctx: InspectionContext,
): DiscoveredMissionDto | null {
  if (entry.name.startsWith('.')) {
    return null;
  }
  if (!entry.isDirectory() && !entry.isSymbolicLink()) {
    return null;
  }

  const childCandidate = ctx.pathImpl.join(mpmissionsReal, entry.name);
  const childReal = safeRealpath(childCandidate);
  if (!childReal || !isPathContainedWithin(childReal, mpmissionsReal, ctx.platform, false)) {
    return null;
  }

  const childStat = safeStat(childReal);
  if (!childStat.exists || !childStat.stat.isDirectory()) {
    return null;
  }
  if (!isDirectoryReadable(childReal, ctx.platform)) {
    return null;
  }

  const initStat = safeStat(ctx.pathImpl.join(childReal, 'init.c'));
  const dbStat = safeStat(ctx.pathImpl.join(childReal, 'db'));

  return {
    name: entry.name,
    relativePath: `mpmissions/${entry.name}`,
    resolvedPath: childReal,
    hasInitScript: initStat.exists && initStat.stat.isFile(),
    hasEconomyDb: dbStat.exists && dbStat.stat.isDirectory(),
  };
}

function discoverMissions(
  resolvedInstall: string | null,
  ctx: InspectionContext,
): DiscoveredMissionDto[] {
  if (!resolvedInstall) {
    return [];
  }

  const mpmissionsCandidate = ctx.pathImpl.join(resolvedInstall, 'mpmissions');
  const mpmissionsStat = safeStat(mpmissionsCandidate);

  if (!mpmissionsStat.exists) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'MPMISSIONS_DIR_MISSING',
      message: `No 'mpmissions' directory was found under '${resolvedInstall}'.`,
      path: mpmissionsCandidate,
    });
    return [];
  }

  if (!mpmissionsStat.stat.isDirectory()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'MPMISSIONS_PATH_NOT_DIRECTORY',
      message: `Expected 'mpmissions' at '${mpmissionsCandidate}' is not a directory.`,
      path: mpmissionsCandidate,
    });
    return [];
  }

  const mpmissionsReal = safeRealpath(mpmissionsCandidate);
  if (!mpmissionsReal) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'MPMISSIONS_DIR_MISSING',
      message: `Unable to resolve 'mpmissions' directory at '${mpmissionsCandidate}'.`,
      path: mpmissionsCandidate,
    });
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(mpmissionsReal, { withFileTypes: true });
  } catch {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'MPMISSIONS_DIR_MISSING',
      message: `Unable to read 'mpmissions' directory at '${mpmissionsReal}'.`,
      path: mpmissionsReal,
    });
    return [];
  }

  const discovered: DiscoveredMissionDto[] = [];
  for (const entry of entries) {
    const mission = inspectDiscoveredMissionEntry(entry, mpmissionsReal, ctx);
    if (mission) {
      discovered.push(mission);
    }
  }

  return discovered.sort(compareMissionNames);
}

function inspectBattleyeDirectory(
  resolvedProfile: string,
  ctx: InspectionContext,
): ServerFsPathStatusDto {
  const candidateBattleye = ctx.pathImpl.join(resolvedProfile, 'BattlEye');
  const beStat = safeStat(candidateBattleye);

  if (!beStat.exists) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'BATTLEYE_DIR_MISSING',
      message: `BattlEye directory '${candidateBattleye}' does not exist yet.`,
      path: candidateBattleye,
    });
    return {
      target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
      configuredPath: candidateBattleye,
      resolvedPath: candidateBattleye,
      status: SERVER_FS_CHECK_STATUS.WARNING,
      exists: false,
      isDirectory: false,
      writable: false,
    };
  }

  if (!beStat.stat.isDirectory()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'BATTLEYE_PATH_NOT_DIRECTORY',
      message: `BattlEye path '${candidateBattleye}' exists but is not a directory.`,
      path: candidateBattleye,
    });
    return {
      target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
      configuredPath: candidateBattleye,
      resolvedPath: candidateBattleye,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: false,
      writable: false,
    };
  }

  const resolvedBattleye = safeRealpath(candidateBattleye) ?? candidateBattleye;
  const writable = probeDirectoryWritable(resolvedBattleye, ctx.pathImpl);
  if (!writable) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'BATTLEYE_DIR_NOT_WRITABLE',
      message: `BattlEye directory '${resolvedBattleye}' is not writable by the DSM service.`,
      path: resolvedBattleye,
    });
  }

  return {
    target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
    configuredPath: candidateBattleye,
    resolvedPath: resolvedBattleye,
    status: writable ? SERVER_FS_CHECK_STATUS.VALID : SERVER_FS_CHECK_STATUS.ERROR,
    exists: true,
    isDirectory: true,
    writable,
  };
}

function buildSkippedBattleyeStatus(
  baseProfilePath: string,
  pathImpl: PlatformPathImpl,
): ServerFsPathStatusDto {
  return {
    target: SERVER_FS_PATH_TARGET.BATTLEYE_PATH,
    configuredPath: pathImpl.join(baseProfilePath, 'BattlEye'),
    resolvedPath: null,
    status: SERVER_FS_CHECK_STATUS.SKIPPED,
    exists: false,
    isDirectory: null,
    writable: null,
  };
}

function inspectProfileAndBattlEye(
  rawProfilePath: string,
  resolvedInstall: string | null,
  ctx: InspectionContext,
): { profileStatus: ServerFsPathStatusDto; battleyeStatus: ServerFsPathStatusDto } {
  const lexical = inspectLexicalPath(SERVER_FS_PATH_TARGET.PROFILE_PATH, rawProfilePath, ctx);
  if (!lexical.valid) {
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: lexical.configuredPath,
        resolvedPath: null,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: null,
        writable: null,
      },
      battleyeStatus: buildSkippedBattleyeStatus(lexical.configuredPath.trim(), ctx.pathImpl),
    };
  }

  if (isNonRelativeSubpath(lexical.trimmed, ctx.platform)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'PROFILE_PATH_NOT_RELATIVE',
      message: 'Profile path must be relative to the installation path (e.g. profiles).',
      path: lexical.trimmed,
    });
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: lexical.trimmed,
        resolvedPath: null,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: null,
        writable: null,
      },
      battleyeStatus: buildSkippedBattleyeStatus(lexical.trimmed, ctx.pathImpl),
    };
  }

  if (!resolvedInstall) {
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: rawProfilePath,
        resolvedPath: null,
        status: SERVER_FS_CHECK_STATUS.SKIPPED,
        exists: false,
        isDirectory: null,
        writable: null,
      },
      battleyeStatus: buildSkippedBattleyeStatus(lexical.trimmed, ctx.pathImpl),
    };
  }

  const candidateProfile = ctx.pathImpl.resolve(
    resolvedInstall,
    normalizeRelativeSubpath(lexical.trimmed, ctx.pathImpl),
  );
  const profileStat = safeStat(candidateProfile);

  if (!profileStat.exists) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'PROFILE_DIR_MISSING',
      message: `Profile directory '${candidateProfile}' does not exist.`,
      path: candidateProfile,
    });
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: rawProfilePath,
        resolvedPath: candidateProfile,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: false,
        isDirectory: false,
        writable: false,
      },
      battleyeStatus: buildSkippedBattleyeStatus(candidateProfile, ctx.pathImpl),
    };
  }

  const installReal = safeRealpath(resolvedInstall) ?? resolvedInstall;
  const profileReal = safeRealpath(candidateProfile) ?? candidateProfile;
  if (!isPathContainedWithin(profileReal, installReal, ctx.platform, false)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'PROFILE_SYMLINK_ESCAPE',
      message: 'Profile directory resolves outside the installation directory.',
      path: profileReal,
    });
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: rawProfilePath,
        resolvedPath: profileReal,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: true,
        isDirectory: profileStat.stat.isDirectory(),
        writable: null,
      },
      battleyeStatus: buildSkippedBattleyeStatus(candidateProfile, ctx.pathImpl),
    };
  }

  if (!profileStat.stat.isDirectory()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'PROFILE_PATH_NOT_DIRECTORY',
      message: `Profile path '${candidateProfile}' exists but is not a directory.`,
      path: candidateProfile,
    });
    return {
      profileStatus: {
        target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
        configuredPath: rawProfilePath,
        resolvedPath: candidateProfile,
        status: SERVER_FS_CHECK_STATUS.ERROR,
        exists: true,
        isDirectory: false,
        writable: false,
      },
      battleyeStatus: buildSkippedBattleyeStatus(candidateProfile, ctx.pathImpl),
    };
  }

  const writable = probeDirectoryWritable(profileReal, ctx.pathImpl);
  if (!writable) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'PROFILE_DIR_NOT_WRITABLE',
      message: `Profile directory '${profileReal}' is not writable by the DSM service.`,
      path: profileReal,
    });
  }

  return {
    profileStatus: {
      target: SERVER_FS_PATH_TARGET.PROFILE_PATH,
      configuredPath: rawProfilePath,
      resolvedPath: profileReal,
      status: writable ? SERVER_FS_CHECK_STATUS.VALID : SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: true,
      writable,
    },
    battleyeStatus: inspectBattleyeDirectory(profileReal, ctx),
  };
}

function resolveMissionCandidate(
  trimmed: string,
  resolvedInstall: string | null,
  ctx: InspectionContext,
): { candidateMission: string; containmentBase: string } | null {
  if (!resolvedInstall) {
    return null;
  }
  if (!/[\\/]/.test(trimmed)) {
    return {
      candidateMission: ctx.pathImpl.resolve(resolvedInstall, 'mpmissions', trimmed),
      containmentBase: ctx.pathImpl.join(resolvedInstall, 'mpmissions'),
    };
  }
  return {
    candidateMission: ctx.pathImpl.resolve(
      resolvedInstall,
      normalizeRelativeSubpath(trimmed, ctx.pathImpl),
    ),
    containmentBase: resolvedInstall,
  };
}

function inspectMissionArtifacts(
  resolvedMission: string,
  rawMissionPath: string,
  ctx: InspectionContext,
): ServerFsPathStatusDto {
  if (!isDirectoryReadable(resolvedMission, ctx.platform)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_DIR_MISSING',
      message: `Mission directory '${resolvedMission}' lacks read or traverse permissions.`,
      path: resolvedMission,
    });
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: rawMissionPath,
      resolvedPath: resolvedMission,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: true,
      hasInitScript: null,
      hasEconomyDb: null,
    };
  }

  const initStat = safeStat(ctx.pathImpl.join(resolvedMission, 'init.c'));
  const hasInitScript = initStat.exists && initStat.stat.isFile();
  const dbStat = safeStat(ctx.pathImpl.join(resolvedMission, 'db'));
  const hasEconomyDb = dbStat.exists && dbStat.stat.isDirectory();

  if (!hasInitScript) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_INIT_SCRIPT_MISSING',
      message: `Mission directory '${resolvedMission}' is missing required 'init.c' entry script.`,
      path: resolvedMission,
    });
  }

  if (!hasEconomyDb) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.WARNING,
      code: 'MISSION_ECONOMY_DB_MISSING',
      message: `Mission directory '${resolvedMission}' does not contain a 'db/' Central Economy directory.`,
      path: resolvedMission,
    });
  }

  let status: ServerFsCheckStatus = SERVER_FS_CHECK_STATUS.VALID;
  if (!hasInitScript) {
    status = SERVER_FS_CHECK_STATUS.ERROR;
  } else if (!hasEconomyDb) {
    status = SERVER_FS_CHECK_STATUS.WARNING;
  }

  return {
    target: SERVER_FS_PATH_TARGET.MISSION_PATH,
    configuredPath: rawMissionPath,
    resolvedPath: resolvedMission,
    status,
    exists: true,
    isDirectory: true,
    hasInitScript,
    hasEconomyDb,
  };
}

function inspectMissionPath(
  rawMissionPath: string,
  resolvedInstall: string | null,
  ctx: InspectionContext,
): ServerFsPathStatusDto {
  const lexical = inspectLexicalPath(SERVER_FS_PATH_TARGET.MISSION_PATH, rawMissionPath, ctx);
  if (!lexical.valid) {
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: lexical.configuredPath,
      resolvedPath: null,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: false,
      isDirectory: null,
      hasInitScript: null,
      hasEconomyDb: null,
    };
  }

  if (isNonRelativeSubpath(lexical.trimmed, ctx.platform)) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_PATH_NOT_RELATIVE',
      message:
        'Mission path must be relative to the installation path (e.g. mpmissions\\dayzOffline.chernarusplus).',
      path: lexical.trimmed,
    });
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: lexical.trimmed,
      resolvedPath: null,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: false,
      isDirectory: null,
      hasInitScript: null,
      hasEconomyDb: null,
    };
  }

  const resolvedTarget = resolveMissionCandidate(lexical.trimmed, resolvedInstall, ctx);

  if (!resolvedTarget) {
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: rawMissionPath,
      resolvedPath: null,
      status: SERVER_FS_CHECK_STATUS.SKIPPED,
      exists: false,
      isDirectory: null,
      hasInitScript: null,
      hasEconomyDb: null,
    };
  }

  const { candidateMission, containmentBase } = resolvedTarget;
  const missionStat = safeStat(candidateMission);
  if (!missionStat.exists) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_DIR_MISSING',
      message: `Mission directory '${candidateMission}' does not exist.`,
      path: candidateMission,
    });
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: rawMissionPath,
      resolvedPath: candidateMission,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: false,
      isDirectory: false,
      hasInitScript: false,
      hasEconomyDb: false,
    };
  }

  const baseReal = safeRealpath(containmentBase);
  const missionReal = safeRealpath(candidateMission);
  if (
    baseReal &&
    missionReal &&
    !isPathContainedWithin(missionReal, baseReal, ctx.platform, false)
  ) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_SYMLINK_ESCAPE',
      message: `Mission path '${lexical.trimmed}' resolves outside the permitted DayZ installation boundary.`,
      path: missionReal,
    });
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: rawMissionPath,
      resolvedPath: missionReal,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: missionStat.stat.isDirectory(),
      hasInitScript: null,
      hasEconomyDb: null,
    };
  }

  if (!missionStat.stat.isDirectory()) {
    ctx.issues.push({
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      severity: SERVER_FS_ISSUE_SEVERITY.ERROR,
      code: 'MISSION_PATH_NOT_DIRECTORY',
      message: `Mission path '${candidateMission}' exists but is not a directory.`,
      path: candidateMission,
    });
    return {
      target: SERVER_FS_PATH_TARGET.MISSION_PATH,
      configuredPath: rawMissionPath,
      resolvedPath: candidateMission,
      status: SERVER_FS_CHECK_STATUS.ERROR,
      exists: true,
      isDirectory: false,
      hasInitScript: false,
      hasEconomyDb: false,
    };
  }

  const resolvedMission = safeRealpath(candidateMission) ?? candidateMission;
  return inspectMissionArtifacts(resolvedMission, rawMissionPath, ctx);
}

export class ServerFsInspectorService {
  public inspect(input: InspectServerPathsInput): ValidateServerPathsResponseDto {
    const platform = process.platform;
    const ctx: InspectionContext = {
      platform,
      pathImpl: getPlatformPathImpl(platform),
      issues: [],
    };

    const installResult = inspectInstallPath(input.installPath, ctx);
    const discoveredMissions = discoverMissions(installResult.resolvedInstall, ctx);
    const { profileStatus, battleyeStatus } = inspectProfileAndBattlEye(
      input.profilePath,
      installResult.resolvedInstall,
      ctx,
    );
    const missionStatus = inspectMissionPath(input.missionPath, installResult.resolvedInstall, ctx);

    const hasBlockingError = ctx.issues.some(
      issue => issue.severity === SERVER_FS_ISSUE_SEVERITY.ERROR,
    );
    const valid =
      !hasBlockingError &&
      installResult.status.status === SERVER_FS_CHECK_STATUS.VALID &&
      profileStatus.status === SERVER_FS_CHECK_STATUS.VALID &&
      (missionStatus.status === SERVER_FS_CHECK_STATUS.VALID ||
        missionStatus.status === SERVER_FS_CHECK_STATUS.WARNING);

    return validateServerPathsResponseSchema.parse({
      serverId: input.serverId,
      valid,
      platform,
      checkedAt: new Date().toISOString(),
      paths: {
        installPath: installResult.status,
        profilePath: profileStatus,
        battleyePath: battleyeStatus,
        missionPath: missionStatus,
      },
      discoveredMissions,
      issues: ctx.issues,
    });
  }
}

export const serverFsInspectorService = new ServerFsInspectorService();
