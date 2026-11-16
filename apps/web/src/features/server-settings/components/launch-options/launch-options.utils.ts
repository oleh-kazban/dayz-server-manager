import {
  LAUNCH_CPU_COUNT_RANGE,
  LAUNCH_FPS_RANGE,
  type LaunchOptionsDto,
} from '@aegis/api-contracts';

export type LaunchBooleanOption = Exclude<keyof LaunchOptionsDto, 'cpuCount' | 'limitFPS'>;

/** Form state: numeric options stay strings while typing; `''` means "engine default". */
export interface LaunchOptionsFormState extends Record<string, unknown> {
  cpuCount: string;
  limitFPS: string;
  doLogs: boolean;
  adminLog: boolean;
  netLog: boolean;
  freezeCheck: boolean;
  scriptDebug: boolean;
  filePatching: boolean;
}

export const LAUNCH_OPTION_FIELD_ERROR_KEYS = {
  cpuCount: 'launchOptions.cpuCount',
  limitFPS: 'launchOptions.limitFPS',
} as const;

export interface LaunchBooleanOptionMeta {
  key: LaunchBooleanOption;
  flag: string;
  label: string;
  description: string;
}

export const LAUNCH_BOOLEAN_OPTIONS: readonly LaunchBooleanOptionMeta[] = [
  {
    key: 'doLogs',
    flag: '-doLogs',
    label: 'Server logs',
    description: 'Write the server .RPT and script logs to the profile directory.',
  },
  {
    key: 'adminLog',
    flag: '-adminLog',
    label: 'Admin log',
    description: 'Record player connections, chat, kills, and hits in the .ADM log.',
  },
  {
    key: 'netLog',
    flag: '-netLog',
    label: 'Network log',
    description: 'Log network traffic statistics for troubleshooting desync.',
  },
  {
    key: 'freezeCheck',
    flag: '-freezeCheck',
    label: 'Freeze check',
    description: 'Stop the server and write a dump when it hangs for more than five minutes.',
  },
  {
    key: 'scriptDebug',
    flag: '-scriptDebug=true',
    label: 'Script debug',
    description: 'Extra script diagnostics. Costs performance; not for production.',
  },
  {
    key: 'filePatching',
    flag: '-filePatching',
    label: 'File patching',
    description:
      'Load unpacked, unsigned data. Development only — a security risk on live servers.',
  },
];

export function toLaunchOptionsFormState(options: LaunchOptionsDto): LaunchOptionsFormState {
  return {
    cpuCount: options.cpuCount === null ? '' : String(options.cpuCount),
    limitFPS: options.limitFPS === null ? '' : String(options.limitFPS),
    doLogs: options.doLogs,
    adminLog: options.adminLog,
    netLog: options.netLog,
    freezeCheck: options.freezeCheck,
    scriptDebug: options.scriptDebug,
    filePatching: options.filePatching,
  };
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

/** Converts form state to the API DTO. Invalid numbers pass through so validation reports them. */
export function toLaunchOptionsDto(state: LaunchOptionsFormState): LaunchOptionsDto {
  return {
    cpuCount: toOptionalNumber(state.cpuCount),
    limitFPS: toOptionalNumber(state.limitFPS),
    doLogs: state.doLogs,
    adminLog: state.adminLog,
    netLog: state.netLog,
    freezeCheck: state.freezeCheck,
    scriptDebug: state.scriptDebug,
    filePatching: state.filePatching,
  };
}

function validateRange(
  value: string,
  range: { min: number; max: number },
  label: string,
): string | null {
  const parsed = toOptionalNumber(value);
  if (parsed === null) {
    return null;
  }
  if (!Number.isInteger(parsed) || parsed < range.min || parsed > range.max) {
    return `${label} must be a whole number between ${range.min} and ${range.max}, or empty for the engine default.`;
  }
  return null;
}

export function validateLaunchOptions(state: LaunchOptionsFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const cpuError = validateRange(state.cpuCount, LAUNCH_CPU_COUNT_RANGE, 'CPU count');
  if (cpuError) {
    errors[LAUNCH_OPTION_FIELD_ERROR_KEYS.cpuCount] = cpuError;
  }
  const fpsError = validateRange(state.limitFPS, LAUNCH_FPS_RANGE, 'FPS limit');
  if (fpsError) {
    errors[LAUNCH_OPTION_FIELD_ERROR_KEYS.limitFPS] = fpsError;
  }
  return errors;
}
