import { useEffect, useRef } from 'react';

import { createDiffView } from './CodeEditor.extensions';
import type { CodeDiffViewProps } from './CodeEditor.types';

export type { CodeDiffViewProps };

export function CodeDiffView({
  original,
  modified,
  language = 'plain',
  layout = 'unified',
  containerClassName = '',
  ariaLabel,
}: CodeDiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const view = createDiffView({ parent, original, modified, language, layout });
    return () => view.destroy();
  }, [original, modified, language, layout]);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      className={`overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs ${containerClassName}`.trim()}
    />
  );
}
