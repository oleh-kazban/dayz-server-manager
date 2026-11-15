import { language as languageFacet } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeDiffView } from './CodeDiffView';
import type { CodeDiffViewProps } from './CodeEditor.types';

const ORIGINAL = 'hostname = "DSM";\nmaxPlayers = 60;\n';
const MODIFIED = 'hostname = "DSM";\nmaxPlayers = 100;\n';

function editorViews(container: HTMLElement): EditorView[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.cm-editor')).map(dom => {
    const view = EditorView.findFromDOM(dom);
    if (!view) throw new Error('EditorView not found');
    return view;
  });
}

function renderDiff(props: Partial<CodeDiffViewProps> = {}) {
  const allProps: CodeDiffViewProps = { original: ORIGINAL, modified: MODIFIED, ...props };
  const utils = render(<CodeDiffView {...allProps} />);
  const rerenderWith = (next: Partial<CodeDiffViewProps>) =>
    utils.rerender(<CodeDiffView {...allProps} {...next} />);
  return { ...utils, rerenderWith };
}

describe('CodeDiffView', () => {
  it('renders a read-only unified diff of plain text by default', () => {
    const { container } = renderDiff({ ariaLabel: 'Revision diff', containerClassName: 'h-80' });

    const group = screen.getByRole('group', { name: 'Revision diff' });
    expect(group).toHaveClass('h-80', 'rounded-lg');
    const views = editorViews(container);
    expect(views).toHaveLength(1);
    const [view] = views;
    expect(view.state.doc.toString()).toBe(MODIFIED);
    expect(view.state.readOnly).toBe(true);
    expect(view.contentDOM).toHaveAttribute('aria-readonly', 'true');
    expect(view.state.facet(languageFacet)).toBeNull();
    expect(container.querySelector('.cm-deletedChunk')).toHaveTextContent('maxPlayers = 60;');
    expect(container.querySelector('.cm-changedLine')).toHaveTextContent('maxPlayers = 100;');
  });

  it('renders original and modified editors side by side', () => {
    const { container } = renderDiff({ layout: 'side-by-side', language: 'bohemia-cfg' });

    expect(container.querySelector('.cm-mergeView')).toBeInTheDocument();
    const [a, b] = editorViews(container);
    expect(a.state.doc.toString()).toBe(ORIGINAL);
    expect(b.state.doc.toString()).toBe(MODIFIED);
    for (const view of [a, b]) {
      expect(view.state.readOnly).toBe(true);
      expect(view.state.facet(languageFacet)?.name).toBe('bohemia-cfg');
    }
    expect(a.dom).toHaveClass('cm-merge-a');
    expect(b.dom).toHaveClass('cm-merge-b');
  });

  it('destroys the previous view and builds a new one when props change', () => {
    const { container, rerenderWith } = renderDiff();
    const [unified] = editorViews(container);

    rerenderWith({ modified: `${MODIFIED}port = 2302;\n` });
    const [updated] = editorViews(container);
    expect(unified.dom.parentNode).toBeNull();
    expect(updated).not.toBe(unified);
    expect(updated.state.doc.toString()).toBe(`${MODIFIED}port = 2302;\n`);

    rerenderWith({ layout: 'side-by-side' });
    expect(updated.dom.parentNode).toBeNull();
    expect(container.querySelector('.cm-mergeView')).toBeInTheDocument();
    expect(editorViews(container)).toHaveLength(2);
  });

  it('removes the editors on unmount', () => {
    const { container, unmount } = renderDiff({ layout: 'side-by-side' });
    const views = editorViews(container);
    const mergeRoot = container.querySelector('.cm-mergeView');

    unmount();

    for (const view of views) expect(view.dom.isConnected).toBe(false);
    expect(mergeRoot?.parentNode).toBeNull();
  });
});
