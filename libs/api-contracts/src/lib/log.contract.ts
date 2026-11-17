import { z } from 'zod';

/** Server log kinds DSM can show (DSM-00117). ADM and script logs follow in DSM-00212/00213. */
export const SERVER_LOG_KIND_VALUES = ['rpt'] as const;
export const serverLogKindSchema = z.enum(SERVER_LOG_KIND_VALUES);
export type ServerLogKind = z.infer<typeof serverLogKindSchema>;

/** Most lines the initial load returns (DSM-00206). */
export const LOG_TAIL_MAX_LINES = 1000;
/** Most bytes read from the end of the file for the initial load. */
export const LOG_TAIL_MAX_BYTES = 512 * 1024;
/** Lines longer than this are cut (with `…`) so one runaway line cannot flood the viewer. */
export const LOG_LINE_MAX_LENGTH = 16 * 1024;

export const serverLogFileSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().nonnegative(),
  modifiedAt: z.string().datetime(),
});
export type ServerLogFileDto = z.infer<typeof serverLogFileSchema>;

/** `GET /servers/:id/logs/:kind`: the end of the newest log file, read on demand. */
export const serverLogTailSchema = z.object({
  kind: serverLogKindSchema,
  file: serverLogFileSchema.nullable(),
  lines: z.array(z.string()),
  /** Byte position after the last complete line; pass as `from` to the stream. */
  offset: z.number().int().nonnegative(),
  /** Older content exists before the first returned line. */
  truncated: z.boolean(),
  /** 1-based line number of `lines[0]` in the file (line numbers in the viewer). */
  firstLineNumber: z.number().int().positive(),
  /** Complete lines in the file up to `offset`. */
  totalLines: z.number().int().nonnegative(),
  /** The server process is active, so the file may still grow. */
  live: z.boolean(),
});
export type ServerLogTailDto = z.infer<typeof serverLogTailSchema>;

/** Query of `GET /servers/:id/logs/:kind/stream` (besides the SSE `ticket`). */
export const serverLogStreamQuerySchema = z.object({
  ticket: z.string().optional(),
  file: z.string().min(1).optional(),
  from: z.coerce.number().int().nonnegative().default(0),
});
export type ServerLogStreamQueryDto = z.input<typeof serverLogStreamQuerySchema>;

/** SSE event of the log stream: complete lines appended after the previous `offset`. */
export const LOG_LINES_EVENT = 'log.lines';
export const serverLogLinesEventSchema = z.object({
  file: z.string().min(1),
  lines: z.array(z.string()),
  offset: z.number().int().nonnegative(),
});
export type ServerLogLinesEventDto = z.infer<typeof serverLogLinesEventSchema>;
