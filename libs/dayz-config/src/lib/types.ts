export interface SourceRange {
  start: number;
  end: number;
}

export type ScalarValue =
  | { kind: 'string'; value: string; raw: string; range: SourceRange }
  | { kind: 'number'; value: number; raw: string; range: SourceRange }
  | { kind: 'word'; value: string; raw: string; range: SourceRange };

export type AssignmentValue = ScalarValue | ScalarValue[] | null;

export interface ConfigAssignment {
  type: 'assignment';
  key: string;
  isArray: boolean;
  value: AssignmentValue;
  keyRange: SourceRange;
  valueRange: SourceRange;
  statementRange: SourceRange;
}

export interface ConfigClassBlock {
  type: 'class';
  name: string;
  nameRange: SourceRange;
  entries: ConfigEntry[];
  range: SourceRange;
}

export type ConfigEntry = ConfigAssignment | ConfigClassBlock;

export interface ConfigDocument {
  text: string;
  entries: ConfigEntry[];
}
