import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownViewer } from '../MarkdownViewer';

describe('MarkdownViewer', () => {
  const sampleMarkdown = `# DayZ Server Operator Cheatsheet

Welcome to the cheatsheet.

## Network Ports
DayZ uses the following default ports:
- 2302 UDP: Game port
- 27016 UDP: Steam query port
- 2310 UDP: BattlEye RCON port

## Persistence and Graceful Shutdown
Always issue #shutdown in BattlEye RCON before terminating the server process.
`;

  it('renders formatted markdown elements with Outlive typography', () => {
    render(<MarkdownViewer content={sampleMarkdown} />);

    expect(screen.getByText('DayZ Server Operator Cheatsheet')).toBeInTheDocument();
    expect(screen.getByText('Network Ports')).toBeInTheDocument();
    expect(screen.getByText(/2302 UDP: Game port/)).toBeInTheDocument();
    expect(screen.getByText('Persistence and Graceful Shutdown')).toBeInTheDocument();
  });

  it('filters sections matching search query', () => {
    render(<MarkdownViewer content={sampleMarkdown} searchQuery="27016" />);

    expect(screen.getByText('Network Ports')).toBeInTheDocument();
    expect(screen.getByText(/27016 UDP: Steam query port/)).toBeInTheDocument();
    expect(screen.queryByText('Persistence and Graceful Shutdown')).not.toBeInTheDocument();
  });

  it('renders EmptyState when zero sections match query', () => {
    render(<MarkdownViewer content={sampleMarkdown} searchQuery="nonexistent-keyword-xyz" />);

    expect(screen.getByText('No documentation matches your search')).toBeInTheDocument();
    expect(
      screen.getByText(/No sections matching "nonexistent-keyword-xyz" were found/),
    ).toBeInTheDocument();
  });

  it('sanitizes malicious HTML and XSS payloads within markdown', () => {
    const maliciousMarkdown = `
# Safe Title
<script>alert('pwned')</script>
<img src="invalid.png" onerror="alert(1)" />
<a href="javascript:alert('xss')">Click Me</a>
`;

    const { container } = render(<MarkdownViewer content={maliciousMarkdown} />);

    expect(screen.getByText('Safe Title')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[onerror]')).toBeNull();
    const link = container.querySelector('a');
    if (link) {
      expect(link.getAttribute('href')).not.toBe("javascript:alert('xss')");
    }
  });

  it('handles empty content gracefully with empty container', () => {
    const { container } = render(<MarkdownViewer content="" />);
    const viewer = container.querySelector('[data-testid="markdown-viewer"]');
    expect(viewer).toBeInTheDocument();
    expect(viewer?.textContent?.trim()).toBe('');
  });
});
