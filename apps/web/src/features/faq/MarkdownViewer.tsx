import { useMemo } from 'react';

import { Search } from 'lucide-react';
import { marked } from 'marked';

import { EmptyState } from '@dsm/ui';
import { filterMarkdownSections, sanitizeContent } from '@dsm/web/core';

export interface MarkdownViewerProps {
  content: string;
  searchQuery?: string;
  className?: string;
}

export function MarkdownViewer({ content, searchQuery = '', className = '' }: MarkdownViewerProps) {
  const { filteredContent, matchCount } = useMemo(
    () => filterMarkdownSections(content, searchQuery),
    [content, searchQuery],
  );

  const sanitizedHtml = useMemo(() => {
    if (matchCount === 0 || !filteredContent.trim()) {
      return '';
    }
    const rawHtml = marked.parse(filteredContent, {
      async: false,
      gfm: true,
      breaks: true,
    }) as string;
    return sanitizeContent(rawHtml);
  }, [filteredContent, matchCount]);

  if (matchCount === 0) {
    return (
      <EmptyState
        icon={<Search className="w-8 h-8 text-[var(--color-text-muted)]" />}
        title="No documentation matches your search"
        description={`No sections matching "${searchQuery}" were found. Try another keyword.`}
        className="py-12"
      />
    );
  }

  return (
    <div
      data-testid="markdown-viewer"
      className={`prose max-w-none text-[var(--color-text-main)] leading-relaxed space-y-4
        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-[var(--color-text-main)] [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-[var(--color-border)] [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0
        [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--color-text-main)] [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pb-1.5 [&_h2]:border-b [&_h2]:border-[var(--color-border-subtle)]
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[var(--color-text-main)] [&_h3]:mt-4 [&_h3]:mb-2
        [&_p]:text-sm [&_p]:text-[var(--color-text-secondary)] [&_p]:leading-relaxed [&_p]:mb-3
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-sm [&_ul]:text-[var(--color-text-secondary)]
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:text-sm [&_ol]:text-[var(--color-text-secondary)]
        [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-xs [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-[var(--color-surface-subtle)] [&_:not(pre)>code]:text-[var(--color-primary)] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-[var(--color-border)]
        [&_pre]:bg-[var(--color-surface-subtle)] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--color-border)] [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre>code]:font-mono [&_pre>code]:text-xs [&_pre>code]:text-[var(--color-text-main)]
        [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:my-4
        [&_th]:text-left [&_th]:p-2.5 [&_th]:font-semibold [&_th]:bg-[var(--color-surface-subtle)] [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:text-[var(--color-text-main)]
        [&_td]:p-2.5 [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:text-[var(--color-text-secondary)]
        [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-muted)] [&_blockquote]:my-3
        [&_hr]:border-[var(--color-border)] [&_hr]:my-6
        [&_a]:text-[var(--color-primary)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[var(--color-primary-hover)]
        ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
