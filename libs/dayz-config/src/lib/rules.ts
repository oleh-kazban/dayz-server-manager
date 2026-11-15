import type { ConfigDiagnosticDto } from '@aegis/api-contracts';

import { DiagnosticSink } from './diagnostics';
import { compareDiagnostics, type ParseResult, parseServerConfig } from './parser';
import { findClass, findLastAssignment } from './query';
import type { ConfigAssignment, ConfigDocument, ScalarValue } from './types';

export type SettingType =
  'string' | 'int' | 'number' | 'bool01' | 'boolLiteral' | 'enum' | 'stringArray';

export interface SettingRule {
  type: SettingType;
  min?: number;
  max?: number;
  strictRange?: boolean;
  enumValues?: readonly string[];
  recommended?: number;
  validate?: { test: (value: string) => boolean; message: string };
}

const BOOL_01: SettingRule = { type: 'bool01' };
const NON_NEGATIVE_INT: SettingRule = { type: 'int', min: 0 };
const NON_NEGATIVE_NUMBER: SettingRule = { type: 'number', min: 0 };
const STRING: SettingRule = { type: 'string' };

const SERVER_TIME_REGEX = /^(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})\/(\d{2})$/;

export function isValidServerTime(val: string): boolean {
  if (/[\r\n\0]/.test(val)) {
    return false;
  }
  if (val === 'SystemTime') {
    return true;
  }
  const match = SERVER_TIME_REGEX.exec(val);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return false;
  }
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export const SERVER_DZ_SETTING_RULES: Readonly<Record<string, SettingRule>> = {
  hostname: STRING,
  password: STRING,
  passwordAdmin: STRING,
  maxPlayers: { type: 'int', min: 1, max: 200, strictRange: true },
  motd: { type: 'stringArray' },
  motdInterval: NON_NEGATIVE_NUMBER,
  enableWhitelist: BOOL_01,
  BattlEye: BOOL_01,
  verifySignatures: { type: 'int', min: 0, max: 2, recommended: 2 },
  forceSameBuild: BOOL_01,
  guaranteedUpdates: BOOL_01,
  allowFilePatching: BOOL_01,
  steamQueryPort: { type: 'int', min: 1024, max: 65535, strictRange: true },
  maxPing: NON_NEGATIVE_INT,
  pingWarning: NON_NEGATIVE_INT,
  pingCritical: NON_NEGATIVE_INT,
  serverFpsWarning: NON_NEGATIVE_INT,
  speedhackDetection: { type: 'int', min: 1, max: 10 },
  disableVoN: BOOL_01,
  vonCodecQuality: { type: 'int', min: 0, max: 30 },
  disable3rdPerson: BOOL_01,
  disableCrosshair: BOOL_01,
  disableBaseDamage: BOOL_01,
  disableContainerDamage: BOOL_01,
  disableRespawnDialog: BOOL_01,
  respawnTime: NON_NEGATIVE_NUMBER,
  enableDebugMonitor: BOOL_01,
  disablePersonalLight: BOOL_01,
  lightingConfig: { type: 'int', min: 0, max: 2 },
  serverTime: {
    type: 'string',
    validate: {
      test: isValidServerTime,
      message: 'must be "SystemTime" or a "YYYY/MM/DD/HH/MM" timestamp',
    },
  },
  serverTimeAcceleration: { type: 'number', min: 0, max: 24 },
  serverNightTimeAcceleration: { type: 'number', min: 0.1, max: 64 },
  serverTimePersistent: BOOL_01,
  loginQueueConcurrentPlayers: { type: 'int', min: 1 },
  loginQueueMaxPlayers: { type: 'int', min: 1 },
  simulatedPlayersBatch: NON_NEGATIVE_INT,
  multithreadedReplication: BOOL_01,
  networkRangeClose: NON_NEGATIVE_NUMBER,
  networkRangeNear: NON_NEGATIVE_NUMBER,
  networkRangeFar: NON_NEGATIVE_NUMBER,
  networkRangeDistantEffect: NON_NEGATIVE_NUMBER,
  defaultVisibility: NON_NEGATIVE_NUMBER,
  defaultObjectViewDistance: NON_NEGATIVE_NUMBER,
  instanceId: NON_NEGATIVE_INT,
  shardId: STRING,
  storeHouseStateDisabled: { type: 'boolLiteral' },
  storageAutoFix: BOOL_01,
  disableMultiAccountMitigation: { type: 'boolLiteral' },
  timeStampFormat: { type: 'enum', enumValues: ['Short', 'Full'] },
  logAverageFps: NON_NEGATIVE_INT,
  logMemory: NON_NEGATIVE_INT,
  logPlayers: NON_NEGATIVE_INT,
  logFile: STRING,
  adminLogPlayerHitsOnly: BOOL_01,
  adminLogPlacement: BOOL_01,
  adminLogBuildActions: BOOL_01,
  adminLogPlayerList: BOOL_01,
  enableCfgGameplayFile: BOOL_01,
  steamProtocolMaxDataSize: NON_NEGATIVE_INT,
};

const RULE_LOOKUP = new Map(
  Object.entries(SERVER_DZ_SETTING_RULES).map(([key, rule]) => [key.toLowerCase(), rule]),
);

export function findSettingRule(key: string): SettingRule | undefined {
  return RULE_LOOKUP.get(key.toLowerCase());
}

const MISSION_TEMPLATE_PATTERN = /^\w[\w.-]*$/;

export function isValidMissionTemplate(value: string): boolean {
  return MISSION_TEMPLATE_PATTERN.test(value) && !value.includes('..');
}

interface ScalarCheck {
  sink: DiagnosticSink;
  key: string;
  rule: SettingRule;
  value: ScalarValue;
}

function checkRange({ sink, key, rule, value }: ScalarCheck, numeric: number): void {
  const { min, max } = rule;
  const belowMin = min !== undefined && numeric < min;
  const aboveMax = max !== undefined && numeric > max;
  if (belowMin || aboveMax) {
    let bounds = `at most ${max}`;
    if (min !== undefined && max !== undefined) {
      bounds = `between ${min} and ${max}`;
    } else if (min !== undefined) {
      bounds = `at least ${min}`;
    }
    sink.report(
      rule.strictRange ? 'error' : 'warning',
      'OUT_OF_RANGE',
      `'${key}' should be ${bounds}`,
      value.range,
    );
    return;
  }
  if (rule.recommended !== undefined && numeric !== rule.recommended) {
    sink.warning(
      'NON_RECOMMENDED_VALUE',
      `'${key}' is recommended to be ${rule.recommended}`,
      value.range,
    );
  }
}

function invalidType(check: ScalarCheck, expected: string): void {
  check.sink.error('INVALID_TYPE', `'${check.key}' must be ${expected}`, check.value.range);
}

function isBooleanWord(value: ScalarValue): boolean {
  return value.kind === 'word' && ['true', 'false'].includes(value.value.toLowerCase());
}

const SCALAR_CHECKS: Readonly<
  Record<Exclude<SettingType, 'stringArray'>, (c: ScalarCheck) => void>
> = {
  string: check => {
    if (check.value.kind !== 'string') {
      invalidType(check, 'a quoted string');
      return;
    }
    const { validate } = check.rule;
    if (validate && !validate.test(check.value.value)) {
      check.sink.warning('INVALID_VALUE', `'${check.key}' ${validate.message}`, check.value.range);
    }
  },
  int: check => {
    if (check.value.kind !== 'number' || !Number.isInteger(check.value.value)) {
      invalidType(check, 'a whole number');
      return;
    }
    checkRange(check, check.value.value);
  },
  number: check => {
    if (check.value.kind !== 'number') {
      invalidType(check, 'a number');
      return;
    }
    checkRange(check, check.value.value);
  },
  bool01: check => {
    const { value } = check;
    if (isBooleanWord(value)) {
      check.sink.warning('INVALID_VALUE', `'${check.key}' expects 0 or 1`, value.range);
      return;
    }
    if (value.kind !== 'number' || !Number.isInteger(value.value)) {
      invalidType(check, '0 or 1');
      return;
    }
    if (value.value !== 0 && value.value !== 1) {
      check.sink.warning('OUT_OF_RANGE', `'${check.key}' should be 0 or 1`, value.range);
    }
  },
  boolLiteral: check => {
    const { value } = check;
    if (isBooleanWord(value)) {
      return;
    }
    if (value.kind === 'number' && (value.value === 0 || value.value === 1)) {
      check.sink.warning('INVALID_VALUE', `'${check.key}' expects true or false`, value.range);
      return;
    }
    invalidType(check, 'true or false');
  },
  enum: check => {
    const { value } = check;
    const allowed = check.rule.enumValues ?? [];
    if (value.kind === 'number') {
      invalidType(check, `one of ${allowed.join(', ')}`);
      return;
    }
    const lower = value.value.toLowerCase();
    if (!allowed.some(option => option.toLowerCase() === lower)) {
      check.sink.warning(
        'INVALID_VALUE',
        `'${check.key}' should be one of ${allowed.join(', ')}`,
        value.range,
      );
    }
  },
};

function checkAssignment(sink: DiagnosticSink, assignment: ConfigAssignment): void {
  const { key, value } = assignment;
  if (value === null || assignment.isArray !== Array.isArray(value)) {
    return;
  }
  const rule = findSettingRule(key);
  if (!rule) {
    sink.warning('UNKNOWN_SETTING', `Unknown setting '${key}'`, assignment.keyRange);
    return;
  }
  if (rule.type === 'stringArray') {
    if (!Array.isArray(value)) {
      sink.error('INVALID_TYPE', `'${key}[]' must be an array of strings`, assignment.valueRange);
      return;
    }
    for (const item of value) {
      if (item.kind !== 'string') {
        sink.error('INVALID_TYPE', `'${key}[]' items must be quoted strings`, item.range);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    sink.error(
      'INVALID_TYPE',
      `'${key}' must be a single value, not an array`,
      assignment.valueRange,
    );
    return;
  }
  SCALAR_CHECKS[rule.type]({ sink, key, rule, value });
}

function checkMissionTemplate(sink: DiagnosticSink, document: ConfigDocument): void {
  const missions = findClass(document.entries, 'Missions');
  const dayz = missions && findClass(missions.entries, 'DayZ');
  const template = dayz && findLastAssignment(dayz.entries, 'template');
  if (!template) {
    sink.error(
      'MISSION_TEMPLATE_MISSING',
      'Missing mission: add class Missions { class DayZ { template = "<mission>"; }; };',
      dayz?.nameRange ?? missions?.nameRange ?? { start: 0, end: 0 },
    );
    return;
  }
  const { value } = template;
  if (value === null) {
    return;
  }
  if (Array.isArray(value) || value.kind !== 'string' || !isValidMissionTemplate(value.value)) {
    sink.error(
      'MISSION_TEMPLATE_MISSING',
      '\'template\' must be a quoted mission folder name, e.g. "dayzOffline.chernarusplus"',
      template.valueRange,
    );
  }
}

export function validateServerConfig(document: ConfigDocument): ConfigDiagnosticDto[] {
  const sink = new DiagnosticSink(document.text);
  for (const entry of document.entries) {
    if (entry.type === 'assignment') {
      checkAssignment(sink, entry);
    } else if (entry.name.toLowerCase() !== 'missions') {
      sink.warning('UNKNOWN_SETTING', `Unknown class '${entry.name}'`, entry.nameRange);
    }
  }
  checkMissionTemplate(sink, document);
  return sink.diagnostics;
}

export function analyzeServerConfig(text: string): ParseResult {
  const { document, diagnostics } = parseServerConfig(text);
  return {
    document,
    diagnostics: [...diagnostics, ...validateServerConfig(document)].sort(compareDiagnostics),
  };
}
