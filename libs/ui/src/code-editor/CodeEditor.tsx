import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from 'react';

import { setDiagnostics } from '@codemirror/lint';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import {
  ariaLabelExtension,
  createCompartments,
  editorSetup,
  externalSyncAnnotations,
  isExternalSync,
  languageExtension,
  readOnlyExtension,
  readOnlyRangesExtension,
  setReadOnlyRanges,
} from './CodeEditor.extensions';
import type {
  CodeEditorDiagnostic,
  CodeEditorProps,
  CodeEditorReadOnlyRange,
} from './CodeEditor.types';
import { clampLine, computeTextChange, toLintDiagnostics } from './CodeEditor.utils';

export type { CodeEditorProps };

const NO_DIAGNOSTICS: readonly CodeEditorDiagnostic[] = [];
const NO_RANGES: readonly CodeEditorReadOnlyRange[] = [];

export function CodeEditor({
  ref,
  value,
  onChange,
  language = 'plain',
  diagnostics = NO_DIAGNOSTICS,
  readOnly = false,
  readOnlyRanges = NO_RANGES,
  containerClassName = '',
  ariaLabel,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [compartments] = useState(createCompartments);

  const emitChange = useEffectEvent((next: string) => {
    onChange?.(next);
  });

  const createView = useEffectEvent(
    (parent: HTMLElement) =>
      new EditorView({
        parent,
        state: EditorState.create({
          doc: value,
          extensions: [
            editorSetup(),
            compartments.language.of(languageExtension(language)),
            compartments.readOnly.of(readOnlyExtension(readOnly)),
            compartments.ariaLabel.of(ariaLabelExtension(ariaLabel)),
            readOnlyRangesExtension(readOnlyRanges),
            EditorView.updateListener.of(update => {
              if (update.docChanged && !update.transactions.some(isExternalSync)) {
                emitChange(update.state.doc.toString());
              }
            }),
          ],
        }),
      }),
  );

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const view = createView(parent);
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const change = computeTextChange(view.state.doc.toString(), value);
    if (!change) return;
    view.dispatch({
      changes: change,
      annotations: [...externalSyncAnnotations(), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.language.reconfigure(languageExtension(language)),
    });
  }, [compartments, language]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.readOnly.reconfigure(readOnlyExtension(readOnly)),
    });
  }, [compartments, readOnly]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.ariaLabel.reconfigure(ariaLabelExtension(ariaLabel)),
    });
  }, [compartments, ariaLabel]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setReadOnlyRanges(readOnlyRanges) });
  }, [readOnlyRanges]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(setDiagnostics(view.state, toLintDiagnostics(view.state.doc, diagnostics)));
  }, [diagnostics]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        viewRef.current?.focus();
      },
      revealLine: (line: number) => {
        const view = viewRef.current;
        if (!view) return;
        const position = view.state.doc.line(clampLine(view.state.doc, line)).from;
        view.dispatch({
          selection: { anchor: position },
          effects: EditorView.scrollIntoView(position, { y: 'center' }),
        });
        view.focus();
      },
    }),
    [],
  );

  const surfaceClasses = readOnly
    ? 'bg-[var(--color-surface-subtle)]/50'
    : 'bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]';

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-lg border border-[var(--color-border)] ${surfaceClasses} shadow-xs transition-colors ${containerClassName}`.trim()}
    />
  );
}
