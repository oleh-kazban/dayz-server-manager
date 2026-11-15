import type {
  ConfigDiagnosticCode,
  ConfigDiagnosticDto,
  ConfigDiagnosticSeverity,
} from '@aegis/api-contracts';

import type { SourceRange } from './types';

export class DiagnosticSink {
  readonly diagnostics: ConfigDiagnosticDto[] = [];
  private readonly lineStarts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; i += 1) {
      if (text.charCodeAt(i) === 10) {
        this.lineStarts.push(i + 1);
      }
    }
  }

  position(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.lineStarts[mid] <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return { line: low + 1, column: offset - this.lineStarts[low] + 1 };
  }

  report(
    severity: ConfigDiagnosticSeverity,
    code: ConfigDiagnosticCode,
    message: string,
    range: SourceRange,
  ): void {
    const start = this.position(range.start);
    const end = this.position(Math.max(range.end, range.start));
    this.diagnostics.push({
      severity,
      code,
      message,
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
    });
  }

  error(code: ConfigDiagnosticCode, message: string, range: SourceRange): void {
    this.report('error', code, message, range);
  }

  warning(code: ConfigDiagnosticCode, message: string, range: SourceRange): void {
    this.report('warning', code, message, range);
  }
}
