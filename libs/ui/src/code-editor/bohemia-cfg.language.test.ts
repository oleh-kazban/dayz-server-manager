import { type StreamParser, StringStream } from '@codemirror/language';
import { describe, expect, it } from 'vitest';

import { bohemiaCfg } from './bohemia-cfg.language';

interface CfgState {
  inBlockComment: boolean;
  expectClassName: boolean;
}

// StreamLanguage keeps the parser spec on an untyped instance field; reading it lets the
// tokenizer be exercised line by line exactly as CodeMirror drives it.
const parser = (
  bohemiaCfg().language as unknown as { streamParser: Required<StreamParser<CfgState>> }
).streamParser;

type Token = [text: string, style: string | null];

function tokenizeLine(line: string, state: CfgState): Token[] {
  const stream = new StringStream(line, 4, 2);
  const tokens: Token[] = [];
  while (!stream.eol()) {
    stream.start = stream.pos;
    const style = parser.token(stream, state);
    tokens.push([line.slice(stream.start, stream.pos), style]);
  }
  return tokens;
}

function tokenize(...lines: string[]): Token[][] {
  const state = parser.startState(2);
  return lines.map(line => tokenizeLine(line, state));
}

function styled(line: string): Token[] {
  return tokenize(line)[0].filter(([, style]) => style !== null);
}

describe('bohemiaCfg language support', () => {
  it('is created once and reused', () => {
    expect(bohemiaCfg()).toBe(bohemiaCfg());
    expect(bohemiaCfg().language.name).toBe('bohemia-cfg');
  });

  it('declares line and block comment tokens for toggle-comment commands', () => {
    expect(parser.languageData).toEqual({
      commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    });
  });
});

describe('bohemiaCfg tokenizer', () => {
  it('tokenizes a typical serverDZ assignment', () => {
    expect(tokenize('hostname = "My Server"; // shown in browser')[0]).toEqual([
      ['hostname', 'propertyName'],
      [' ', null],
      ['=', 'operator'],
      [' ', null],
      ['"My Server"', 'string'],
      [';', 'punctuation'],
      [' ', null],
      ['// shown in browser', 'comment'],
    ]);
  });

  it('marks the identifier following `class` as a type name', () => {
    expect(styled('class Missions { class DayZ {};};')).toEqual([
      ['class', 'keyword'],
      ['Missions', 'typeName'],
      ['{', 'bracket'],
      ['class', 'keyword'],
      ['DayZ', 'typeName'],
      ['{', 'bracket'],
      ['}', 'bracket'],
      [';', 'punctuation'],
      ['}', 'bracket'],
      [';', 'punctuation'],
    ]);
  });

  it('carries a pending class name across a line break', () => {
    const [first, second] = tokenize('class', 'Missions');
    expect(first).toEqual([['class', 'keyword']]);
    expect(second).toEqual([['Missions', 'typeName']]);
  });

  it.each(['true', 'false', 'TRUE', 'False'])('treats %s as a boolean', word => {
    expect(styled(`verifySignatures = ${word};`)[2]).toEqual([word, 'bool']);
  });

  it.each([
    ['plain assignment', 'motd = 1;'],
    ['array assignment', 'motd[] = {};'],
    ['array assignment with inner spaces', 'motd [ ] = {};'],
    ['array append', 'motd[] += {};'],
  ])('marks the key of a %s as a property name', (_label, line) => {
    expect(styled(line)[0]).toEqual(['motd', 'propertyName']);
  });

  it('marks identifiers not followed by an assignment as variable names', () => {
    expect(styled('template = dayzOffline;')).toEqual([
      ['template', 'propertyName'],
      ['=', 'operator'],
      ['dayzOffline', 'variableName'],
      [';', 'punctuation'],
    ]);
  });

  it.each([
    ['2302', '2302'],
    ['-5', '-5'],
    ['+5', '+5'],
    ['1.5', '1.5'],
    ['1.', '1.'],
    ['.25', '.25'],
    ['1e5', '1e5'],
    ['2.5E-3', '2.5E-3'],
    ['0x1F', '0x1F'],
    ['-0xff', '-0xff'],
  ])('reads %s as a single number token', (source, expected) => {
    expect(tokenize(source)[0]).toEqual([[expected, 'number']]);
  });

  it('reads a doubled quote as an escaped quote inside a string', () => {
    expect(styled('motd = "say ""hi"" now";')[2]).toEqual(['"say ""hi"" now"', 'string']);
  });

  it('ends an unterminated string at the end of the line', () => {
    expect(tokenize('"open')[0]).toEqual([['"open', 'string']]);
  });

  it('ends a string whose closing quote is the last character', () => {
    expect(tokenize('""')[0]).toEqual([['""', 'string']]);
  });

  it('reads a block comment closed on the same line', () => {
    expect(tokenize('/* a */ x')[0]).toEqual([
      ['/* a */', 'comment'],
      [' ', null],
      ['x', 'variableName'],
    ]);
  });

  it('continues a block comment across lines until it is closed', () => {
    const [first, middle, last] = tokenize('a /* start', 'still comment', 'end */ b = 1;');
    expect(first).toEqual([
      ['a', 'variableName'],
      [' ', null],
      ['/* start', 'comment'],
    ]);
    expect(middle).toEqual([['still comment', 'comment']]);
    expect(last.filter(([, style]) => style !== null)).toEqual([
      ['end */', 'comment'],
      ['b', 'propertyName'],
      ['=', 'operator'],
      ['1', 'number'],
      [';', 'punctuation'],
    ]);
  });

  it.each([
    ['(', 'bracket'],
    [')', 'bracket'],
    ['[', 'bracket'],
    [']', 'bracket'],
    ['+', 'operator'],
    [',', 'punctuation'],
    [':', 'punctuation'],
    ['#', null],
    ['/', null],
  ])('classifies the single character %s as %s', (source, style) => {
    expect(tokenize(source)[0]).toEqual([[source, style]]);
  });

  it('returns no style when called on an exhausted stream', () => {
    const stream = new StringStream('', 4, 2);
    expect(parser.token(stream, parser.startState(2))).toBeNull();
    expect(stream.pos).toBe(0);
  });

  it('copies state so cached line states are not mutated by later lines', () => {
    const state = parser.startState(2);
    tokenizeLine('/* open', state);
    const snapshot = parser.copyState(state);
    tokenizeLine('close */', state);
    expect(state.inBlockComment).toBe(false);
    expect(snapshot).toEqual({ inBlockComment: true, expectClassName: false });
  });
});
