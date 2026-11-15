import type { ConfigDiagnosticDto } from '@aegis/api-contracts';

import { DiagnosticSink } from './diagnostics';

export type TokenKind =
  | 'identifier'
  | 'number'
  | 'string'
  | 'equals'
  | 'semicolon'
  | 'comma'
  | 'colon'
  | 'lbrace'
  | 'rbrace'
  | 'brackets'
  | 'comment';

export interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
  line: number;
  column: number;
  unterminated?: boolean;
}

export interface TokenizeResult {
  tokens: Token[];
  diagnostics: ConfigDiagnosticDto[];
}

const PUNCTUATION: Readonly<Record<string, TokenKind>> = {
  '=': 'equals',
  ';': 'semicolon',
  ',': 'comma',
  ':': 'colon',
  '{': 'lbrace',
  '}': 'rbrace',
};

const IDENTIFIER_START = /[A-Za-z_]/;
const IDENTIFIER_PART = /\w/;
const DIGIT = /\d/;
const WHITESPACE = /\s/;
const NUMBER_PATTERN = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;

class Lexer {
  readonly tokens: Token[] = [];
  readonly sink: DiagnosticSink;
  private i = 0;

  constructor(private readonly text: string) {
    this.sink = new DiagnosticSink(text);
  }

  run(): void {
    while (this.i < this.text.length) {
      const char = this.text[this.i];
      if (WHITESPACE.test(char)) {
        this.i += 1;
      } else if (char === '/' && this.text[this.i + 1] === '/') {
        this.lineComment();
      } else if (char === '/' && this.text[this.i + 1] === '*') {
        this.blockComment();
      } else if (char === '"') {
        this.string();
      } else if (this.startsNumber()) {
        this.number();
      } else if (IDENTIFIER_START.test(char)) {
        this.identifier();
      } else {
        this.punctuation(char);
      }
    }
  }

  private push(kind: TokenKind, end: number): Token {
    const start = this.i;
    const { line, column } = this.sink.position(start);
    const token: Token = { kind, text: this.text.slice(start, end), start, end, line, column };
    this.tokens.push(token);
    this.i = end;
    return token;
  }

  private lineComment(): void {
    const newline = this.text.indexOf('\n', this.i);
    if (newline === -1) {
      this.push('comment', this.text.length);
    } else {
      this.push('comment', this.text[newline - 1] === '\r' ? newline - 1 : newline);
    }
  }

  private blockComment(): void {
    const close = this.text.indexOf('*/', this.i + 2);
    if (close === -1) {
      this.sink.error('UNTERMINATED_COMMENT', 'Block comment is not closed with */', {
        start: this.i,
        end: this.i + 2,
      });
      this.push('comment', this.text.length);
      return;
    }
    this.push('comment', close + 2);
  }

  private string(): void {
    let end = this.i + 1;
    while (end < this.text.length) {
      const char = this.text[end];
      if (char === '"' && this.text[end + 1] === '"') {
        end += 2;
      } else if (char === '"') {
        this.push('string', end + 1);
        return;
      } else if (char === '\n' || char === '\r') {
        break;
      } else {
        end += 1;
      }
    }
    this.sink.error('UNTERMINATED_STRING', 'String is not closed with a double quote', {
      start: this.i,
      end,
    });
    this.push('string', end).unterminated = true;
  }

  private startsNumber(): boolean {
    const [char, next = '', afterNext = ''] = this.text.slice(this.i, this.i + 3);
    if (char === '+' || char === '-') {
      return DIGIT.test(next) || (next === '.' && DIGIT.test(afterNext));
    }
    return DIGIT.test(char) || (char === '.' && DIGIT.test(next));
  }

  private number(): void {
    NUMBER_PATTERN.lastIndex = this.i;
    const match = NUMBER_PATTERN.exec(this.text);
    this.push('number', this.i + (match ? match[0].length : 1));
  }

  private identifier(): void {
    let end = this.i + 1;
    while (end < this.text.length && IDENTIFIER_PART.test(this.text[end])) {
      end += 1;
    }
    this.push('identifier', end);
  }

  private punctuation(char: string): void {
    if (char === '[' && this.text[this.i + 1] === ']') {
      this.push('brackets', this.i + 2);
      return;
    }
    const kind = PUNCTUATION[char];
    if (kind) {
      this.push(kind, this.i + 1);
      return;
    }
    this.sink.error('UNEXPECTED_CHARACTER', `Unexpected character '${char}'`, {
      start: this.i,
      end: this.i + 1,
    });
    this.i += 1;
  }
}

export function tokenize(text: string): TokenizeResult {
  const lexer = new Lexer(text);
  lexer.run();
  return { tokens: lexer.tokens, diagnostics: lexer.sink.diagnostics };
}

export function decodeStringToken(raw: string): string {
  let value = '';
  for (let i = 1; i < raw.length; i += 1) {
    if (raw[i] === '"') {
      if (raw[i + 1] !== '"') {
        break;
      }
      i += 1;
    }
    value += raw[i];
  }
  return value;
}
