import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ServerLogLinesEventDto } from '@aegis/api-contracts';

import {
  countLines,
  findNewestLogFile,
  isPlainLogFileName,
  LogFollower,
  readLogTail,
  statFile,
} from './server-log';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-logs-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const write = (name: string, content: string | Buffer, mtimeMs?: number) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  if (mtimeMs !== undefined) {
    fs.utimesSync(file, new Date(mtimeMs), new Date(mtimeMs));
  }
  return file;
};
const tailOf = async (file: string, options?: { maxLines?: number; maxBytes?: number }) =>
  readLogTail(file, fs.statSync(file).size, options);

describe('findNewestLogFile (DSM-00206)', () => {
  it('picks the newest .RPT (case-insensitive) and ignores other files and folders', async () => {
    write('DayZServer_x64_2026-11-17_10-00-00.RPT', 'old', 1_000_000);
    write('dayzserver_x64_2026-11-17_12-00-00.rpt', 'new', 3_000_000);
    write('DayZServer_x64_2026-11-17_12-00-00.ADM', 'adm', 9_000_000);
    write('script_2026-11-17_12-00-00.log', 'script', 9_000_000);
    fs.mkdirSync(path.join(dir, 'folder.RPT'));

    const newest = await findNewestLogFile(dir);
    expect(newest).toMatchObject({ name: 'dayzserver_x64_2026-11-17_12-00-00.rpt', size: 3 });
  });

  it('breaks a modification-time tie by name', async () => {
    write('a.RPT', 'a', 2_000_000);
    write('b.RPT', 'b', 2_000_000);
    expect((await findNewestLogFile(dir))?.name).toBe('b.RPT');
  });

  it('returns null without a matching file or directory', async () => {
    expect(await findNewestLogFile(dir)).toBeNull();
    expect(await findNewestLogFile(path.join(dir, 'missing'))).toBeNull();
  });
});

describe('isPlainLogFileName', () => {
  it.each(['DayZServer_x64_2026-11-17_12-00-00.RPT', 'x.rpt'])('accepts %s', name => {
    expect(isPlainLogFileName(name)).toBe(true);
  });

  it.each(['../x.RPT', 'sub/x.RPT', 'sub\\x.RPT', 'x.ADM', 'x.RPT\0', '.RPT/..'])(
    'rejects %s',
    name => {
      expect(isPlainLogFileName(name)).toBe(false);
    },
  );
});

describe('statFile', () => {
  it('describes a file and ignores folders and missing paths', async () => {
    const file = write('x.RPT', 'abc');
    expect(await statFile(file, 'x.RPT')).toMatchObject({ name: 'x.RPT', size: 3 });
    expect(await statFile(dir, 'dir')).toBeNull();
    expect(await statFile(path.join(dir, 'nope'), 'nope')).toBeNull();
  });
});

describe('readLogTail', () => {
  it('returns complete lines with line numbers, leaving a partial last line for the follower', async () => {
    const file = write('x.RPT', '﻿first\r\nsecond\nthird\npart');
    expect(await tailOf(file)).toEqual({
      lines: ['first', 'second', 'third'],
      offset: Buffer.byteLength('﻿first\r\nsecond\nthird\n'),
      truncated: false,
      firstLineNumber: 1,
      totalLines: 3,
    });
  });

  it('keeps the last maxLines and numbers them from the end of the file', async () => {
    const file = write('x.RPT', Array.from({ length: 10 }, (_, i) => `line ${i + 1}\n`).join(''));
    expect(await tailOf(file, { maxLines: 3 })).toMatchObject({
      lines: ['line 8', 'line 9', 'line 10'],
      truncated: true,
      firstLineNumber: 8,
      totalLines: 10,
    });
  });

  it('reads only the last maxBytes and drops the first incomplete line', async () => {
    const file = write('x.RPT', 'aaaa\nbbbb\ncccc\n');
    expect(await tailOf(file, { maxBytes: 8 })).toMatchObject({
      lines: ['cccc'],
      offset: 15,
      truncated: true,
      firstLineNumber: 3,
      totalLines: 3,
    });
  });

  it('shows nothing when one line is longer than the window', async () => {
    const file = write('x.RPT', `start\n${'x'.repeat(50)}`);
    expect(await tailOf(file, { maxBytes: 10 })).toEqual({
      lines: [],
      offset: fs.statSync(file).size - 10,
      truncated: true,
      firstLineNumber: 2,
      totalLines: 1,
    });
  });

  it('handles an empty file and a file without a newline yet', async () => {
    expect(await tailOf(write('empty.RPT', ''))).toEqual({
      lines: [],
      offset: 0,
      truncated: false,
      firstLineNumber: 1,
      totalLines: 0,
    });
    expect(await tailOf(write('partial.RPT', 'no newline'))).toMatchObject({
      lines: [],
      offset: 0,
    });
  });

  it('keeps multi-byte characters intact and cuts runaway lines', async () => {
    const long = 'y'.repeat(20 * 1024);
    const file = write('x.RPT', `Привіт ✓\n${long}\n`);
    const tail = await tailOf(file);
    expect(tail.lines[0]).toBe('Привіт ✓');
    expect(tail.lines[1]).toHaveLength(16 * 1024 + 1);
    expect(tail.lines[1].endsWith('…')).toBe(true);
  });
});

describe('countLines', () => {
  it('counts newlines up to a byte position across chunks', async () => {
    const file = write('x.RPT', 'a\n'.repeat(700_000));
    expect(await countLines(file, 1_400_000)).toBe(700_000);
    expect(await countLines(file, 3)).toBe(1);
    expect(await countLines(file, 0)).toBe(0);
    expect(await countLines(file, 5_000_000)).toBe(700_000);
  });
});

describe('LogFollower', () => {
  const follower = (
    file: { name: string; path: string } | null,
    from: number,
    events: ServerLogLinesEventDto[],
    options: Partial<ConstructorParameters<typeof LogFollower>[0]> = {},
  ) =>
    new LogFollower({
      file,
      from,
      resolve: async () => findNewestLogFile(dir),
      onLines: event => events.push(event),
      ...options,
    });

  it('emits appended complete lines with byte offsets and holds back a partial line', async () => {
    const file = write('x.RPT', 'old\n');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 4, events);

    await follow.tick();
    expect(events).toEqual([]);

    fs.appendFileSync(file, 'new 1\nnew 2\npar');
    await follow.tick();
    fs.appendFileSync(file, 'tial\n');
    await follow.tick();

    expect(events).toEqual([
      { file: 'x.RPT', lines: ['new 1', 'new 2'], offset: 16 },
      { file: 'x.RPT', lines: ['partial'], offset: 24 },
    ]);
  });

  it('emits nothing for a poll that only sees part of a line', async () => {
    const file = write('x.RPT', '');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 0, events);

    fs.appendFileSync(file, 'half');
    await follow.tick();
    expect(events).toEqual([]);

    fs.appendFileSync(file, ' a line\n');
    await follow.tick();
    expect(events).toEqual([{ file: 'x.RPT', lines: ['half a line'], offset: 12 }]);
  });

  it('batches lines per event and reads at most maxBytesPerTick per poll', async () => {
    const file = write('x.RPT', 'a\nb\nc\nd\ne\n');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 0, events, {
      maxLinesPerEvent: 2,
      maxBytesPerTick: 6,
    });

    await follow.tick();
    await follow.tick();

    expect(events).toEqual([
      { file: 'x.RPT', lines: ['a', 'b'], offset: 4 },
      { file: 'x.RPT', lines: ['c'], offset: 6 },
      { file: 'x.RPT', lines: ['d', 'e'], offset: 10 },
    ]);
  });

  it('waits for a file to appear, then follows it from the start (BOM stripped)', async () => {
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower(null, 999, events);

    await follow.tick();
    expect(events).toEqual([]);

    write('DayZServer_x64_new.RPT', '﻿hello\n');
    await follow.tick();
    expect(events).toEqual([{ file: 'DayZServer_x64_new.RPT', lines: ['hello'], offset: 9 }]);
  });

  it('starts over when the file shrinks, and keeps polling while it is missing', async () => {
    const file = write('x.RPT', 'one\ntwo\n');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 8, events);

    fs.rmSync(file);
    await follow.tick();
    write('x.RPT', 'new\n');
    await follow.tick();

    expect(events).toEqual([{ file: 'x.RPT', lines: ['new'], offset: 4 }]);
  });

  it('flushes a runaway line without newline as one cut line', async () => {
    const file = write('x.RPT', '');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 0, events, {
      maxBytesPerTick: 128 * 1024,
    });
    fs.appendFileSync(file, 'z'.repeat(70 * 1024));

    await follow.tick();

    expect(events).toHaveLength(1);
    expect(events[0].lines[0]).toHaveLength(16 * 1024 + 1);
    expect(events[0].offset).toBe(70 * 1024);
  });

  it('polls on an interval until stopped, and skips overlapping polls', async () => {
    const file = write('x.RPT', '');
    const events: ServerLogLinesEventDto[] = [];
    const follow = follower({ name: 'x.RPT', path: file }, 0, events, { intervalMs: 10 });
    follow.start();
    follow.start(); // idempotent
    fs.appendFileSync(file, 'tick\n');

    await expect.poll(() => events.length, { timeout: 2_000 }).toBe(1);
    follow.stop();
    follow.stop();
    fs.appendFileSync(file, 'after stop\n');
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(events).toHaveLength(1);

    const overlapping = follower({ name: 'x.RPT', path: file }, 0, events);
    await Promise.all([overlapping.tick(), overlapping.tick()]);
    expect(events.at(-1)?.lines).toEqual(['tick', 'after stop']);
    expect(events).toHaveLength(2);
  });
});
