import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

function tint(token: string, percent: number): string {
  return `color-mix(in srgb, var(${token}) ${percent}%, transparent)`;
}

function createThemeSpec() {
  return {
    '&.cm-editor': {
      height: '100%',
      color: 'var(--color-text-main)',
      backgroundColor: 'var(--color-surface)',
      fontSize: '12px',
    },
    '&.cm-editor.cm-focused': { outline: 'none' },
    '&.cm-editor .cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
    '&.cm-editor .cm-content': { caretColor: 'var(--color-primary)', padding: '6px 0' },
    '&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor': {
      borderLeft: '2px solid var(--color-primary)',
    },
    '&.cm-editor .cm-selectionBackground, &.cm-editor .cm-content ::selection': {
      background: tint('--color-primary', 16),
    },
    '&.cm-editor.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      background: tint('--color-primary', 26),
    },
    '&.cm-editor .cm-gutters': {
      backgroundColor: 'var(--color-surface-subtle)',
      color: 'var(--color-text-muted)',
      borderRight: '1px solid var(--color-border)',
    },
    '&.cm-editor .cm-activeLine': { backgroundColor: tint('--color-primary', 6) },
    '&.cm-editor .cm-activeLineGutter': {
      backgroundColor: tint('--color-primary', 10),
      color: 'var(--color-text-main)',
    },
    '&.cm-editor .cm-specialChar': { color: 'var(--color-danger)' },
    '&.cm-editor .cm-matchingBracket, &.cm-editor.cm-focused .cm-matchingBracket': {
      backgroundColor: tint('--color-primary', 18),
      outline: '1px solid var(--color-primary-border)',
    },
    '&.cm-editor .cm-nonmatchingBracket, &.cm-editor.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: tint('--color-danger', 18),
      color: 'var(--color-danger)',
    },
    '&.cm-editor .cm-selectionMatch': { backgroundColor: tint('--color-primary', 12) },
    '&.cm-editor .cm-searchMatch': {
      backgroundColor: tint('--color-warning', 18),
      outline: '1px solid var(--color-warning-border)',
    },
    '&.cm-editor .cm-searchMatch-selected': { backgroundColor: tint('--color-warning', 38) },
    '&.cm-editor .cm-panels': {
      backgroundColor: 'var(--color-surface-subtle)',
      color: 'var(--color-text-main)',
      fontFamily: 'var(--font-sans)',
    },
    '&.cm-editor .cm-panels-top': { borderBottom: '1px solid var(--color-border)' },
    '&.cm-editor .cm-panels-bottom': { borderTop: '1px solid var(--color-border)' },
    '&.cm-editor .cm-panel.cm-search label': { fontSize: '12px' },
    '&.cm-editor .cm-panel.cm-search [name=close]': { color: 'var(--color-text-muted)' },
    '&.cm-editor .cm-textfield': {
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text-main)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      fontSize: '12px',
    },
    '&.cm-editor .cm-textfield:focus': {
      outline: 'none',
      borderColor: 'var(--color-primary)',
    },
    '&.cm-editor .cm-button, &.cm-editor .cm-button:active': {
      backgroundImage: 'none',
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text-main)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      fontSize: '12px',
    },
    '&.cm-editor .cm-button:hover': { backgroundColor: 'var(--color-surface-hover)' },
    '&.cm-editor .cm-tooltip': {
      backgroundColor: 'var(--color-surface-elevated)',
      color: 'var(--color-text-main)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      boxShadow: 'var(--shadow-dropdown)',
      overflow: 'hidden',
    },
    '&.cm-editor .cm-diagnostic': { fontFamily: 'var(--font-sans)', fontSize: '12px' },
    '&.cm-editor .cm-diagnostic-error': { borderLeft: '3px solid var(--color-danger)' },
    '&.cm-editor .cm-diagnostic-warning': { borderLeft: '3px solid var(--color-warning)' },
    '&.cm-editor .cm-lintRange-error, &.cm-editor .cm-lintRange-warning': {
      backgroundImage: 'none',
      textDecorationLine: 'underline',
      textDecorationStyle: 'wavy',
      textDecorationSkipInk: 'none',
      textUnderlineOffset: '3px',
    },
    '&.cm-editor .cm-lintRange-error': { textDecorationColor: 'var(--color-danger)' },
    '&.cm-editor .cm-lintRange-warning': { textDecorationColor: 'var(--color-warning)' },
    '&.cm-editor .cm-lintRange-active': { backgroundColor: tint('--color-warning', 16) },
    '&.cm-editor .cm-lintPoint:after': { borderBottomColor: 'var(--color-danger)' },
    '&.cm-editor .cm-lintPoint-warning:after': { borderBottomColor: 'var(--color-warning)' },
    '&.cm-editor .cm-lint-marker': {
      content: 'normal',
      display: 'block',
      width: '0.6em',
      height: '0.6em',
      margin: '0.2em auto 0',
    },
    '&.cm-editor .cm-lint-marker-error': {
      borderRadius: '50%',
      backgroundColor: 'var(--color-danger)',
    },
    '&.cm-editor .cm-lint-marker-warning': {
      borderRadius: '1px',
      transform: 'rotate(45deg)',
      backgroundColor: 'var(--color-warning)',
    },
    '&.cm-editor .cm-panel.cm-panel-lint ul [aria-selected]': {
      backgroundColor: 'var(--color-surface-hover)',
    },
    '&.cm-editor .cm-panel.cm-panel-lint ul:focus [aria-selected]': {
      backgroundColor: tint('--color-primary', 18),
      color: 'var(--color-text-main)',
    },
    '&.cm-editor .cm-aegis-readonly': {
      backgroundColor: tint('--color-text-muted', 14),
      borderRadius: '2px',
      cursor: 'not-allowed',
    },
    '&.cm-editor.cm-merge-a .cm-changedLine, &.cm-editor .cm-deletedChunk': {
      backgroundColor: tint('--color-danger', 10),
    },
    '&.cm-editor.cm-merge-b .cm-changedLine, &.cm-editor .cm-inlineChangedLine': {
      backgroundColor: tint('--color-success', 10),
    },
    '&.cm-editor.cm-merge-a .cm-changedText, &.cm-editor .cm-deletedChunk .cm-deletedText, &.cm-editor.cm-merge-b .cm-deletedText':
      { background: tint('--color-danger', 28) },
    '&.cm-editor.cm-merge-b .cm-changedText': { background: tint('--color-success', 28) },
    '&.cm-editor.cm-merge-a .cm-changedLineGutter, &.cm-editor .cm-deletedLineGutter': {
      background: 'var(--color-danger)',
    },
    '&.cm-editor.cm-merge-b .cm-changedLineGutter': { background: 'var(--color-success)' },
    '&.cm-editor .cm-inlineChangedLineGutter': { background: 'var(--color-info)' },
    '&.cm-editor .cm-collapsedLines': {
      color: 'var(--color-text-secondary)',
      background: 'var(--color-surface-subtle)',
      fontFamily: 'var(--font-sans)',
    },
    '&.cm-editor .cm-collapsedLines:hover': { color: 'var(--color-primary)' },
  };
}

function createHighlightStyle() {
  return HighlightStyle.define([
    { tag: tags.comment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
    { tag: tags.keyword, color: 'var(--color-primary)', fontWeight: '600' },
    { tag: tags.typeName, color: 'var(--color-text-main)', fontWeight: '600' },
    { tag: tags.propertyName, color: 'var(--color-text-main)' },
    { tag: tags.variableName, color: 'var(--color-text-secondary)' },
    { tag: tags.string, color: 'var(--color-success)' },
    { tag: tags.number, color: 'var(--color-warning)' },
    { tag: tags.bool, color: 'var(--color-info)' },
    { tag: [tags.operator, tags.punctuation, tags.bracket], color: 'var(--color-text-secondary)' },
  ]);
}

let aegisThemeExtension: Extension | null = null;

export function aegisTheme(): Extension {
  aegisThemeExtension ??= [
    EditorView.theme(createThemeSpec()),
    syntaxHighlighting(createHighlightStyle()),
  ];
  return aegisThemeExtension;
}
