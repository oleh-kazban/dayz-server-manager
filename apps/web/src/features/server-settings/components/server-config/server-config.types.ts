import type { ConfigDiagnosticDto } from '@aegis/api-contracts';

export type ConfigEditSession =
  | { status: 'idle' }
  | { status: 'acquiring' }
  | { status: 'editing'; baseHash: string; baseContent: string; draft: string }
  | { status: 'lost'; draft: string | null };

export type ConfigEditorMode =
  | { kind: 'missing'; serverRunning: boolean }
  | { kind: 'running' }
  | { kind: 'locked-by-other'; holderName: string; acquiredAt: string }
  | { kind: 'lock-lost' }
  | { kind: 'viewing' }
  | { kind: 'editing' };

export type SaveConflictStep = 'none' | 'prompt' | 'confirm-overwrite';

export interface ServerValidationResult {
  content: string;
  diagnostics: ConfigDiagnosticDto[];
}
