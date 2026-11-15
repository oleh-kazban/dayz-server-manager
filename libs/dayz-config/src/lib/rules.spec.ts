import { STOCK_SERVER_DZ_CRLF } from './fixtures/stock-server-dz.fixture';
import { parseServerConfig } from './parser';
import {
  analyzeServerConfig,
  findSettingRule,
  isValidMissionTemplate,
  isValidServerTime,
  SERVER_DZ_SETTING_RULES,
  validateServerConfig,
} from './rules';

const MISSION_BLOCK = 'class Missions { class DayZ { template = "dayzOffline.chernarusplus"; }; };';

type RuleTuple = [severity: string, code: string, message: string];

function ruleDiagnostics(setting: string): RuleTuple[] {
  const { document } = parseServerConfig(`${setting}\n${MISSION_BLOCK}`);
  return validateServerConfig(document).map(d => [d.severity, d.code, d.message]);
}

function missionDiagnostics(text: string) {
  return validateServerConfig(parseServerConfig(text).document).filter(
    d => d.code === 'MISSION_TEMPLATE_MISSING',
  );
}

describe('validateServerConfig — setting rules', () => {
  it.each<[string, RuleTuple[]]>([
    ['hostname = "My Server";', []],
    ['hostname = 5;', [['error', 'INVALID_TYPE', "'hostname' must be a quoted string"]]],
    ['serverTime = "SystemTime";', []],
    ['serverTime = "2026/06/15/14/30";', []],
    [
      'serverTime = "2026/02/30/00/00";',
      [
        [
          'warning',
          'INVALID_VALUE',
          '\'serverTime\' must be "SystemTime" or a "YYYY/MM/DD/HH/MM" timestamp',
        ],
      ],
    ],
  ])('string: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['maxPlayers = 1;', []],
    ['maxPlayers = 200;', []],
    ['maxPlayers = 0;', [['error', 'OUT_OF_RANGE', "'maxPlayers' should be between 1 and 200"]]],
    ['maxPlayers = 201;', [['error', 'OUT_OF_RANGE', "'maxPlayers' should be between 1 and 200"]]],
    ['maxPlayers = 1.5;', [['error', 'INVALID_TYPE', "'maxPlayers' must be a whole number"]]],
    ['maxPlayers = "60";', [['error', 'INVALID_TYPE', "'maxPlayers' must be a whole number"]]],
    ['steamQueryPort = 1024;', []],
    ['steamQueryPort = 65535;', []],
    [
      'steamQueryPort = 1023;',
      [['error', 'OUT_OF_RANGE', "'steamQueryPort' should be between 1024 and 65535"]],
    ],
    [
      'steamQueryPort = 65536;',
      [['error', 'OUT_OF_RANGE', "'steamQueryPort' should be between 1024 and 65535"]],
    ],
    [
      'speedhackDetection = 11;',
      [['warning', 'OUT_OF_RANGE', "'speedhackDetection' should be between 1 and 10"]],
    ],
    ['maxPing = -1;', [['warning', 'OUT_OF_RANGE', "'maxPing' should be at least 0"]]],
    [
      'loginQueueMaxPlayers = 0;',
      [['warning', 'OUT_OF_RANGE', "'loginQueueMaxPlayers' should be at least 1"]],
    ],
    ['loginQueueMaxPlayers = 100000;', []],
  ])('int: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['verifySignatures = 2;', []],
    [
      'verifySignatures = 0;',
      [['warning', 'NON_RECOMMENDED_VALUE', "'verifySignatures' is recommended to be 2"]],
    ],
    [
      'verifySignatures = 1;',
      [['warning', 'NON_RECOMMENDED_VALUE', "'verifySignatures' is recommended to be 2"]],
    ],
    [
      'verifySignatures = 3;',
      [['warning', 'OUT_OF_RANGE', "'verifySignatures' should be between 0 and 2"]],
    ],
  ])('recommended value: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['serverTimeAcceleration = 0.5;', []],
    [
      'serverTimeAcceleration = 25;',
      [['warning', 'OUT_OF_RANGE', "'serverTimeAcceleration' should be between 0 and 24"]],
    ],
    [
      'serverNightTimeAcceleration = 0.05;',
      [['warning', 'OUT_OF_RANGE', "'serverNightTimeAcceleration' should be between 0.1 and 64"]],
    ],
    [
      'serverTimeAcceleration = "fast";',
      [['error', 'INVALID_TYPE', "'serverTimeAcceleration' must be a number"]],
    ],
    ['respawnTime = -5;', [['warning', 'OUT_OF_RANGE', "'respawnTime' should be at least 0"]]],
  ])('number: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['disableVoN = 0;', []],
    ['disableVoN = 1;', []],
    ['disableVoN = true;', [['warning', 'INVALID_VALUE', "'disableVoN' expects 0 or 1"]]],
    ['disableVoN = FALSE;', [['warning', 'INVALID_VALUE', "'disableVoN' expects 0 or 1"]]],
    ['disableVoN = 2;', [['warning', 'OUT_OF_RANGE', "'disableVoN' should be 0 or 1"]]],
    ['disableVoN = 0.5;', [['error', 'INVALID_TYPE', "'disableVoN' must be 0 or 1"]]],
    ['disableVoN = "1";', [['error', 'INVALID_TYPE', "'disableVoN' must be 0 or 1"]]],
    ['disableVoN = yes;', [['error', 'INVALID_TYPE', "'disableVoN' must be 0 or 1"]]],
  ])('bool01: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['storeHouseStateDisabled = true;', []],
    ['storeHouseStateDisabled = False;', []],
    [
      'storeHouseStateDisabled = 1;',
      [['warning', 'INVALID_VALUE', "'storeHouseStateDisabled' expects true or false"]],
    ],
    [
      'storeHouseStateDisabled = 0;',
      [['warning', 'INVALID_VALUE', "'storeHouseStateDisabled' expects true or false"]],
    ],
    [
      'storeHouseStateDisabled = 2;',
      [['error', 'INVALID_TYPE', "'storeHouseStateDisabled' must be true or false"]],
    ],
    [
      'storeHouseStateDisabled = "true";',
      [['error', 'INVALID_TYPE', "'storeHouseStateDisabled' must be true or false"]],
    ],
  ])('boolLiteral: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['timeStampFormat = "Short";', []],
    ['timeStampFormat = "full";', []],
    ['timeStampFormat = Full;', []],
    [
      'timeStampFormat = "Medium";',
      [['warning', 'INVALID_VALUE', "'timeStampFormat' should be one of Short, Full"]],
    ],
    [
      'timeStampFormat = 1;',
      [['error', 'INVALID_TYPE', "'timeStampFormat' must be one of Short, Full"]],
    ],
  ])('enum: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it.each<[string, RuleTuple[]]>([
    ['motd[] = {};', []],
    ['motd[] = {"Welcome", "Have fun"};', []],
    [
      'motd[] = {"ok", 1, word};',
      [
        ['error', 'INVALID_TYPE', "'motd[]' items must be quoted strings"],
        ['error', 'INVALID_TYPE', "'motd[]' items must be quoted strings"],
      ],
    ],
    ['motd = "single";', [['error', 'INVALID_TYPE', "'motd[]' must be an array of strings"]]],
    [
      'maxPlayers[] = {60};',
      [['error', 'INVALID_TYPE', "'maxPlayers' must be a single value, not an array"]],
    ],
  ])('stringArray / array shape: %s', (setting, expected) => {
    expect(ruleDiagnostics(setting)).toEqual(expected);
  });

  it('positions a rule diagnostic on the offending value', () => {
    const { document } = parseServerConfig(`maxPlayers = 0;\n${MISSION_BLOCK}`);
    expect(validateServerConfig(document)).toEqual([
      {
        severity: 'error',
        code: 'OUT_OF_RANGE',
        message: "'maxPlayers' should be between 1 and 200",
        line: 1,
        column: 14,
        endLine: 1,
        endColumn: 15,
      },
    ]);
  });

  it('warns about unknown settings and unknown top-level classes', () => {
    expect(ruleDiagnostics('fooBar = 1;\nclass Extra {};')).toEqual([
      ['warning', 'UNKNOWN_SETTING', "Unknown setting 'fooBar'"],
      ['warning', 'UNKNOWN_SETTING', "Unknown class 'Extra'"],
    ]);
  });

  it('matches setting keys case-insensitively', () => {
    expect(ruleDiagnostics('MAXPLAYERS = 60;\nPassWord = "x";')).toEqual([]);
  });

  it('leaves values the parser already rejected to the parser', () => {
    expect(ruleDiagnostics('maxPlayers = ;')).toEqual([]);
    expect(ruleDiagnostics('motd = {"a"};')).toEqual([]);
    expect(ruleDiagnostics('maxPlayers[] = 5;')).toEqual([]);
  });
});

describe('validateServerConfig — mission template', () => {
  it('reports a missing Missions class at the start of the file', () => {
    expect(missionDiagnostics('maxPlayers = 60;')).toEqual([
      expect.objectContaining({ severity: 'error', line: 1, column: 1, endColumn: 1 }),
    ]);
  });

  it('reports a Missions class without DayZ at the Missions name', () => {
    expect(missionDiagnostics('class Missions {};')).toEqual([
      expect.objectContaining({ line: 1, column: 7, endColumn: 15 }),
    ]);
  });

  it('reports a DayZ class without a template at the DayZ name', () => {
    expect(missionDiagnostics('class Missions { class DayZ {}; };')).toEqual([
      expect.objectContaining({ line: 1, column: 24, endColumn: 28 }),
    ]);
  });

  it.each([
    'template[] = {"dayzOffline.chernarusplus"};',
    'template = 5;',
    'template = dayzOffline;',
    'template = "../evil";',
    'template = "a..b";',
    'template = "mpmissions/dayzOffline.enoch";',
    'template = ".hidden";',
    'template = "";',
  ])('rejects an invalid template value: %s', setting => {
    const text = `class Missions { class DayZ { ${setting} }; };`;
    const [diagnostic] = missionDiagnostics(text);
    expect(diagnostic).toMatchObject({
      severity: 'error',
      code: 'MISSION_TEMPLATE_MISSING',
      message:
        '\'template\' must be a quoted mission folder name, e.g. "dayzOffline.chernarusplus"',
    });
    expect(missionDiagnostics(text)).toHaveLength(1);
  });

  it('leaves a template without a value to the parser', () => {
    expect(missionDiagnostics('class Missions { class DayZ { template = ; }; };')).toEqual([]);
  });

  it('accepts class and key names in any case without an unknown-class warning', () => {
    const { document } = parseServerConfig(
      'class missions { class dayz { TEMPLATE = "dayzOffline.enoch"; }; };',
    );
    expect(validateServerConfig(document)).toEqual([]);
  });
});

describe('analyzeServerConfig', () => {
  it('reports zero errors for the stock file', () => {
    const { diagnostics } = analyzeServerConfig(STOCK_SERVER_DZ_CRLF);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(diagnostics.map(d => d.code)).toEqual(['DUPLICATE_SETTING']);
  });

  it('merges syntax and rule diagnostics sorted by position', () => {
    const { diagnostics } = analyzeServerConfig('maxPlayers = 0;\nhostname = "x"');
    expect(diagnostics.map(d => [d.code, d.line, d.column])).toEqual([
      ['MISSION_TEMPLATE_MISSING', 1, 1],
      ['OUT_OF_RANGE', 1, 14],
      ['MISSING_SEMICOLON', 2, 15],
    ]);
  });
});

describe('findSettingRule / isValidMissionTemplate', () => {
  it('looks up rules case-insensitively and returns undefined for unknown keys', () => {
    expect(findSettingRule('STEAMQUERYPORT')).toBe(SERVER_DZ_SETTING_RULES.steamQueryPort);
    expect(findSettingRule('notASetting')).toBeUndefined();
  });

  it.each([
    ['dayzOffline.chernarusplus', true],
    ['dayzOffline.enoch', true],
    ['my_mission-2', true],
    ['', false],
    ['a..b', false],
    ['..', false],
    ['-leading', false],
    ['with space', false],
    ['nested/path', false],
    ['nested\\path', false],
  ])('isValidMissionTemplate(%j) is %s', (value, expected) => {
    expect(isValidMissionTemplate(value)).toBe(expected);
  });

  it.each([
    ['SystemTime', true],
    ['2026/06/15/14/30', true],
    ['2024/02/29/00/00', true],
    ['2026/12/31/23/59', true],
    ['SystemTime\n', false],
    ['SystemTime\r', false],
    ['SystemTime\0', false],
    ['2026-06-15 14:30', false],
    ['0000/01/01/00/00', false],
    ['2026/00/01/00/00', false],
    ['2026/13/01/00/00', false],
    ['2026/01/00/00/00', false],
    ['2026/01/32/00/00', false],
    ['2026/01/15/24/00', false],
    ['2026/01/15/12/60', false],
    ['2025/02/29/12/00', false],
    ['2026/04/31/12/00', false],
  ])('isValidServerTime(%j) is %s', (value, expected) => {
    expect(isValidServerTime(value)).toBe(expected);
  });
});
