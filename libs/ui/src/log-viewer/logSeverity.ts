import type { LogSeverity } from './LogViewer.types';

const ERROR_PATTERN = /\b(?:error|exception|fatal|crash(?:ed)?)\b|\(E\)/i;
const WARNING_PATTERN = /\bwarning\b|\(W\)/i;

/**
 * Severity of a DayZ log line for colouring: `Error …`, `… exception …`, script `(E)` →
 * error; `Warning: …`, script `(W)` → warning; anything else → `null`.
 */
export function detectLogSeverity(line: string): LogSeverity | null {
  if (ERROR_PATTERN.test(line)) {
    return 'error';
  }
  if (WARNING_PATTERN.test(line)) {
    return 'warning';
  }
  return null;
}
