import type { Ref } from 'react';

export type CodeEditorLanguage = 'bohemia-cfg' | 'plain';

export type CodeEditorDiagnosticSeverity = 'error' | 'warning';

/** Positions are 1-based; `endColumn` is exclusive. Out-of-range positions are clamped to the document. */
export interface CodeEditorDiagnostic {
  severity: CodeEditorDiagnosticSeverity;
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

/** Character offsets in the current value; `to` is exclusive. Insertions exactly at a boundary are allowed. */
export interface CodeEditorReadOnlyRange {
  from: number;
  to: number;
}

export interface CodeEditorHandle {
  focus(): void;
  /** Moves the cursor to the start of the 1-based line, scrolls it into view and focuses the editor. */
  revealLine(line: number): void;
}

export interface CodeEditorProps {
  /** Controlled document text */
  value: string;

  /** Called with the full document text after every user edit */
  onChange?: (value: string) => void;

  /** Syntax mode; defaults to `plain` */
  language?: CodeEditorLanguage;

  /** Inline diagnostics rendered as underlines, gutter markers and hover tooltips */
  diagnostics?: readonly CodeEditorDiagnostic[];

  /** Rejects all user edits while keeping selection, search and copy available */
  readOnly?: boolean;

  /** Protected spans; any user edit that deletes or inserts inside one is rejected as a whole */
  readOnlyRanges?: readonly CodeEditorReadOnlyRange[];

  /** Root container styling escape hatch; set a height here to make the editor scroll internally */
  containerClassName?: string;

  /** Accessible name of the editable content element */
  ariaLabel?: string;

  /** React 19 imperative handle */
  ref?: Ref<CodeEditorHandle>;
}

export type CodeDiffViewLayout = 'unified' | 'side-by-side';

export interface CodeDiffViewProps {
  /** Baseline text (left side / deleted chunks) */
  original: string;

  /** Changed text (right side / main document) */
  modified: string;

  /** Syntax mode; defaults to `plain` */
  language?: CodeEditorLanguage;

  /** Defaults to `unified` */
  layout?: CodeDiffViewLayout;

  /** Root container styling escape hatch */
  containerClassName?: string;

  /** Accessible name of the diff region */
  ariaLabel?: string;
}
