import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { lintGutter, lintKeymap } from '@codemirror/lint';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
  Annotation,
  Compartment,
  EditorState,
  type Extension,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';

import { aegisTheme } from './aegis-theme';
import { bohemiaCfg } from './bohemia-cfg.language';
import type {
  CodeDiffViewLayout,
  CodeEditorLanguage,
  CodeEditorReadOnlyRange,
} from './CodeEditor.types';
import { changeTouchesRanges, normalizeReadOnlyRanges } from './CodeEditor.utils';

const externalSync = /*@__PURE__*/ Annotation.define<boolean>();

const setReadOnlyRangesEffect =
  /*@__PURE__*/ StateEffect.define<readonly CodeEditorReadOnlyRange[]>();

const readOnlyMark = /*@__PURE__*/ Decoration.mark({ class: 'cm-aegis-readonly' });

const readOnlyRangesField = /*@__PURE__*/ StateField.define<readonly CodeEditorReadOnlyRange[]>({
  create: () => [],
  update(ranges, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setReadOnlyRangesEffect)) {
        return normalizeReadOnlyRanges(effect.value, tr.newDoc.length);
      }
    }
    if (!tr.docChanged) return ranges;
    const mapped = ranges.map(range => ({
      from: tr.changes.mapPos(range.from, 1),
      to: tr.changes.mapPos(range.to, -1),
    }));
    return normalizeReadOnlyRanges(mapped, tr.newDoc.length);
  },
  provide: field =>
    EditorView.decorations.from(field, ranges =>
      Decoration.set(
        ranges.map(range => readOnlyMark.range(range.from, range.to)),
        true,
      ),
    ),
});

function rejectProtectedEdits(tr: Transaction): boolean {
  if (tr.annotation(externalSync)) return true;
  const ranges = tr.startState.field(readOnlyRangesField, false) ?? [];
  if (ranges.length === 0) return true;
  let touches = false;
  tr.changes.iterChangedRanges((fromA, toA) => {
    touches ||= changeTouchesRanges(fromA, toA, ranges);
  });
  return !touches;
}

export function isExternalSync(tr: Transaction): boolean {
  return tr.annotation(externalSync) === true;
}

export function externalSyncAnnotations() {
  return [externalSync.of(true)];
}

export function readOnlyRangesExtension(initial: readonly CodeEditorReadOnlyRange[]): Extension {
  return [
    readOnlyRangesField.init(state => normalizeReadOnlyRanges(initial, state.doc.length)),
    EditorState.changeFilter.of(rejectProtectedEdits),
  ];
}

export function setReadOnlyRanges(ranges: readonly CodeEditorReadOnlyRange[]) {
  return setReadOnlyRangesEffect.of(ranges);
}

export function languageExtension(language: CodeEditorLanguage): Extension {
  return language === 'bohemia-cfg' ? bohemiaCfg() : [];
}

export function readOnlyExtension(readOnly: boolean): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({
      role: 'textbox',
      'aria-readonly': String(readOnly),
    }),
    ...(readOnly ? [] : [highlightActiveLine(), highlightActiveLineGutter()]),
  ];
}

export function ariaLabelExtension(ariaLabel: string | undefined): Extension {
  return ariaLabel ? EditorView.contentAttributes.of({ 'aria-label': ariaLabel }) : [];
}

export interface CodeEditorCompartments {
  language: Compartment;
  readOnly: Compartment;
  ariaLabel: Compartment;
}

export function createCompartments(): CodeEditorCompartments {
  return { language: new Compartment(), readOnly: new Compartment(), ariaLabel: new Compartment() };
}

export function editorSetup(): Extension {
  return [
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    bracketMatching(),
    highlightSelectionMatches(),
    lintGutter(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...lintKeymap]),
    aegisTheme(),
  ];
}

function diffSetup(language: CodeEditorLanguage): Extension {
  return [
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...searchKeymap]),
    aegisTheme(),
    languageExtension(language),
    readOnlyExtension(true),
  ];
}

const COLLAPSE_UNCHANGED = { margin: 3, minSize: 4 };

export interface DiffViewOptions {
  parent: HTMLElement;
  original: string;
  modified: string;
  language: CodeEditorLanguage;
  layout: CodeDiffViewLayout;
}

export function createDiffView({ parent, original, modified, language, layout }: DiffViewOptions): {
  destroy(): void;
} {
  if (layout === 'side-by-side') {
    return new MergeView({
      parent,
      a: { doc: original, extensions: diffSetup(language) },
      b: { doc: modified, extensions: diffSetup(language) },
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: COLLAPSE_UNCHANGED,
    });
  }
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: modified,
      extensions: [
        diffSetup(language),
        unifiedMergeView({
          original,
          gutter: true,
          highlightChanges: true,
          mergeControls: false,
          collapseUnchanged: COLLAPSE_UNCHANGED,
        }),
      ],
    }),
  });
}
