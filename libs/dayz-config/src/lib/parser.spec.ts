import { configDiagnosticSchema } from '@aegis/api-contracts';

import {
  FAKE_ADMIN_PASSWORD,
  STOCK_SERVER_DZ_CRLF,
  STOCK_SERVER_DZ_LF,
} from './fixtures/stock-server-dz.fixture';
import { parseServerConfig } from './parser';
import type { ConfigAssignment, ConfigClassBlock, ConfigEntry, ScalarValue } from './types';

type DiagnosticTuple = [
  code: string,
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
];

function diagnosticsOf(text: string): DiagnosticTuple[] {
  return parseServerConfig(text).diagnostics.map(d => [
    d.code,
    d.line,
    d.column,
    d.endLine,
    d.endColumn,
  ]);
}

function codesOf(text: string): string[] {
  return parseServerConfig(text).diagnostics.map(d => d.code);
}

function entriesOf(text: string): ConfigEntry[] {
  return parseServerConfig(text).document.entries;
}

function assignment(entry: ConfigEntry | undefined): ConfigAssignment {
  if (entry?.type !== 'assignment') {
    throw new Error(`Expected an assignment, got ${entry?.type}`);
  }
  return entry;
}

function classBlock(entry: ConfigEntry | undefined): ConfigClassBlock {
  if (entry?.type !== 'class') {
    throw new Error(`Expected a class, got ${entry?.type}`);
  }
  return entry;
}

function scalarValues(entry: ConfigEntry | undefined): unknown {
  const { value } = assignment(entry);
  if (value === null) {
    return null;
  }
  return Array.isArray(value) ? value.map(item => item.value) : (value as ScalarValue).value;
}

describe('parseServerConfig — stock serverDZ.cfg', () => {
  it.each([
    ['CRLF', STOCK_SERVER_DZ_CRLF],
    ['LF', STOCK_SERVER_DZ_LF],
  ])('parses the %s stock file with zero errors and only the duplicate motd warning', (_, text) => {
    const { document, diagnostics } = parseServerConfig(text);
    expect(document.text).toBe(text);
    expect(diagnostics).toEqual([
      {
        severity: 'warning',
        code: 'DUPLICATE_SETTING',
        message: "'motd' is already defined on line 37",
        line: 38,
        column: 1,
        endLine: 38,
        endColumn: 5,
      },
    ]);
    expect(diagnostics.every(d => configDiagnosticSchema.safeParse(d).success)).toBe(true);
  });

  it('builds typed values for strings, numbers, bare words and arrays', () => {
    const entries = entriesOf(STOCK_SERVER_DZ_CRLF);
    const byKey = (key: string) =>
      entries.filter((e): e is ConfigAssignment => e.type === 'assignment' && e.key === key);

    expect(scalarValues(byKey('hostname')[0])).toBe('EXAMPLE NAME');
    expect(scalarValues(byKey('steamQueryPort')[0])).toBe(2305);
    expect(byKey('storeHouseStateDisabled')[0].value).toMatchObject({
      kind: 'word',
      value: 'false',
    });
    expect(byKey('motd').map(scalarValues)).toEqual([[], ['a', 'b']]);
    expect(byKey('motd').every(entry => entry.isArray)).toBe(true);

    const missions = classBlock(entries.at(-1));
    expect(missions.name).toBe('Missions');
    const dayz = classBlock(missions.entries[0]);
    expect(dayz.name).toBe('DayZ');
    expect(scalarValues(dayz.entries[0])).toBe('dayzOffline.chernarusplus');
  });

  it('records source ranges that slice back to the exact original bytes', () => {
    const text = STOCK_SERVER_DZ_CRLF;
    const admin = assignment(
      entriesOf(text).find(e => e.type === 'assignment' && e.key === 'passwordAdmin'),
    );
    expect(text.slice(admin.keyRange.start, admin.keyRange.end)).toBe('passwordAdmin');
    expect(text.slice(admin.valueRange.start, admin.valueRange.end)).toBe(
      `"${FAKE_ADMIN_PASSWORD}"`,
    );
    expect(text.slice(admin.statementRange.start, admin.statementRange.end)).toBe(
      `passwordAdmin = "${FAKE_ADMIN_PASSWORD}";`,
    );

    const missions = classBlock(entriesOf(text).at(-1));
    expect(text.slice(missions.range.start, missions.range.end)).toMatch(
      /^class Missions\r\n\{[\s\S]*\};$/,
    );
  });
});

describe('parseServerConfig — syntax refusals', () => {
  it('reports a missing semicolon at the end of the previous line', () => {
    const text = 'hostname = "a"\nmaxPlayers = 10;\n';
    expect(diagnosticsOf(text)).toEqual([['MISSING_SEMICOLON', 1, 15, 1, 15]]);
    const [hostname, maxPlayers] = entriesOf(text).map(assignment);
    expect(hostname.statementRange).toEqual({ start: 0, end: 14 });
    expect(scalarValues(hostname)).toBe('a');
    expect(scalarValues(maxPlayers)).toBe(10);
  });

  it.each([
    {
      name: 'end of file',
      text: 'maxPlayers = 10',
      expected: [['MISSING_SEMICOLON', 1, 16, 1, 16]],
    },
    {
      name: 'a closing brace',
      text: 'class A { x = 1 };',
      expected: [['MISSING_SEMICOLON', 1, 16, 1, 16]],
    },
    {
      name: 'a statement on the same line',
      text: 'a = 1 b = 2;',
      expected: [['MISSING_SEMICOLON', 1, 6, 1, 6]],
    },
  ])('reports a missing semicolon before $name', ({ text, expected }) => {
    expect(diagnosticsOf(text)).toEqual(expected);
  });

  it('reports an unclosed class at its header and extends its range to the end of the file', () => {
    const text = 'class Missions\n{\n\tclass DayZ\n\t{\n\t\ttemplate="x";\n\t};\n';
    expect(diagnosticsOf(text)).toEqual([['UNCLOSED_CLASS', 1, 1, 1, 15]]);
    const missions = classBlock(entriesOf(text)[0]);
    expect(missions.range).toEqual({ start: 0, end: text.length });
    expect(classBlock(missions.entries[0]).name).toBe('DayZ');
  });

  it('reports an unterminated string once, without a cascading missing-semicolon error', () => {
    const text = 'hostname = "abc\nmaxPlayers = 10;\n';
    expect(diagnosticsOf(text)).toEqual([['UNTERMINATED_STRING', 1, 12, 1, 16]]);
    expect(entriesOf(text).map(e => assignment(e).key)).toEqual(['hostname', 'maxPlayers']);
  });

  it('reports an unterminated block comment once and ignores everything after it', () => {
    const text = 'maxPlayers = 10;\n/* note\nsteamQueryPort = 2305;\n';
    expect(diagnosticsOf(text)).toEqual([['UNTERMINATED_COMMENT', 2, 1, 2, 3]]);
    expect(entriesOf(text).map(e => assignment(e).key)).toEqual(['maxPlayers']);
  });

  it.each([
    { name: 'with', text: 'maxPlayers = 10;\n};\nsteamQueryPort = 2305;\n' },
    { name: 'without', text: 'maxPlayers = 10;\n}\nsteamQueryPort = 2305;\n' },
  ])('reports a stray closing brace $name a semicolon and keeps parsing', ({ text }) => {
    expect(diagnosticsOf(text)).toEqual([['UNEXPECTED_CLOSING_BRACE', 2, 1, 2, 2]]);
    expect(entriesOf(text).map(e => assignment(e).key)).toEqual(['maxPlayers', 'steamQueryPort']);
  });

  it('recovers after each typo so that every typo yields exactly one diagnostic', () => {
    const text = [
      'hostname = "a"',
      'maxPlayers 10;',
      'steamQueryPort = 2305;',
      'verifySignatures = 2 3;',
      'motd[] = {"a" "b"};',
      '',
    ].join('\n');
    expect(diagnosticsOf(text)).toEqual([
      ['MISSING_SEMICOLON', 1, 15, 1, 15],
      ['MISSING_EQUALS', 2, 1, 2, 11],
      ['UNEXPECTED_TOKEN', 4, 22, 4, 23],
      ['UNEXPECTED_TOKEN', 5, 15, 5, 18],
    ]);
    const entries = entriesOf(text);
    expect(entries.map(e => [assignment(e).key, scalarValues(e)])).toEqual([
      ['hostname', 'a'],
      ['maxPlayers', null],
      ['steamQueryPort', 2305],
      ['verifySignatures', null],
      ['motd', ['a', 'b']],
    ]);
  });

  it('sorts lexical and syntax diagnostics together by line, then column', () => {
    expect(diagnosticsOf('a = 1\nb = "open')).toEqual([
      ['MISSING_SEMICOLON', 1, 6, 1, 6],
      ['UNTERMINATED_STRING', 2, 5, 2, 10],
    ]);
    expect(codesOf('a = 1 2 @;')).toEqual(['UNEXPECTED_TOKEN', 'UNEXPECTED_CHARACTER']);
  });
});

describe('parseServerConfig — assignments', () => {
  it.each([
    { name: 'a semicolon', text: 'foo;', valueRange: { start: 3, end: 3 }, end: 4 },
    { name: 'the next statement', text: 'foo\nbar = 1;', valueRange: { start: 3, end: 3 }, end: 3 },
    { name: 'end of file', text: 'foo', valueRange: { start: 3, end: 3 }, end: 3 },
    { name: 'skipped junk', text: 'foo bar baz;', valueRange: { start: 4, end: 11 }, end: 12 },
  ])('reports a missing equals sign followed by $name', ({ text, valueRange, end }) => {
    const { diagnostics, document } = parseServerConfig(text);
    expect(diagnostics[0]).toMatchObject({
      code: 'MISSING_EQUALS',
      message: "Expected '=' after 'foo'",
      line: 1,
      column: 1,
      endColumn: 4,
    });
    expect(diagnostics).toHaveLength(1);
    const foo = assignment(document.entries[0]);
    expect(foo.value).toBeNull();
    expect(foo.valueRange).toEqual(valueRange);
    expect(foo.statementRange).toEqual({ start: 0, end });
  });

  it('reports a missing value once when the semicolon is present', () => {
    expect(diagnosticsOf('a = ;')).toEqual([['MISSING_VALUE', 1, 3, 1, 4]]);
    expect(assignment(entriesOf('a = ;')[0]).valueRange).toEqual({ start: 3, end: 3 });
  });

  it.each([
    { name: 'end of file', text: 'a =' },
    { name: 'the next statement', text: 'a =\nb = 1;' },
    { name: 'a closing brace', text: 'class A { a = };' },
  ])('reports a missing value and semicolon before $name', ({ text }) => {
    expect(codesOf(text)).toEqual(['MISSING_VALUE', 'MISSING_SEMICOLON']);
  });

  it('rejects a non-scalar value token and discards the statement value', () => {
    expect(diagnosticsOf('a = ,;')).toEqual([['UNEXPECTED_TOKEN', 1, 5, 1, 6]]);
    const a = assignment(entriesOf('a = ,;')[0]);
    expect(a.value).toBeNull();
    expect(a.valueRange).toEqual({ start: 4, end: 5 });
    expect(a.statementRange).toEqual({ start: 0, end: 6 });
  });

  it('keeps the original value start when trailing junk runs to the end of the file', () => {
    const a = assignment(entriesOf('a = 1 2')[0]);
    expect(codesOf('a = 1 2')).toEqual(['UNEXPECTED_TOKEN']);
    expect(a.value).toBeNull();
    expect(a.valueRange).toEqual({ start: 4, end: 7 });
    expect(a.statementRange).toEqual({ start: 0, end: 7 });
  });

  it('parses a key named "class" as an ordinary assignment', () => {
    const text = 'class = 1;';
    expect(diagnosticsOf(text)).toEqual([]);
    expect(assignment(entriesOf(text)[0]).key).toBe('class');
  });

  it('ignores empty statements', () => {
    expect(parseServerConfig(';;').diagnostics).toEqual([]);
    expect(entriesOf(';;')).toEqual([]);
  });

  it.each([
    { name: 'a number', text: '42;\nb = 1;', message: "Unexpected '42'" },
    { name: 'an equals sign', text: '= 5;\nb = 1;', message: "Unexpected '='" },
  ])('reports $name at statement start and resumes at the next statement', ({ text, message }) => {
    const { diagnostics, document } = parseServerConfig(text);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'UNEXPECTED_TOKEN', message, line: 1, column: 1 }),
    ]);
    expect(document.entries.map(e => assignment(e).key)).toEqual(['b']);
  });

  it('stops statement recovery at a closing brace', () => {
    expect(codesOf('5 }')).toEqual(['UNEXPECTED_TOKEN', 'UNEXPECTED_CLOSING_BRACE']);
  });
});

describe('parseServerConfig — arrays', () => {
  it('accepts a trailing comma', () => {
    expect(diagnosticsOf('motd[] = {"a", "b",};')).toEqual([]);
    expect(scalarValues(entriesOf('motd[] = {"a", "b",};')[0])).toEqual(['a', 'b']);
  });

  it('reports braces without [] on the key but keeps the array value', () => {
    expect(diagnosticsOf('motd = {"a"};')).toEqual([['ARRAY_BRACKETS_MISMATCH', 1, 1, 1, 5]]);
    expect(scalarValues(entriesOf('motd = {"a"};')[0])).toEqual(['a']);
  });

  it('reports [] on the key with a scalar value', () => {
    expect(diagnosticsOf('motd[] = "a";')).toEqual([['ARRAY_BRACKETS_MISMATCH', 1, 10, 1, 13]]);
  });

  it('reports an array cut off by a semicolon at its opening brace', () => {
    expect(diagnosticsOf('motd[] = {"a";')).toEqual([['UNCLOSED_ARRAY', 1, 10, 1, 11]]);
    const motd = assignment(entriesOf('motd[] = {"a";')[0]);
    expect(scalarValues(motd)).toEqual(['a']);
    expect(motd.valueRange).toEqual({ start: 9, end: 13 });
  });

  it.each([
    { name: 'the next statement', text: 'motd[] = {"a"\nb = 1;' },
    { name: 'end of file', text: 'motd[] = {"a"' },
    { name: 'a statement after a missing comma', text: 'x[] = {1 y = 2;' },
  ])('reports an unclosed array and missing semicolon before $name', ({ text }) => {
    expect(codesOf(text)).toEqual(['UNCLOSED_ARRAY', 'MISSING_SEMICOLON']);
  });

  it.each([
    { text: 'x[] = {1, {2, 3}, 4};', items: [1, 4] },
    { text: 'x[] = {{1, {2}}, 3};', items: [3] },
  ])('reports nested arrays once and skips them in $text', ({ text, items }) => {
    expect(codesOf(text)).toEqual(['NESTED_ARRAY_UNSUPPORTED']);
    expect(scalarValues(entriesOf(text)[0])).toEqual(items);
  });

  it('stops skipping an unclosed nested array at a semicolon', () => {
    expect(diagnosticsOf('x[] = {1, {2;')).toEqual([
      ['UNCLOSED_ARRAY', 1, 7, 1, 8],
      ['NESTED_ARRAY_UNSUPPORTED', 1, 11, 1, 12],
    ]);
  });

  it('stops skipping an unclosed nested array at the end of the file', () => {
    expect(diagnosticsOf('x[] = {{1')).toEqual([
      ['UNCLOSED_ARRAY', 1, 7, 1, 8],
      ['NESTED_ARRAY_UNSUPPORTED', 1, 8, 1, 9],
      ['MISSING_SEMICOLON', 1, 10, 1, 10],
    ]);
  });

  it('reports a stray token inside an array and keeps the remaining items', () => {
    expect(diagnosticsOf('x[] = {1, :2};')).toEqual([['UNEXPECTED_TOKEN', 1, 11, 1, 12]]);
    expect(scalarValues(entriesOf('x[] = {1, :2};')[0])).toEqual([1, 2]);
  });
});

describe('parseServerConfig — classes', () => {
  it('accepts inheritance from a base class', () => {
    const text = 'class A: B { x = 1; };';
    expect(diagnosticsOf(text)).toEqual([]);
    const a = classBlock(entriesOf(text)[0]);
    expect(a.name).toBe('A');
    expect(a.range).toEqual({ start: 0, end: text.length });
    expect(assignment(a.entries[0]).key).toBe('x');
  });

  it('reports a missing base class name after a colon', () => {
    expect(diagnosticsOf('class A: { x = 1; };')).toEqual([['MISSING_CLASS_NAME', 1, 8, 1, 9]]);
  });

  it('accepts a forward declaration without a body', () => {
    expect(diagnosticsOf('class A;')).toEqual([]);
    expect(classBlock(entriesOf('class A;')[0])).toMatchObject({
      entries: [],
      range: { start: 0, end: 8 },
    });
  });

  it('reports a missing class body and resumes at the following statement', () => {
    const text = 'class A x = 1;';
    expect(diagnosticsOf(text)).toEqual([['MISSING_CLASS_BODY', 1, 7, 1, 8]]);
    expect(entriesOf(text).map(e => assignment(e).key)).toEqual(['x']);
  });

  it('reports a missing class body at the end of the file', () => {
    expect(codesOf('class A')).toEqual(['MISSING_CLASS_BODY']);
    expect(entriesOf('class A')).toEqual([]);
  });

  it("reports a missing ';' after a class closing brace", () => {
    const text = 'class A { x = 1; }';
    expect(diagnosticsOf(text)).toEqual([['MISSING_SEMICOLON', 1, 18, 1, 19]]);
    expect(classBlock(entriesOf(text)[0]).range).toEqual({ start: 0, end: 18 });
  });
});

describe('parseServerConfig — duplicates', () => {
  it('warns about case-insensitive duplicate assignments at the later key', () => {
    expect(parseServerConfig('maxPlayers=1;\nMAXPLAYERS=2;').diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'DUPLICATE_SETTING',
        message: "'MAXPLAYERS' is already defined on line 1",
        line: 2,
        column: 1,
      }),
    ]);
  });

  it('warns about duplicate classes and duplicates inside a class', () => {
    expect(diagnosticsOf('class A {};\nclass a { x = 1;\nx = 2; };')).toEqual([
      ['DUPLICATE_SETTING', 2, 7, 2, 8],
      ['DUPLICATE_SETTING', 3, 1, 3, 2],
    ]);
  });

  it('does not treat a class and an assignment with the same name as duplicates', () => {
    expect(diagnosticsOf('class x {};\nx = 1;')).toEqual([]);
  });
});
