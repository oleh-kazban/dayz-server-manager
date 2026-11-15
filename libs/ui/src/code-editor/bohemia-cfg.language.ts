import {
  LanguageSupport,
  StreamLanguage,
  type StreamParser,
  type StringStream,
} from '@codemirror/language';

interface BohemiaCfgState {
  inBlockComment: boolean;
  expectClassName: boolean;
}

const HEX_PATTERN = /^[+-]?0x[\da-f]+/i;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)/;
const EXPONENT_PATTERN = /^e[+-]?\d+/i;
const IDENTIFIER_PATTERN = /^[A-Za-z_]\w*/;
const ASSIGNMENT_LOOKAHEAD = /^\s*(?:\[\s*\]\s*)?\+?=/;

function readBlockComment(stream: StringStream, state: BohemiaCfgState): string {
  if (stream.match(/^.*?\*\//)) {
    state.inBlockComment = false;
  } else {
    stream.skipToEnd();
    state.inBlockComment = true;
  }
  return 'comment';
}

function readString(stream: StringStream): string {
  stream.next();
  while (!stream.eol()) {
    if (stream.next() === '"') {
      if (stream.peek() !== '"') break;
      stream.next();
    }
  }
  return 'string';
}

function readWord(stream: StringStream, state: BohemiaCfgState, word: string): string {
  if (state.expectClassName) {
    state.expectClassName = false;
    return 'typeName';
  }
  if (word === 'class') {
    state.expectClassName = true;
    return 'keyword';
  }
  const lower = word.toLowerCase();
  if (lower === 'true' || lower === 'false') return 'bool';
  return stream.match(ASSIGNMENT_LOOKAHEAD, false) ? 'propertyName' : 'variableName';
}

function readPunctuation(stream: StringStream): string | null {
  const ch = stream.next();
  if (ch === undefined) return null;
  if ('{}[]()'.includes(ch)) return 'bracket';
  if (ch === '=' || ch === '+') return 'operator';
  if (ch === ';' || ch === ',' || ch === ':') return 'punctuation';
  return null;
}

const bohemiaCfgParser: StreamParser<BohemiaCfgState> = {
  name: 'bohemia-cfg',
  startState: () => ({ inBlockComment: false, expectClassName: false }),
  copyState: state => ({ ...state }),
  token(stream, state) {
    if (state.inBlockComment) return readBlockComment(stream, state);
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match('/*')) return readBlockComment(stream, state);
    if (stream.peek() === '"') return readString(stream);
    if (stream.match(HEX_PATTERN)) return 'number';
    if (stream.match(DECIMAL_PATTERN)) {
      stream.match(EXPONENT_PATTERN);
      return 'number';
    }

    const word = stream.match(IDENTIFIER_PATTERN);
    if (Array.isArray(word)) return readWord(stream, state, word[0]);

    return readPunctuation(stream);
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
  },
};

let bohemiaCfgSupport: LanguageSupport | null = null;

export function bohemiaCfg(): LanguageSupport {
  bohemiaCfgSupport ??= new LanguageSupport(StreamLanguage.define(bohemiaCfgParser));
  return bohemiaCfgSupport;
}
