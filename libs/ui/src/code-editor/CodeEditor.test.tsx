import { createRef, StrictMode } from 'react';

import { deleteCharBackward, insertNewlineAndIndent, undo, undoDepth } from '@codemirror/commands';
import { highlightingFor, language as languageFacet } from '@codemirror/language';
import { diagnosticCount, forEachDiagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { CodeEditor } from './CodeEditor';
import type { CodeEditorDiagnostic, CodeEditorHandle, CodeEditorProps } from './CodeEditor.types';

const CONFIG = 'hostname = "DSM";\npassword = "***";\nmaxPlayers = 60;';
const PASSWORD_LINE = { from: 18, to: 35 };

function getView(container: HTMLElement): EditorView {
  const editor = container.querySelector<HTMLElement>('.cm-editor');
  if (!editor) throw new Error('CodeMirror editor not mounted');
  const view = EditorView.findFromDOM(editor);
  if (!view) throw new Error('EditorView not found');
  return view;
}

function renderEditor(props: Partial<CodeEditorProps> = {}) {
  const onChange = vi.fn<(value: string) => void>();
  const allProps: CodeEditorProps = { value: CONFIG, onChange, ...props };
  const utils = render(<CodeEditor {...allProps} />);
  const view = getView(utils.container);
  const rerenderWith = (next: Partial<CodeEditorProps>) =>
    utils.rerender(<CodeEditor {...allProps} {...next} />);
  return { ...utils, view, onChange, rerenderWith };
}

function typeAt(view: EditorView, from: number, insert: string, to = from) {
  act(() => {
    view.dispatch({ changes: { from, to, insert }, userEvent: 'input.type' });
  });
}

// jsdom has no layout for Range; CodeMirror's animation-frame measure pass calls these after async interactions.
const rangeProto = Range.prototype as Partial<
  Pick<Range, 'getClientRects' | 'getBoundingClientRect'>
>;
const originalRangeLayout = {
  getClientRects: rangeProto.getClientRects,
  getBoundingClientRect: rangeProto.getBoundingClientRect,
};

beforeAll(() => {
  rangeProto.getClientRects = () => [] as unknown as DOMRectList;
  rangeProto.getBoundingClientRect = () => new DOMRect();
});

afterAll(() => {
  rangeProto.getClientRects = originalRangeLayout.getClientRects;
  rangeProto.getBoundingClientRect = originalRangeLayout.getBoundingClientRect;
});

describe('CodeEditor', () => {
  describe('rendering', () => {
    it('shows the value with line numbers in a plain-text editor by default', () => {
      const { container, view } = renderEditor();

      expect(view.state.doc.toString()).toBe(CONFIG);
      expect(screen.getByText('hostname = "DSM";')).toBeInTheDocument();
      expect(container.querySelector('.cm-lineNumbers')).toHaveTextContent('123');
      expect(view.state.facet(languageFacet)).toBeNull();
      expect(view.state.readOnly).toBe(false);
      expect(view.contentDOM).toHaveAttribute('aria-readonly', 'false');
      expect(view.contentDOM).not.toHaveAttribute('aria-label');
    });

    it('applies the container class and accessible name', () => {
      const { container, view } = renderEditor({
        containerClassName: 'h-96',
        ariaLabel: 'serverDZ.cfg',
      });

      expect(container.firstElementChild).toHaveClass('h-96', 'rounded-lg');
      expect(screen.getByRole('textbox', { name: 'serverDZ.cfg' })).toBe(view.contentDOM);
    });

    it('highlights bohemia-cfg syntax with the Aegis theme', () => {
      const { container, view } = renderEditor({
        value: '// managed by DSM\nclass Missions {};',
        language: 'bohemia-cfg',
      });

      expect(view.state.facet(languageFacet)?.name).toBe('bohemia-cfg');
      const commentClass = highlightingFor(view.state, [tags.comment]);
      const keywordClass = highlightingFor(view.state, [tags.keyword]);
      expect(commentClass).toBeTruthy();
      expect(container.querySelector(`.${commentClass}`)).toHaveTextContent('// managed by DSM');
      expect(container.querySelector(`.${keywordClass}`)).toHaveTextContent('class');
    });
  });

  describe('user edits', () => {
    it('reports the full document after a user edit and records it in undo history', () => {
      const { view, onChange } = renderEditor();

      typeAt(view, CONFIG.length, '\nport = 2302;');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(`${CONFIG}\nport = 2302;`);
      expect(undoDepth(view.state)).toBe(1);
    });

    it('does not report selection-only updates', () => {
      const { view, onChange } = renderEditor();

      act(() => {
        view.dispatch({ selection: { anchor: 5 } });
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts edits when no onChange handler is provided', () => {
      const { view } = renderEditor({ onChange: undefined });

      typeAt(view, 0, '// ');

      expect(view.state.doc.line(1).text).toBe('// hostname = "DSM";');
    });
  });

  describe('controlled value', () => {
    it('applies an external value without calling onChange or adding an undo step', () => {
      const { view, onChange, rerenderWith } = renderEditor();
      const next = CONFIG.replace('60', '100');

      rerenderWith({ value: next });

      expect(view.state.doc.toString()).toBe(next);
      expect(onChange).not.toHaveBeenCalled();
      expect(undoDepth(view.state)).toBe(0);
      expect(undo(view)).toBe(false);
      expect(view.state.doc.toString()).toBe(next);
    });

    it('keeps the cursor in an untouched region when the value changes elsewhere', () => {
      const { view, rerenderWith } = renderEditor();
      act(() => {
        view.dispatch({ selection: { anchor: 4 } });
      });

      rerenderWith({ value: `${CONFIG}\nport = 2302;` });

      expect(view.state.selection.main.head).toBe(4);
    });

    it('does not dispatch when the controlled value echoes the current document', () => {
      const { view, onChange, rerenderWith } = renderEditor();
      typeAt(view, 0, '// ');
      const dispatch = vi.spyOn(view, 'dispatch');

      rerenderWith({ value: onChange.mock.calls[0][0] });

      expect(dispatch).not.toHaveBeenCalled();
      expect(undoDepth(view.state)).toBe(1);
    });

    it('applies external values inside read-only ranges', () => {
      const { view, rerenderWith } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });
      const next = CONFIG.replace('"***"', '"<redacted>"');

      rerenderWith({ value: next });

      expect(view.state.doc.toString()).toBe(next);
    });
  });

  describe('read-only mode', () => {
    it('sets contenteditable="false", preserves textbox + aria-readonly, and suppresses active-line & focus-ring affordances when readOnly is true', () => {
      const { container, view, onChange } = renderEditor({ readOnly: true });

      expect(view.state.readOnly).toBe(true);
      expect(screen.getByRole('textbox')).toBe(view.contentDOM);
      expect(view.contentDOM).toHaveAttribute('contenteditable', 'false');
      expect(view.contentDOM).toHaveAttribute('aria-readonly', 'true');
      expect(container.querySelector('.cm-activeLine')).toBeNull();
      expect(container.querySelector('.cm-activeLineGutter')).toBeNull();

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('bg-[var(--color-surface-subtle)]/50');
      expect(wrapper).not.toHaveClass('focus-within:border-[var(--color-primary)]');
      expect(wrapper).not.toHaveClass('focus-within:ring-1');

      act(() => {
        view.dispatch({ selection: { anchor: CONFIG.length } });
      });
      expect(deleteCharBackward(view)).toBe(false);
      expect(insertNewlineAndIndent(view)).toBe(false);
      expect(view.state.doc.toString()).toBe(CONFIG);
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
      [true, CONFIG],
      [false, `${CONFIG}\n`],
    ])('with readOnly=%s pressing Enter at the end leaves %j', async (readOnly, expected) => {
      const user = userEvent.setup();
      const { view } = renderEditor({ readOnly });
      act(() => {
        view.dispatch({ selection: { anchor: CONFIG.length } });
        view.focus();
      });

      await user.keyboard('{Enter}');

      expect(view.state.doc.toString()).toBe(expected);
    });

    it('restores contenteditable="true", active-line highlight, and focus-ring classes when readOnly toggles to false', () => {
      const { container, view, rerenderWith } = renderEditor({ readOnly: true });

      expect(view.contentDOM).toHaveAttribute('contenteditable', 'false');
      expect(container.querySelector('.cm-activeLine')).toBeNull();
      expect(container.querySelector('.cm-activeLineGutter')).toBeNull();
      expect(container.firstElementChild).not.toHaveClass(
        'focus-within:border-[var(--color-primary)]',
      );
      expect(container.firstElementChild).not.toHaveClass('focus-within:ring-1');

      rerenderWith({ readOnly: false });
      act(() => {
        view.dispatch({ selection: { anchor: CONFIG.length } });
      });

      expect(view.contentDOM).toHaveAttribute('contenteditable', 'true');
      expect(view.contentDOM).toHaveAttribute('aria-readonly', 'false');
      expect(container.querySelector('.cm-activeLine')).not.toBeNull();
      expect(container.querySelector('.cm-activeLineGutter')).not.toBeNull();
      expect(container.firstElementChild).toHaveClass(
        'bg-[var(--color-surface)]',
        'focus-within:border-[var(--color-primary)]',
        'focus-within:ring-1',
        'focus-within:ring-[var(--color-primary)]',
      );
      expect(deleteCharBackward(view)).toBe(true);
      expect(view.state.doc.toString()).toBe(CONFIG.slice(0, -1));
    });
  });

  describe('read-only ranges', () => {
    it('marks protected spans', () => {
      const { container } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      expect(container.querySelector('.cm-aegis-readonly')).toHaveTextContent('password = "***";');
    });

    it.each([
      ['inserting strictly inside', PASSWORD_LINE.from + 3, PASSWORD_LINE.from + 3, 'x'],
      ['deleting inside', PASSWORD_LINE.from + 12, PASSWORD_LINE.from + 16, ''],
      ['replacing across the start boundary', PASSWORD_LINE.from - 2, PASSWORD_LINE.from + 1, 'z'],
    ])('rejects %s a protected span as a whole', (_label, from, to, insert) => {
      const { view, onChange } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      act(() => {
        view.dispatch({
          changes: [
            { from: 0, insert: '// ' },
            { from, to, insert },
          ],
          userEvent: 'input',
        });
      });

      expect(view.state.doc.toString()).toBe(CONFIG);
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
      ['start', PASSWORD_LINE.from],
      ['end', PASSWORD_LINE.to],
    ])('allows inserting exactly at the %s boundary', (_label, at) => {
      const { view, onChange } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      typeAt(view, at, '#');

      expect(view.state.doc.sliceString(at, at + 1)).toBe('#');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('maps protected spans through edits made before them', () => {
      const { view, container } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      typeAt(view, 0, '// ');
      // Protected span is now [21, 38).
      typeAt(view, 21, '', 23);
      expect(view.state.doc.toString()).toBe(`// ${CONFIG}`);

      typeAt(view, 20, '!');
      typeAt(view, 39, '!');
      expect(view.state.doc.toString()).toBe(
        '// hostname = "DSM";!\npassword = "***";!\nmaxPlayers = 60;',
      );
      expect(container.querySelector('.cm-aegis-readonly')).toHaveTextContent('password = "***";');
      typeAt(view, 25, 'x');
      expect(view.state.doc.line(2).text).toBe('password = "***";!');
    });

    it('replaces the protected spans when the prop changes', () => {
      const { view, rerenderWith } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      rerenderWith({ readOnlyRanges: [{ from: 0, to: 17 }] });

      typeAt(view, PASSWORD_LINE.from + 3, 'x');
      expect(view.state.doc.line(2).text).toBe('pasxsword = "***";');
      typeAt(view, 3, 'x');
      expect(view.state.doc.line(1).text).toBe('hostname = "DSM";');
    });

    it('keeps protected spans when unrelated configuration changes', () => {
      const { view, rerenderWith } = renderEditor({ readOnlyRanges: [PASSWORD_LINE] });

      rerenderWith({ language: 'bohemia-cfg', ariaLabel: 'serverDZ.cfg' });
      typeAt(view, PASSWORD_LINE.from + 3, 'x');

      expect(view.state.doc.toString()).toBe(CONFIG);
      expect(view.contentDOM).toHaveAttribute('aria-label', 'serverDZ.cfg');
      expect(view.state.facet(languageFacet)?.name).toBe('bohemia-cfg');
    });
  });

  describe('diagnostics', () => {
    const unknownKey: CodeEditorDiagnostic = {
      severity: 'error',
      message: 'Unknown key "hostnme"',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 9,
    };

    function lintRanges(view: EditorView) {
      const found: { from: number; to: number; severity: string; message: string }[] = [];
      forEachDiagnostic(view.state, (d, from, to) =>
        found.push({ from, to, severity: d.severity, message: d.message }),
      );
      return found;
    }

    it('renders underlines and gutter markers for each diagnostic', () => {
      const { view, container } = renderEditor({
        diagnostics: [
          unknownKey,
          {
            ...unknownKey,
            severity: 'warning',
            message: 'Low slot count',
            line: 3,
            column: 14,
            endLine: 3,
            endColumn: 16,
          },
        ],
      });

      expect(diagnosticCount(view.state)).toBe(2);
      expect(lintRanges(view)).toEqual([
        { from: 0, to: 8, severity: 'error', message: 'Unknown key "hostnme"' },
        { from: 49, to: 51, severity: 'warning', message: 'Low slot count' },
      ]);
      expect(container.querySelector('.cm-lintRange-error')).toHaveTextContent('hostname');
      expect(container.querySelector('.cm-lintRange-warning')).toHaveTextContent('60');
      expect(container.querySelectorAll('.cm-lint-marker-error')).toHaveLength(1);
      expect(container.querySelectorAll('.cm-lint-marker-warning')).toHaveLength(1);
    });

    it('clamps out-of-range positions into the document', () => {
      const { view } = renderEditor({
        diagnostics: [{ ...unknownKey, line: 0, column: -4, endLine: 99, endColumn: 999 }],
      });

      expect(lintRanges(view)).toEqual([
        { from: 0, to: CONFIG.length, severity: 'error', message: 'Unknown key "hostnme"' },
      ]);
    });

    it('replaces and clears diagnostics when the prop changes', () => {
      const { view, rerenderWith } = renderEditor({ diagnostics: [unknownKey] });

      rerenderWith({ diagnostics: [{ ...unknownKey, line: 2, endLine: 2 }] });
      expect(lintRanges(view)).toEqual([
        { from: 18, to: 26, severity: 'error', message: 'Unknown key "hostnme"' },
      ]);

      rerenderWith({ diagnostics: [] });
      expect(diagnosticCount(view.state)).toBe(0);
    });
  });

  describe('imperative handle', () => {
    it('focuses the editor', () => {
      const ref = createRef<CodeEditorHandle>();
      const { view } = renderEditor({ ref });

      act(() => ref.current?.focus());

      expect(view.hasFocus).toBe(true);
    });

    it.each([
      [3, 36],
      [0, 0],
      [42, 36],
    ])('revealLine(%s) moves the cursor to offset %s, scrolls and focuses', (line, offset) => {
      const ref = createRef<CodeEditorHandle>();
      const { view } = renderEditor({ ref });
      act(() => {
        view.dispatch({ selection: { anchor: 10 } });
      });
      const dispatch = vi.spyOn(view, 'dispatch');

      act(() => ref.current?.revealLine(line));

      expect(view.state.selection.main.head).toBe(offset);
      expect(view.hasFocus).toBe(true);
      expect(dispatch.mock.calls[0][0]).toMatchObject({ effects: expect.anything() });
    });
  });

  describe('lifecycle', () => {
    it('keeps a single working editor under StrictMode double mounting', () => {
      const onChange = vi.fn<(value: string) => void>();
      const { container } = render(
        <StrictMode>
          <CodeEditor value={CONFIG} onChange={onChange} readOnlyRanges={[PASSWORD_LINE]} />
        </StrictMode>,
      );

      expect(container.querySelectorAll('.cm-editor')).toHaveLength(1);
      const view = getView(container);
      typeAt(view, PASSWORD_LINE.from + 3, 'x');
      typeAt(view, 0, '// ');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(`// ${CONFIG}`);
    });

    it('destroys the editor view on unmount', () => {
      const ref = createRef<CodeEditorHandle>();
      const { view, unmount, container } = renderEditor({ ref });
      const handle = ref.current!;
      const editorDom = view.dom;

      unmount();

      expect(editorDom.parentNode).toBeNull();
      expect(container).toBeEmptyDOMElement();
      expect(ref.current).toBeNull();
      expect(() => handle.focus()).not.toThrow();
      expect(() => handle.revealLine(1)).not.toThrow();
    });
  });
});
