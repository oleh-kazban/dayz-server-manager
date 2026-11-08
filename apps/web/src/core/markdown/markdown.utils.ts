import DOMPurify from 'dompurify';

export function filterMarkdownSections(
  content: string,
  query?: string,
): { filteredContent: string; matchCount: number } {
  const cleanQuery = query?.trim().toLowerCase();
  if (!cleanQuery) {
    return { filteredContent: content, matchCount: 1 };
  }

  // Split markdown into sections by major headings (h1, h2, h3)
  const sections = content.split(/(?=^#{1,3}\s)/m);
  const matched = sections.filter(sec => sec.toLowerCase().includes(cleanQuery));

  return {
    filteredContent: matched.join('\n\n'),
    matchCount: matched.length,
  };
}

export function sanitizeContent(html: string): string {
  return DOMPurify.sanitize(html);
}
