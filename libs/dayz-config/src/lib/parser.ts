import type { ConfigDiagnosticDto } from '@aegis/api-contracts';

import { DiagnosticSink } from './diagnostics';
import { decodeStringToken, type Token, tokenize } from './tokenizer';
import type {
  AssignmentValue,
  ConfigAssignment,
  ConfigClassBlock,
  ConfigDocument,
  ConfigEntry,
  ScalarValue,
  SourceRange,
} from './types';

export interface ParseResult {
  document: ConfigDocument;
  diagnostics: ConfigDiagnosticDto[];
}

interface RecoveryResult {
  lastEnd: number | null;
  firstStart: number | null;
  semicolonEnd: number | null;
}

interface ParsedValue {
  value: AssignmentValue;
  range: SourceRange;
}

function isScalarToken(token: Token): boolean {
  return token.kind === 'string' || token.kind === 'number' || token.kind === 'identifier';
}

function toScalar(token: Token): ScalarValue {
  const range = { start: token.start, end: token.end };
  if (token.kind === 'string') {
    return { kind: 'string', value: decodeStringToken(token.text), raw: token.text, range };
  }
  if (token.kind === 'number') {
    return { kind: 'number', value: Number(token.text), raw: token.text, range };
  }
  return { kind: 'word', value: token.text, raw: token.text, range };
}

export function compareDiagnostics(a: ConfigDiagnosticDto, b: ConfigDiagnosticDto): number {
  return a.line - b.line || a.column - b.column;
}

class Parser {
  private index = 0;
  private lastConsumed: Token | null = null;

  constructor(
    private readonly text: string,
    private readonly tokens: Token[],
    private readonly sink: DiagnosticSink,
  ) {}

  parseDocument(): ConfigEntry[] {
    return this.parseEntries(false);
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private advance(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    this.lastConsumed = token;
    return token;
  }

  private lastEnd(): number {
    return this.lastConsumed?.end ?? 0;
  }

  private startsStatement(offset = 0): boolean {
    const token = this.peek(offset);
    if (token?.kind !== 'identifier') {
      return false;
    }
    const next = this.peek(offset + 1);
    if (token.text.toLowerCase() === 'class') {
      return next?.kind === 'identifier';
    }
    return next?.kind === 'equals' || next?.kind === 'brackets';
  }

  private recoverStatement(): RecoveryResult {
    const result: RecoveryResult = { lastEnd: null, firstStart: null, semicolonEnd: null };
    for (let token = this.peek(); token; token = this.peek()) {
      if (token.kind === 'semicolon') {
        result.semicolonEnd = this.advance().end;
        break;
      }
      if (token.kind === 'rbrace' || this.startsStatement()) {
        break;
      }
      result.firstStart ??= token.start;
      result.lastEnd = this.advance().end;
    }
    return result;
  }

  private parseEntries(insideClass: boolean): ConfigEntry[] {
    const entries: ConfigEntry[] = [];
    for (let token = this.peek(); token; token = this.peek()) {
      if (token.kind === 'rbrace' && insideClass) {
        break;
      }
      const entry = this.parseEntry(token);
      if (entry) {
        entries.push(entry);
      }
    }
    this.reportDuplicates(entries);
    return entries;
  }

  private parseEntry(token: Token): ConfigEntry | null {
    if (token.kind === 'identifier') {
      return token.text.toLowerCase() === 'class' && this.startsStatement()
        ? this.parseClass()
        : this.parseAssignment();
    }
    if (token.kind === 'rbrace') {
      this.sink.error('UNEXPECTED_CLOSING_BRACE', "Unexpected '}' without a matching class", token);
      this.advance();
      if (this.peek()?.kind === 'semicolon') {
        this.advance();
      }
    } else if (token.kind === 'semicolon') {
      this.advance();
    } else {
      this.sink.error('UNEXPECTED_TOKEN', `Unexpected '${token.text}'`, token);
      this.recoverStatement();
    }
    return null;
  }

  private reportDuplicates(entries: ConfigEntry[]): void {
    const seen = new Map<string, SourceRange>();
    for (const entry of entries) {
      const isClass = entry.type === 'class';
      const name = isClass ? entry.name : entry.key;
      const range = isClass ? entry.nameRange : entry.keyRange;
      const id = `${entry.type}:${name.toLowerCase()}`;
      const previous = seen.get(id);
      if (previous) {
        const { line } = this.sink.position(previous.start);
        this.sink.warning(
          'DUPLICATE_SETTING',
          `'${name}' is already defined on line ${line}`,
          range,
        );
      } else {
        seen.set(id, range);
      }
    }
  }

  private parseClass(): ConfigClassBlock | null {
    const classToken = this.advance();
    const nameToken = this.advance();
    const nameRange = { start: nameToken.start, end: nameToken.end };

    if (this.peek()?.kind === 'colon') {
      const colon = this.advance();
      if (this.peek()?.kind === 'identifier') {
        this.advance();
      } else {
        this.sink.error('MISSING_CLASS_NAME', "Expected a base class name after ':'", colon);
      }
    }

    const opener = this.peek();
    if (opener?.kind === 'semicolon') {
      this.advance();
      return {
        type: 'class',
        name: nameToken.text,
        nameRange,
        entries: [],
        range: { start: classToken.start, end: opener.end },
      };
    }
    if (opener?.kind !== 'lbrace') {
      this.sink.error(
        'MISSING_CLASS_BODY',
        `Expected '{' after class '${nameToken.text}'`,
        nameRange,
      );
      this.recoverStatement();
      return null;
    }
    this.advance();

    const entries = this.parseEntries(true);
    const closer = this.peek();
    if (!closer) {
      this.sink.error('UNCLOSED_CLASS', `Class '${nameToken.text}' is not closed with '};'`, {
        start: classToken.start,
        end: nameToken.end,
      });
      return {
        type: 'class',
        name: nameToken.text,
        nameRange,
        entries,
        range: { start: classToken.start, end: this.text.length },
      };
    }
    this.advance();

    let end = closer.end;
    if (this.peek()?.kind === 'semicolon') {
      end = this.advance().end;
    } else {
      this.sink.error('MISSING_SEMICOLON', "Missing ';' after '}'", {
        start: closer.start,
        end: closer.end,
      });
    }

    return {
      type: 'class',
      name: nameToken.text,
      nameRange,
      entries,
      range: { start: classToken.start, end },
    };
  }

  private parseAssignment(): ConfigAssignment {
    const keyToken = this.advance();
    const keyRange = { start: keyToken.start, end: keyToken.end };
    let isArray = false;
    if (this.peek()?.kind === 'brackets') {
      this.advance();
      isArray = true;
    }

    const build = (
      value: AssignmentValue,
      valueRange: SourceRange,
      end: number,
    ): ConfigAssignment => ({
      type: 'assignment',
      key: keyToken.text,
      isArray,
      value,
      keyRange,
      valueRange,
      statementRange: { start: keyToken.start, end },
    });

    const equals = this.peek();
    if (equals?.kind !== 'equals') {
      this.sink.error('MISSING_EQUALS', `Expected '=' after '${keyToken.text}'`, keyRange);
      const afterKey = this.lastEnd();
      const skipped = this.recoverStatement();
      const valueRange = {
        start: skipped.firstStart ?? afterKey,
        end: skipped.lastEnd ?? afterKey,
      };
      return build(null, valueRange, skipped.semicolonEnd ?? skipped.lastEnd ?? afterKey);
    }
    this.advance();

    const parsed = this.parseValue(keyToken, isArray, equals);
    return this.finishStatement(parsed, build);
  }

  private parseValue(keyToken: Token, isArray: boolean, equals: Token): ParsedValue {
    const token = this.peek();
    const empty = { value: null, range: { start: equals.end, end: equals.end } };

    if (!token || token.kind === 'semicolon' || token.kind === 'rbrace' || this.startsStatement()) {
      this.sink.error('MISSING_VALUE', `Expected a value for '${keyToken.text}'`, equals);
      return empty;
    }

    if (token.kind === 'lbrace') {
      if (!isArray) {
        this.sink.error(
          'ARRAY_BRACKETS_MISMATCH',
          `Array values require '[]' after the setting name: '${keyToken.text}[]'`,
          keyToken,
        );
      }
      return this.parseArray();
    }

    if (!isScalarToken(token)) {
      return empty;
    }

    this.advance();
    if (isArray) {
      this.sink.error(
        'ARRAY_BRACKETS_MISMATCH',
        `'${keyToken.text}[]' expects an array value in braces`,
        token,
      );
    }
    return { value: toScalar(token), range: { start: token.start, end: token.end } };
  }

  private parseArray(): ParsedValue {
    const opener = this.advance();
    const items: ScalarValue[] = [];

    for (let token = this.peek(); token; token = this.peek()) {
      if (token.kind === 'rbrace') {
        this.advance();
        return { value: items, range: { start: opener.start, end: token.end } };
      }
      if (token.kind === 'semicolon' || this.startsStatement()) {
        break;
      }
      if (token.kind === 'lbrace') {
        this.sink.error('NESTED_ARRAY_UNSUPPORTED', 'Nested arrays are not supported', token);
        this.skipNestedArray();
      } else if (isScalarToken(token)) {
        items.push(toScalar(this.advance()));
      } else {
        this.sink.error('UNEXPECTED_TOKEN', `Unexpected '${token.text}' in array`, token);
        this.advance();
        continue;
      }

      const next = this.peek();
      if (next?.kind === 'comma') {
        this.advance();
      } else if (next && isScalarToken(next) && !this.startsStatement()) {
        this.sink.error('UNEXPECTED_TOKEN', "Expected ',' between array items", next);
      }
    }

    this.sink.error('UNCLOSED_ARRAY', "Array is not closed with '}'", opener);
    return { value: items, range: { start: opener.start, end: this.lastEnd() } };
  }

  private skipNestedArray(): void {
    let depth = 0;
    for (let token = this.peek(); token; token = this.peek()) {
      if (token.kind === 'semicolon') {
        return;
      }
      this.advance();
      if (token.kind === 'lbrace') {
        depth += 1;
      } else if (token.kind === 'rbrace') {
        depth -= 1;
        if (depth === 0) {
          return;
        }
      }
    }
  }

  private finishStatement(
    parsed: ParsedValue,
    build: (value: AssignmentValue, valueRange: SourceRange, end: number) => ConfigAssignment,
  ): ConfigAssignment {
    const token = this.peek();
    if (token?.kind === 'semicolon') {
      this.advance();
      return build(parsed.value, parsed.range, token.end);
    }

    const lastLine = this.lastConsumed?.line ?? 1;
    if (!token || token.kind === 'rbrace' || token.line > lastLine || this.startsStatement()) {
      const end = this.lastEnd();
      if (!this.lastConsumed?.unterminated) {
        this.sink.error('MISSING_SEMICOLON', "Missing ';' at the end of the statement", {
          start: end,
          end,
        });
      }
      return build(parsed.value, parsed.range, end);
    }

    this.sink.error('UNEXPECTED_TOKEN', `Unexpected '${token.text}', expected ';'`, token);
    const skipped = this.recoverStatement();
    const junkStart = skipped.firstStart ?? token.start;
    const valueRange = {
      start: parsed.value === null ? junkStart : parsed.range.start,
      end: skipped.lastEnd ?? parsed.range.end,
    };
    return build(null, valueRange, skipped.semicolonEnd ?? skipped.lastEnd ?? parsed.range.end);
  }
}

export function parseServerConfig(text: string): ParseResult {
  const { tokens, diagnostics: lexical } = tokenize(text);
  const sink = new DiagnosticSink(text);
  const parser = new Parser(
    text,
    tokens.filter(token => token.kind !== 'comment'),
    sink,
  );
  const entries = parser.parseDocument();
  return {
    document: { text, entries },
    diagnostics: [...lexical, ...sink.diagnostics].sort(compareDiagnostics),
  };
}
