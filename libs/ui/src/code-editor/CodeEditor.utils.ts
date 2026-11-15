import type { Diagnostic } from '@codemirror/lint';
import type { Text } from '@codemirror/state';

import type { CodeEditorDiagnostic, CodeEditorReadOnlyRange } from './CodeEditor.types';

export interface TextChange {
  from: number;
  to: number;
  insert: string;
}

function toInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

export function clampLine(doc: Text, line: number): number {
  return Math.min(Math.max(toInteger(line, 1), 1), doc.lines);
}

export function positionAt(doc: Text, line: number, column: number): number {
  const target = doc.line(clampLine(doc, line));
  const offset = toInteger(column, 1) - 1;
  return target.from + Math.min(Math.max(offset, 0), target.length);
}

export function toLintDiagnostics(
  doc: Text,
  diagnostics: readonly CodeEditorDiagnostic[],
): Diagnostic[] {
  return diagnostics.map(diagnostic => {
    const from = positionAt(doc, diagnostic.line, diagnostic.column);
    const to = Math.max(from, positionAt(doc, diagnostic.endLine, diagnostic.endColumn));
    return { from, to, severity: diagnostic.severity, message: diagnostic.message };
  });
}

/** Smallest single replacement turning `previous` into `next`, so unchanged regions keep their selection. */
export function computeTextChange(previous: string, next: string): TextChange | null {
  if (previous === next) return null;

  const sharedLength = Math.min(previous.length, next.length);
  let prefix = 0;
  while (prefix < sharedLength && previous.charCodeAt(prefix) === next.charCodeAt(prefix)) {
    prefix++;
  }

  const maxSuffix = sharedLength - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    previous.charCodeAt(previous.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix)
  ) {
    suffix++;
  }

  return {
    from: prefix,
    to: previous.length - suffix,
    insert: next.slice(prefix, next.length - suffix),
  };
}

export function normalizeReadOnlyRanges(
  ranges: readonly CodeEditorReadOnlyRange[],
  docLength: number,
): CodeEditorReadOnlyRange[] {
  return ranges
    .map(range => ({
      from: Math.min(Math.max(toInteger(range.from, 0), 0), docLength),
      to: Math.min(Math.max(toInteger(range.to, 0), 0), docLength),
    }))
    .filter(range => range.from < range.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);
}

export function changeTouchesRanges(
  fromA: number,
  toA: number,
  ranges: readonly CodeEditorReadOnlyRange[],
): boolean {
  return ranges.some(range =>
    fromA === toA ? fromA > range.from && fromA < range.to : fromA < range.to && toA > range.from,
  );
}
