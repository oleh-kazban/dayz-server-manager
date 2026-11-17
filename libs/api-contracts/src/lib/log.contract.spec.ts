import { describe, expect, it } from 'vitest';

import {
  LOG_LINES_EVENT,
  serverLogKindSchema,
  serverLogLinesEventSchema,
  serverLogStreamQuerySchema,
  serverLogTailSchema,
} from './log.contract';

describe('server log contracts (DSM-00206)', () => {
  it('knows the RPT log kind', () => {
    expect(serverLogKindSchema.parse('rpt')).toBe('rpt');
    expect(serverLogKindSchema.safeParse('adm').success).toBe(false);
  });

  it('validates a tail with and without a file', () => {
    const tail = {
      kind: 'rpt',
      file: {
        name: 'DayZServer_x64_2026-11-17_10-00-00.RPT',
        size: 42,
        modifiedAt: '2026-11-17T10:00:00.000Z',
      },
      lines: ['a', 'b'],
      offset: 42,
      truncated: false,
      firstLineNumber: 1,
      totalLines: 2,
      live: true,
    };
    expect(serverLogTailSchema.parse(tail)).toEqual(tail);
    expect(
      serverLogTailSchema.safeParse({ ...tail, file: null, lines: [], offset: 0, totalLines: 0 })
        .success,
    ).toBe(true);
    expect(serverLogTailSchema.safeParse({ ...tail, offset: -1 }).success).toBe(false);
    expect(serverLogTailSchema.safeParse({ ...tail, firstLineNumber: 0 }).success).toBe(false);
  });

  it('coerces the stream offset from the query string', () => {
    expect(serverLogStreamQuerySchema.parse({ from: '120', file: 'x.RPT' })).toEqual({
      from: 120,
      file: 'x.RPT',
    });
    expect(serverLogStreamQuerySchema.parse({})).toEqual({ from: 0 });
    expect(serverLogStreamQuerySchema.safeParse({ from: '-3' }).success).toBe(false);
    expect(serverLogStreamQuerySchema.safeParse({ from: 'abc' }).success).toBe(false);
  });

  it('validates the log.lines event', () => {
    expect(LOG_LINES_EVENT).toBe('log.lines');
    expect(
      serverLogLinesEventSchema.safeParse({ file: 'x.RPT', lines: ['a'], offset: 2 }).success,
    ).toBe(true);
  });
});
