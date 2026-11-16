import {
  LAUNCH_ARG_SOURCE,
  type LaunchArgSegmentDto,
  type LaunchArgSource,
  type LaunchCommandDto,
  type LaunchIssueDto,
  type LaunchModContextDto,
  type LaunchOptionsDto,
  launchOptionsSchema,
  type LaunchPlatform,
  modFolderNameSchema,
} from '@aegis/api-contracts';

import { formatModFlags } from './mods';
import {
  executableNameFor,
  isAbsoluteForPlatform,
  isSafeRelativePath,
  joinForPlatform,
} from './paths';
import { formatCommandLine } from './quote';

export const SERVER_CONFIG_FILENAME = 'serverDZ.cfg';
export const BATTLEYE_DIRECTORY_NAME = 'BattlEye';

const MIN_PORT = 1024;
const MAX_PORT = 65535;
// Final gate on every emitted element: `-flag` or `-flag=value`, where the value carries no
// control characters (NUL, CR, LF, TAB, DEL, …) or double quotes that a naive argv parser,
// a log line or a copied command could reinterpret.
// eslint-disable-next-line no-control-regex
const SAFE_ARG = /^-[A-Za-z][A-Za-z0-9]*(?:=[^\x00-\x1f\x7f"]+)?$/;
// Characters that are never acceptable inside a path that reaches the argv.
// eslint-disable-next-line no-control-regex
const UNSAFE_PATH_CHARS = /[\x00-\x1f\x7f"]/;

export interface LaunchCompileInput {
  platform: LaunchPlatform;
  /** Absolute DayZ server install directory; becomes the process working directory. */
  installPath: string;
  /** Profile directory relative to `installPath` (DSM uses `profiles`). */
  profilePath: string;
  gamePort: number;
  launchOptions: LaunchOptionsDto;
  mods: Pick<LaunchModContextDto, 'modFolders' | 'serverModFolders'> &
    Partial<Pick<LaunchModContextDto, 'missingFolderCount'>>;
}

function error(code: LaunchIssueDto['code'], message: string, field?: string): LaunchIssueDto {
  return field ? { severity: 'error', code, message, field } : { severity: 'error', code, message };
}

function warning(code: LaunchIssueDto['code'], message: string, field: string): LaunchIssueDto {
  return { severity: 'warning', code, message, field };
}

function validateInput(
  input: LaunchCompileInput,
  options: LaunchOptionsDto | null,
): LaunchIssueDto[] {
  const issues: LaunchIssueDto[] = [];
  const installPath = input.installPath.trim();

  if (
    !installPath ||
    UNSAFE_PATH_CHARS.test(installPath) ||
    installPath.split(/[\\/]+/).includes('..') ||
    !isAbsoluteForPlatform(installPath, input.platform)
  ) {
    issues.push(
      error(
        'LAUNCH_INSTALL_PATH_INVALID',
        `Installation path must be an absolute ${input.platform === 'win32' ? 'Windows' : 'Linux'} path without '..' segments or control characters.`,
        'installPath',
      ),
    );
  }

  if (UNSAFE_PATH_CHARS.test(input.profilePath) || !isSafeRelativePath(input.profilePath)) {
    issues.push(
      error(
        'LAUNCH_PROFILE_PATH_INVALID',
        'Profile directory must be a relative path inside the installation directory.',
        'profilePath',
      ),
    );
  }

  if (!Number.isInteger(input.gamePort) || input.gamePort < MIN_PORT || input.gamePort > MAX_PORT) {
    issues.push(
      error(
        'LAUNCH_PORT_INVALID',
        `Game port must be an integer between ${MIN_PORT} and ${MAX_PORT}.`,
        'gamePort',
      ),
    );
  }

  for (const folder of [...input.mods.modFolders, ...input.mods.serverModFolders]) {
    if (!modFolderNameSchema.safeParse(folder).success || folder !== folder.trim()) {
      issues.push(
        error(
          'LAUNCH_MOD_FOLDER_INVALID',
          `Mod folder '${folder}' is not a valid @folder name.`,
          'mods',
        ),
      );
    }
  }

  if (!options) {
    issues.push(error('LAUNCH_OPTION_INVALID', 'Launch options are invalid.', 'launchOptions'));
  }

  return issues;
}

function collectWarnings(input: LaunchCompileInput, options: LaunchOptionsDto): LaunchIssueDto[] {
  const issues: LaunchIssueDto[] = [];
  const missing = input.mods.missingFolderCount ?? 0;
  if (missing > 0) {
    issues.push(
      warning(
        'LAUNCH_MOD_FOLDER_MISSING',
        `${missing} enabled mod(s) have no @folder name and are not loaded.`,
        'mods',
      ),
    );
  }
  if (options.filePatching) {
    issues.push(
      warning(
        'LAUNCH_FILE_PATCHING_ENABLED',
        'File patching lets the server load unpacked, unsigned data. Use it only for development.',
        'launchOptions.filePatching',
      ),
    );
  }
  if (options.scriptDebug) {
    issues.push(
      warning(
        'LAUNCH_SCRIPT_DEBUG_ENABLED',
        'Script debug adds diagnostic output and costs performance. Not recommended in production.',
        'launchOptions.scriptDebug',
      ),
    );
  }
  return issues;
}

function buildSegments(
  input: LaunchCompileInput,
  options: LaunchOptionsDto,
): LaunchArgSegmentDto[] {
  const segments: LaunchArgSegmentDto[] = [];
  const push = (source: LaunchArgSource, arg: string) => {
    if (arg) {
      segments.push({ arg, source });
    }
  };

  const profileDir = joinForPlatform(input.platform, input.profilePath);
  push(LAUNCH_ARG_SOURCE.MANAGED, `-config=${SERVER_CONFIG_FILENAME}`);
  push(LAUNCH_ARG_SOURCE.MANAGED, `-port=${input.gamePort}`);
  push(LAUNCH_ARG_SOURCE.MANAGED, `-profiles=${profileDir}`);
  push(
    LAUNCH_ARG_SOURCE.MANAGED,
    `-BEpath=${joinForPlatform(input.platform, profileDir, BATTLEYE_DIRECTORY_NAME)}`,
  );

  const { modFlag, serverModFlag } = formatModFlags(input.mods);
  push(LAUNCH_ARG_SOURCE.MODS, modFlag);
  push(LAUNCH_ARG_SOURCE.MODS, serverModFlag);

  if (options.cpuCount !== null) {
    push(LAUNCH_ARG_SOURCE.OPERATOR, `-cpuCount=${options.cpuCount}`);
  }
  if (options.limitFPS !== null) {
    push(LAUNCH_ARG_SOURCE.OPERATOR, `-limitFPS=${options.limitFPS}`);
  }
  if (options.doLogs) push(LAUNCH_ARG_SOURCE.OPERATOR, '-doLogs');
  if (options.adminLog) push(LAUNCH_ARG_SOURCE.OPERATOR, '-adminLog');
  if (options.netLog) push(LAUNCH_ARG_SOURCE.OPERATOR, '-netLog');
  if (options.freezeCheck) push(LAUNCH_ARG_SOURCE.OPERATOR, '-freezeCheck');
  if (options.scriptDebug) push(LAUNCH_ARG_SOURCE.OPERATOR, '-scriptDebug=true');
  if (options.filePatching) push(LAUNCH_ARG_SOURCE.OPERATOR, '-filePatching');

  return segments;
}

/**
 * Compiles server state into the DayZ server process execution contract (DSM-00125).
 *
 * Pure and deterministic: the same input always yields the same output, on the server
 * (preview endpoint, process supervisor) and in the browser (live preview). Any invalid
 * input produces `ready: false` with no arguments, so nothing unsafe can be spawned.
 */
export function compileLaunchCommand(input: LaunchCompileInput): LaunchCommandDto {
  const parsedOptions = launchOptionsSchema.safeParse(input.launchOptions);
  const options = parsedOptions.success ? parsedOptions.data : null;
  const installPath = input.installPath.trim();
  const executable = installPath
    ? joinForPlatform(input.platform, installPath, executableNameFor(input.platform))
    : '';

  const errors = validateInput(input, options);
  if (errors.length > 0 || !options) {
    return {
      ready: false,
      executable,
      cwd: installPath,
      args: [],
      commandLine: '',
      segments: [],
      issues: errors,
    };
  }

  const segments = buildSegments(input, options);
  const unsafe = segments.filter(segment => !SAFE_ARG.test(segment.arg));
  if (unsafe.length > 0) {
    return {
      ready: false,
      executable,
      cwd: installPath,
      args: [],
      commandLine: '',
      segments: [],
      issues: unsafe.map(segment =>
        error('LAUNCH_ARG_UNSAFE', `Argument '${segment.arg}' contains unsafe characters.`),
      ),
    };
  }

  const args = segments.map(segment => segment.arg);
  return {
    ready: true,
    executable,
    cwd: installPath,
    args,
    commandLine: formatCommandLine(executable, args, input.platform),
    segments,
    issues: collectWarnings(input, options),
  };
}
