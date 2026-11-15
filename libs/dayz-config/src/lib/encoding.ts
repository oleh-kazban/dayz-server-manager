import type { ConfigEol } from '@aegis/api-contracts';

export interface TextFormat {
  eol: ConfigEol;
}

export function detectTextFormat(text: string): TextFormat {
  const crlf = text.match(/\r\n/g)?.length ?? 0;
  const lf = (text.match(/\n/g)?.length ?? 0) - crlf;
  return { eol: crlf > 0 && crlf >= lf ? 'crlf' : 'lf' };
}

export function toLf(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

export function fromLf(text: string, eol: ConfigEol): string {
  return eol === 'crlf' ? text.replace(/\r?\n/g, '\r\n') : toLf(text);
}
