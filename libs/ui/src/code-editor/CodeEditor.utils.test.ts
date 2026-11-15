import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import type { CodeEditorDiagnostic } from './CodeEditor.types';
import {
  changeTouchesRanges,
  clampLine,
  computeTextChange,
  normalizeReadOnlyRanges,
  positionAt,
  toLintDiagnostics,
} from './CodeEditor.utils';

// line 1 "hostname = 1;" (0..13), line 2 "port = 2302;" (14..26), line 3 "" (27)
const doc = Text.of(['hostname = 1;', 'port = 2302;', '']);

function diagnostic(overrides: Partial<CodeEditorDiagnostic>): CodeEditorDiagnostic {
  return {
    severity: 'error',
    message: 'Unknown key',
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 2,
    ...overrides,
  };
}

describe('clampLine', () => {
  it.each([
    [2, 2],
    [0, 1],
    [-5, 1],
    [99, 3],
    [2.9, 2],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
  ])('maps requested line %s to document line %s', (line, expected) => {
    expect(clampLine(doc, line)).toBe(expected);
  });
});

describe('positionAt', () => {
  it('converts a 1-based line and column into a document offset', () => {
    expect(positionAt(doc, 2, 6)).toBe(19);
  });

  it('clamps columns before the line start and past the line end', () => {
    expect(positionAt(doc, 2, 0)).toBe(14);
    expect(positionAt(doc, 2, 500)).toBe(26);
  });

  it('falls back to the line start for a non-finite column', () => {
    expect(positionAt(doc, 2, Number.NaN)).toBe(14);
  });

  it('clamps lines outside the document', () => {
    expect(positionAt(doc, 40, 1)).toBe(27);
    expect(positionAt(doc, -1, 3)).toBe(2);
  });
});

describe('toLintDiagnostics', () => {
  it('maps 1-based positions with an exclusive end column to offsets', () => {
    expect(
      toLintDiagnostics(doc, [
        diagnostic({
          severity: 'warning',
          message: 'Port reserved',
          line: 2,
          column: 8,
          endLine: 2,
          endColumn: 12,
        }),
      ]),
    ).toEqual([{ from: 21, to: 25, severity: 'warning', message: 'Port reserved' }]);
  });

  it('collapses an end that precedes the start to a zero-width range', () => {
    const [mapped] = toLintDiagnostics(doc, [
      diagnostic({ line: 2, column: 5, endLine: 1, endColumn: 1 }),
    ]);
    expect(mapped).toMatchObject({ from: 18, to: 18 });
  });

  it('clamps diagnostics pointing beyond the document', () => {
    const [mapped] = toLintDiagnostics(doc, [
      diagnostic({ line: 10, column: 10, endLine: 12, endColumn: 99 }),
    ]);
    expect(mapped).toMatchObject({ from: 27, to: 27 });
  });

  it('returns an empty list for no diagnostics', () => {
    expect(toLintDiagnostics(doc, [])).toEqual([]);
  });
});

describe('computeTextChange', () => {
  it('returns null when the texts are identical', () => {
    expect(computeTextChange('abc', 'abc')).toBeNull();
  });

  it.each([
    ['insertion in the middle', 'port = 2302;', 'port = 23020;', { from: 11, to: 11, insert: '0' }],
    ['deletion in the middle', 'port = 2302;', 'port = 232;', { from: 9, to: 10, insert: '' }],
    [
      'replacement in the middle',
      'maxPlayers = 60;',
      'maxPlayers = 100;',
      { from: 13, to: 14, insert: '10' },
    ],
    ['append at the end', 'a', 'ab', { from: 1, to: 1, insert: 'b' }],
    ['prepend at the start', 'b', 'ab', { from: 0, to: 0, insert: 'a' }],
    [
      'repeated characters without overlapping prefix and suffix',
      'aa',
      'aaa',
      { from: 2, to: 2, insert: 'a' },
    ],
    ['shrinking repeated characters', 'aaa', 'a', { from: 1, to: 3, insert: '' }],
    ['clearing the document', 'abc', '', { from: 0, to: 3, insert: '' }],
    ['filling an empty document', '', 'abc', { from: 0, to: 0, insert: 'abc' }],
  ])('produces the minimal change for %s', (_label, previous, next, expected) => {
    const change = computeTextChange(previous, next);
    expect(change).toEqual(expected);
    expect(previous.slice(0, change!.from) + change!.insert + previous.slice(change!.to)).toBe(
      next,
    );
  });
});

describe('normalizeReadOnlyRanges', () => {
  it('clamps ranges to the document, drops empty ones and sorts by start then end', () => {
    expect(
      normalizeReadOnlyRanges(
        [
          { from: 8, to: 50 },
          { from: 2, to: 6 },
          { from: 2, to: 4 },
          { from: -3, to: 1 },
          { from: 5, to: 5 },
          { from: 7, to: 3 },
          { from: 12, to: 20 },
        ],
        10,
      ),
    ).toEqual([
      { from: 0, to: 1 },
      { from: 2, to: 4 },
      { from: 2, to: 6 },
      { from: 8, to: 10 },
    ]);
  });

  it('truncates fractional offsets and treats non-finite offsets as zero', () => {
    expect(
      normalizeReadOnlyRanges(
        [
          { from: 1.7, to: 4.2 },
          { from: Number.NaN, to: 3 },
          { from: 2, to: Number.POSITIVE_INFINITY },
        ],
        10,
      ),
    ).toEqual([
      { from: 0, to: 3 },
      { from: 1, to: 4 },
    ]);
  });
});

describe('changeTouchesRanges', () => {
  const ranges = [{ from: 10, to: 20 }];

  it.each([
    ['insert strictly inside', 15, 15, true],
    ['insert at the start boundary', 10, 10, false],
    ['insert at the end boundary', 20, 20, false],
    ['insert outside', 3, 3, false],
    ['delete inside', 12, 14, true],
    ['delete overlapping the start', 8, 11, true],
    ['delete overlapping the end', 19, 25, true],
    ['delete covering the range', 0, 30, true],
    ['delete ending exactly at the start', 5, 10, false],
    ['delete starting exactly at the end', 20, 25, false],
  ])('%s -> %s', (_label, fromA, toA, expected) => {
    expect(changeTouchesRanges(fromA, toA, ranges)).toBe(expected);
  });

  it('never touches when there are no ranges', () => {
    expect(changeTouchesRanges(0, 100, [])).toBe(false);
  });
});
