import { describe, expect, it } from 'vitest';

import { filterMarkdownSections, sanitizeContent } from '../markdown.utils';

describe('markdown.utils', () => {
  describe('filterMarkdownSections', () => {
    const sampleMarkdown = `# DayZ Server Operator Cheatsheet

Welcome to the cheatsheet.

## Network Ports
DayZ uses the following default ports:
- 2302 UDP: Game port
- 27016 UDP: Steam query port
- 2310 UDP: BattlEye RCON port

## Persistence and Graceful Shutdown
Always issue #shutdown in BattlEye RCON before terminating the server process.
This flushes storage_1 hive databases safely.

### Scoped Backup Geometries
Backup the storage_1 folder and serverDZ.cfg frequently.
Do not backup server binaries in snapshot backups.
`;

    it('returns full content with matchCount 1 when query is undefined or empty', () => {
      const resultEmpty = filterMarkdownSections(sampleMarkdown, '');
      expect(resultEmpty.filteredContent).toBe(sampleMarkdown);
      expect(resultEmpty.matchCount).toBe(1);

      const resultUndefined = filterMarkdownSections(sampleMarkdown, undefined);
      expect(resultUndefined.filteredContent).toBe(sampleMarkdown);
      expect(resultUndefined.matchCount).toBe(1);

      const resultWhitespace = filterMarkdownSections(sampleMarkdown, '   ');
      expect(resultWhitespace.filteredContent).toBe(sampleMarkdown);
      expect(resultWhitespace.matchCount).toBe(1);
    });

    it('returns single matching section when query matches only one section', () => {
      const result = filterMarkdownSections(sampleMarkdown, '27016');

      expect(result.matchCount).toBe(1);
      expect(result.filteredContent).toContain('## Network Ports');
      expect(result.filteredContent).toContain('27016 UDP: Steam query port');
      expect(result.filteredContent).not.toContain('## Persistence and Graceful Shutdown');
      expect(result.filteredContent).not.toContain('### Scoped Backup Geometries');
    });

    it('performs case-insensitive filtering', () => {
      const lowerResult = filterMarkdownSections(sampleMarkdown, 'battleye');
      const upperResult = filterMarkdownSections(sampleMarkdown, 'BATTLEYE');

      expect(lowerResult.matchCount).toBe(2); // In Network Ports and Persistence sections
      expect(upperResult.matchCount).toBe(2);
      expect(lowerResult.filteredContent).toBe(upperResult.filteredContent);
    });

    it('returns multiple matching sections joined with double newlines', () => {
      const result = filterMarkdownSections(sampleMarkdown, 'server');

      expect(result.matchCount).toBeGreaterThanOrEqual(2);
      expect(result.filteredContent).toContain('# DayZ Server Operator Cheatsheet');
      expect(result.filteredContent).toContain('## Persistence and Graceful Shutdown');
    });

    it('returns matchCount 0 and empty content when no section matches query', () => {
      const result = filterMarkdownSections(sampleMarkdown, 'nonexistent-query-token-xyz');

      expect(result.matchCount).toBe(0);
      expect(result.filteredContent).toBe('');
    });
  });

  describe('sanitizeContent (DOMPurify HTML Sanitization)', () => {
    it('preserves safe HTML elements generated from Markdown', () => {
      const safeHtml =
        '<h1>Heading</h1><p>Text with <strong>bold</strong> and <em>italic</em> and <a href="https://example.com">link</a></p>' +
        '<pre><code>const x = 1;</code></pre>' +
        '<ul><li>Item 1</li><li>Item 2</li></ul>' +
        '<blockquote>Quoted text</blockquote>';

      const sanitized = sanitizeContent(safeHtml);
      expect(sanitized).toContain('<h1>Heading</h1>');
      expect(sanitized).toContain('<strong>bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
      expect(sanitized).toContain('<a href="https://example.com">link</a>');
      expect(sanitized).toContain('<pre><code>const x = 1;</code></pre>');
      expect(sanitized).toContain('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(sanitized).toContain('<blockquote>Quoted text</blockquote>');
    });

    it('strips <script> tags and inner malicious execution vectors', () => {
      const maliciousHtml =
        '<div>Safe</div><script>alert("xss")</script><script src="https://evil.com/payload.js"></script>';
      const sanitized = sanitizeContent(maliciousHtml);

      expect(sanitized).toContain('<div>Safe</div>');
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert(');
      expect(sanitized).not.toContain('evil.com');
    });

    it('strips inline event handlers such as onerror and onclick', () => {
      const maliciousHtml =
        '<img src="invalid-image.png" onerror="alert(1)" /><button onclick="fetch(\'https://evil.com\')">Click</button>';
      const sanitized = sanitizeContent(maliciousHtml);

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert(1)');
      expect(sanitized).not.toContain('fetch(');
    });

    it('strips javascript: URI protocol links', () => {
      const maliciousHtml = '<a href="javascript:alert(document.cookie)">Malicious Link</a>';
      const sanitized = sanitizeContent(maliciousHtml);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('document.cookie');
    });

    it('strips malicious iframe and object embeddings', () => {
      const maliciousHtml =
        '<iframe src="https://evil.com"></iframe><object data="malware.swf"></object>';
      const sanitized = sanitizeContent(maliciousHtml);

      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('<object');
    });
  });
});
