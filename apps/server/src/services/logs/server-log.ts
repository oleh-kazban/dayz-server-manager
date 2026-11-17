import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  LOG_LINE_MAX_LENGTH,
  LOG_TAIL_MAX_BYTES,
  LOG_TAIL_MAX_LINES,
  type ServerLogLinesEventDto,
} from '@aegis/api-contracts';

/** DayZ's engine log: `DayZServer_x64_<date>_<time>.RPT` in the profiles directory. */
export const RPT_FILE_PATTERN = /\.rpt$/i;

const NEWLINE = 0x0a;
const BOM = '﻿';
/** A "line" without a newline this long is flushed anyway (cut) instead of growing forever. */
const MAX_PENDING_BYTES = LOG_LINE_MAX_LENGTH * 4;

export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
}

/** Newest file matching `pattern` in `dir` (by modification time, then name), or `null`. */
export async function findNewestLogFile(
  dir: string,
  pattern: RegExp = RPT_FILE_PATTERN,
): Promise<LogFileInfo | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  let newest: LogFileInfo | null = null;
  for (const name of names) {
    if (!pattern.test(name)) {
      continue;
    }
    const filePath = path.join(dir, name);
    const info = await statFile(filePath, name);
    if (!info) {
      continue;
    }
    const newer =
      !newest ||
      info.modifiedAt.getTime() > newest.modifiedAt.getTime() ||
      (info.modifiedAt.getTime() === newest.modifiedAt.getTime() && name > newest.name);
    if (newer) {
      newest = info;
    }
  }
  return newest;
}

/** A plain file name (no directories) matching `pattern`: safe to join to the profiles dir. */
export function isPlainLogFileName(name: string, pattern: RegExp = RPT_FILE_PATTERN): boolean {
  return (
    pattern.test(name) &&
    !/[\\/\0]/.test(name) &&
    name !== '.' &&
    name !== '..' &&
    path.basename(name) === name
  );
}

export async function statFile(filePath: string, name: string): Promise<LogFileInfo | null> {
  try {
    const info = await stat(filePath);
    return info.isFile() ? { name, path: filePath, size: info.size, modifiedAt: info.mtime } : null;
  } catch {
    return null;
  }
}

function cutLine(line: string): string {
  const text = line.endsWith('\r') ? line.slice(0, -1) : line;
  return text.length > LOG_LINE_MAX_LENGTH ? `${text.slice(0, LOG_LINE_MAX_LENGTH)}…` : text;
}

/** Splits complete lines (each ending with `\n`) out of `bytes`; `base` is its file offset. */
function splitLines(bytes: Buffer, base: number): { lines: string[]; ends: number[] } {
  const lines: string[] = [];
  const ends: number[] = [];
  let position = 0;
  let newline = bytes.indexOf(NEWLINE, position);
  while (newline !== -1) {
    let line = bytes.subarray(position, newline).toString('utf8');
    if (base + position === 0 && line.startsWith(BOM)) {
      line = line.slice(BOM.length);
    }
    lines.push(cutLine(line));
    position = newline + 1;
    ends.push(base + position);
    newline = bytes.indexOf(NEWLINE, position);
  }
  return { lines, ends };
}

export interface LogTail {
  lines: string[];
  /** Byte position after the last complete line. */
  offset: number;
  truncated: boolean;
  /** 1-based line number of `lines[0]`. */
  firstLineNumber: number;
  /** Complete lines in the file up to `offset`. */
  totalLines: number;
}

const COUNT_CHUNK_BYTES = 1024 * 1024;

/** Newlines in the first `end` bytes of a file, read in 1 MiB chunks (line numbers). */
export async function countLines(filePath: string, end: number): Promise<number> {
  if (end <= 0) {
    return 0;
  }
  const buffer = Buffer.alloc(Math.min(COUNT_CHUNK_BYTES, end));
  const handle = await open(filePath, 'r');
  let count = 0;
  try {
    for (let position = 0; position < end;) {
      const length = Math.min(buffer.length, end - position);
      const { bytesRead } = await handle.read(buffer, 0, length, position);
      if (bytesRead === 0) {
        break;
      }
      for (let index = buffer.indexOf(NEWLINE, 0); index !== -1 && index < bytesRead;) {
        count += 1;
        index = buffer.indexOf(NEWLINE, index + 1);
      }
      position += bytesRead;
    }
  } finally {
    await handle.close();
  }
  return count;
}

/**
 * The last complete lines of a log file (DSM-00206): at most `maxLines` from at most the last
 * `maxBytes`. A partial last line is left out; `offset` points at its start so a follower
 * picks it up once complete.
 */
export async function readLogTail(
  filePath: string,
  size: number,
  { maxLines = LOG_TAIL_MAX_LINES, maxBytes = LOG_TAIL_MAX_BYTES } = {},
): Promise<LogTail> {
  const start = Math.max(0, size - maxBytes);
  const buffer = Buffer.alloc(size - start);
  const handle = await open(filePath, 'r');
  try {
    await handle.read(buffer, 0, buffer.length, start);
  } finally {
    await handle.close();
  }

  // Reading from the middle of the file: the first line is incomplete, skip it.
  const firstLine = start > 0 ? buffer.indexOf(NEWLINE) + 1 : 0;
  const lastNewline = buffer.lastIndexOf(NEWLINE);
  if (firstLine === 0 && start > 0) {
    // One line longer than the window: nothing complete to show yet.
    const totalLines = await countLines(filePath, start);
    return {
      lines: [],
      offset: start,
      truncated: true,
      firstLineNumber: totalLines + 1,
      totalLines,
    };
  }
  const complete = lastNewline >= firstLine ? buffer.subarray(firstLine, lastNewline + 1) : null;
  const { lines } = complete ? splitLines(complete, start + firstLine) : { lines: [] };
  const offset = lastNewline >= 0 ? start + lastNewline + 1 : start;

  const shown = lines.slice(-maxLines);
  const totalLines = await countLines(filePath, offset);
  return {
    lines: shown,
    offset,
    truncated: start > 0 || lines.length > maxLines,
    firstLineNumber: Math.max(1, totalLines - shown.length + 1),
    totalLines,
  };
}

export interface LogFollowerOptions {
  /** The file to follow; `null` waits for `resolve` to find one, then follows it from 0. */
  file: { name: string; path: string } | null;
  /** Byte offset to continue from (from the initial load). */
  from: number;
  /** Finds the file to follow while none is known (e.g. the server has not written it yet). */
  resolve: () => Promise<{ name: string; path: string } | null>;
  onLines: (event: ServerLogLinesEventDto) => void;
  intervalMs?: number;
  maxBytesPerTick?: number;
  maxLinesPerEvent?: number;
}

/**
 * Follows a growing log file by polling (DSM-00206): every tick reads what was appended since
 * `offset` and emits complete lines in batches with the byte offset after each batch. Polling is
 * used rather than file watching because watch events for appended files are unreliable on
 * Windows. A partial last line waits for its newline; a file that shrinks is followed again
 * from its start.
 */
export class LogFollower {
  private file: { name: string; path: string } | null;
  private offset: number;
  private pending: Buffer = Buffer.alloc(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private readonly intervalMs: number;
  private readonly maxBytesPerTick: number;
  private readonly maxLinesPerEvent: number;

  constructor(private readonly options: LogFollowerOptions) {
    this.file = options.file;
    this.offset = options.file ? options.from : 0;
    this.intervalMs = options.intervalMs ?? 250;
    this.maxBytesPerTick = options.maxBytesPerTick ?? 1024 * 1024;
    this.maxLinesPerEvent = options.maxLinesPerEvent ?? 500;
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** One poll; public for tests. Overlapping calls are skipped. */
  async tick(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      await this.poll();
    } finally {
      this.busy = false;
    }
  }

  private async poll(): Promise<void> {
    if (!this.file) {
      this.file = await this.options.resolve();
      if (!this.file) {
        return;
      }
    }
    const current = await statFile(this.file.path, this.file.name);
    if (!current) {
      return; // Gone for now (e.g. being replaced); try again next tick.
    }
    if (current.size < this.offset) {
      // Replaced or truncated: follow the new content from the start.
      this.offset = 0;
      this.pending = Buffer.alloc(0);
    }
    if (current.size === this.offset) {
      return;
    }

    const length = Math.min(current.size - this.offset, this.maxBytesPerTick);
    const chunk = Buffer.alloc(length);
    const handle = await open(current.path, 'r');
    try {
      await handle.read(chunk, 0, length, this.offset);
    } finally {
      await handle.close();
    }
    const base = this.offset - this.pending.length;
    this.offset += length;
    this.emit(Buffer.concat([this.pending, chunk]), base);
  }

  private emit(data: Buffer, base: number): void {
    const lastNewline = data.lastIndexOf(NEWLINE);
    if (lastNewline === -1 && data.length <= MAX_PENDING_BYTES) {
      this.pending = data;
      return;
    }
    // Complete lines, or a runaway line without newline flushed as one (cut) line.
    const completeLength = lastNewline === -1 ? data.length : lastNewline + 1;
    const complete =
      lastNewline === -1
        ? Buffer.concat([data, Buffer.from([NEWLINE])])
        : data.subarray(0, completeLength);
    this.pending = data.subarray(completeLength);

    const { lines, ends } = splitLines(complete, base);
    const file = (this.file as { name: string }).name;
    for (let index = 0; index < lines.length; index += this.maxLinesPerEvent) {
      const batch = lines.slice(index, index + this.maxLinesPerEvent);
      const end = Math.min(ends[index + batch.length - 1], base + completeLength);
      this.options.onLines({ file, lines: batch, offset: end });
    }
  }
}
