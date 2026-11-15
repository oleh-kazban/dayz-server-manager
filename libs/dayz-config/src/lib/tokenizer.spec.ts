import { configDiagnosticSchema } from '@aegis/api-contracts';

import { decodeStringToken, tokenize } from './tokenizer';

function kindsAndTexts(text: string): [string, string][] {
  return tokenize(text).tokens.map(token => [token.kind, token.text]);
}

describe('tokenize', () => {
  it('emits every punctuation, identifier, number, string and comment token with source offsets', () => {
    const text = 'class A: B { motd[] = {"x", 1}; };';
    expect(kindsAndTexts(text)).toEqual([
      ['identifier', 'class'],
      ['identifier', 'A'],
      ['colon', ':'],
      ['identifier', 'B'],
      ['lbrace', '{'],
      ['identifier', 'motd'],
      ['brackets', '[]'],
      ['equals', '='],
      ['lbrace', '{'],
      ['string', '"x"'],
      ['comma', ','],
      ['number', '1'],
      ['rbrace', '}'],
      ['semicolon', ';'],
      ['rbrace', '}'],
      ['semicolon', ';'],
    ]);
    const { tokens, diagnostics } = tokenize(text);
    expect(diagnostics).toEqual([]);
    for (const token of tokens) {
      expect(text.slice(token.start, token.end)).toBe(token.text);
    }
  });

  it('reports 1-based line and column positions across CRLF and LF line breaks', () => {
    const { tokens } = tokenize('a=1;\r\n  b=2;\n\tc');
    const positions = tokens
      .filter(token => token.kind === 'identifier')
      .map(({ text, line, column }) => ({ text, line, column }));
    expect(positions).toEqual([
      { text: 'a', line: 1, column: 1 },
      { text: 'b', line: 2, column: 3 },
      { text: 'c', line: 3, column: 2 },
    ]);
  });

  it.each([
    ['42', '42'],
    ['-7', '-7'],
    ['+3', '+3'],
    ['0.5', '0.5'],
    ['.25', '.25'],
    ['-.5', '-.5'],
    ['12.', '12.'],
    ['1e3', '1e3'],
    ['2.5E-2', '2.5E-2'],
  ])('tokenizes the number literal %s', (text, expected) => {
    expect(kindsAndTexts(text)).toEqual([['number', expected]]);
  });

  it('treats a sign that is not followed by a digit as an unexpected character', () => {
    const { tokens, diagnostics } = tokenize('a = -x; b = +.y; +');
    expect(tokens.map(token => token.text)).toEqual(['a', '=', 'x', ';', 'b', '=', 'y', ';']);
    expect(diagnostics.map(d => [d.code, d.column])).toEqual([
      ['UNEXPECTED_CHARACTER', 5],
      ['UNEXPECTED_CHARACTER', 13],
      ['UNEXPECTED_CHARACTER', 14],
      ['UNEXPECTED_CHARACTER', 18],
    ]);
  });

  it('reports a lone opening bracket and other unknown characters without emitting tokens', () => {
    const { tokens, diagnostics } = tokenize('a[ = 1; @');
    expect(tokens.map(token => token.kind)).toEqual([
      'identifier',
      'equals',
      'number',
      'semicolon',
    ]);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNEXPECTED_CHARACTER',
        message: "Unexpected character '['",
        column: 2,
      }),
      expect.objectContaining({
        code: 'UNEXPECTED_CHARACTER',
        message: "Unexpected character '@'",
        column: 9,
      }),
    ]);
  });

  it('keeps line comments up to, but excluding, CR and LF', () => {
    const { tokens } = tokenize('a=1; // first\r\nb=2; // second\nc=3; // last');
    expect(tokens.filter(token => token.kind === 'comment').map(token => token.text)).toEqual([
      '// first',
      '// second',
      '// last',
    ]);
  });

  it('keeps block comments across lines and continues tokenizing after them', () => {
    expect(kindsAndTexts('/* a\r\n b */x')).toEqual([
      ['comment', '/* a\r\n b */'],
      ['identifier', 'x'],
    ]);
  });

  it('reports an unterminated block comment at its opening and swallows the rest of the file', () => {
    const text = 'maxPlayers = 10;\n/* note\nsteamQueryPort = 2305;\n';
    const { tokens, diagnostics } = tokenize(text);
    expect(tokens.at(-1)).toMatchObject({ kind: 'comment', end: text.length });
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        code: 'UNTERMINATED_COMMENT',
        message: 'Block comment is not closed with */',
        line: 2,
        column: 1,
        endLine: 2,
        endColumn: 3,
      },
    ]);
    expect(configDiagnosticSchema.safeParse(diagnostics[0]).success).toBe(true);
  });

  it('tokenizes strings with doubled-quote escapes as a single token', () => {
    expect(kindsAndTexts('"say ""hi"""')).toEqual([['string', '"say ""hi"""']]);
  });

  it.each([
    { name: 'LF', text: 'hostname = "abc\nx', end: 15 },
    { name: 'CR', text: 'hostname = "abc\r\nx', end: 15 },
    { name: 'end of file', text: 'hostname = "abc', end: 15 },
  ])('marks a string interrupted by $name as unterminated', ({ text, end }) => {
    const { tokens, diagnostics } = tokenize(text);
    expect(tokens[2]).toMatchObject({
      kind: 'string',
      text: '"abc',
      start: 11,
      end,
      unterminated: true,
    });
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        code: 'UNTERMINATED_STRING',
        message: 'String is not closed with a double quote',
        line: 1,
        column: 12,
        endLine: 1,
        endColumn: 16,
      },
    ]);
  });
});

describe('decodeStringToken', () => {
  it.each([
    ['"plain"', 'plain'],
    ['""', ''],
    ['"say ""hi"""', 'say "hi"'],
    ['""""', '"'],
    ['"unterminated', 'unterminated'],
  ])('decodes %s to %j', (raw, expected) => {
    expect(decodeStringToken(raw)).toBe(expected);
  });
});
