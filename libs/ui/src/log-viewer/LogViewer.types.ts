import type { ReactNode } from 'react';

export type LogSeverity = 'error' | 'warning';

export interface LogViewerProps {
  /** All lines to show; the viewer renders only the visible window (virtualised). */
  lines: readonly string[];

  /** Line number of `lines[0]` in the file. @default 1 */
  firstLineNumber?: number;

  /**
   * Whether the view sticks to the newest line. Controlled when set; the viewer still reports
   * changes (user scrolls up → `false`, back to the bottom or "Jump to latest" → `true`).
   */
  following?: boolean;
  onFollowingChange?: (following: boolean) => void;

  /** Colours a line; defaults to `detectLogSeverity` (DayZ RPT/ADM/script wording). */
  getSeverity?: (line: string) => LogSeverity | null;

  /** Accessible name of the log region. @default 'Log' */
  label?: string;

  /** Height of the scroll area in px (fixed so windowing is cheap). @default 480 */
  height?: number;

  /** Shown when there are no lines. @default 'No log lines yet.' */
  emptyMessage?: ReactNode;

  className?: string;
}
