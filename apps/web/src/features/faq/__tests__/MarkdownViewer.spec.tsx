import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownViewer } from '../MarkdownViewer';

describe('MarkdownViewer', () => {
  const sampleMarkdown = `# DayZ Server Operator Cheatsheet

Welcome to the operator cheatsheet.

## Network Ports
DayZ dedicated server requires:
- 2302 UDP for Game traffic
- 27016 UDP for Steam query

## Persistence Guidance
Always run \`#shutdown\` in BattlEye RCON before killing the process.

| Port | Protocol | Purpose |
| :--- | :--- | :--- |
| 2302 | UDP | Game traffic |
| 2310 | UDP | BattlEye RCON |
`;

  it('renders parsed markdown with Outlive typography classes and container testid', () => {
    render(<MarkdownViewer content={sampleMarkdown} className="custom-viewer-class" />);

    const viewer = screen.getByTestId('markdown-viewer');
    expect(viewer).toBeInTheDocument();
    expect(viewer.className).toContain('custom-viewer-class');
    expect(viewer.className).toContain('prose');

    // Headings
    expect(
      screen.getByRole('heading', { level: 1, name: 'DayZ Server Operator Cheatsheet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Network Ports' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Persistence Guidance' }),
    ).toBeInTheDocument();

    // Table elements
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Game traffic')).toBeInTheDocument();
    expect(screen.getByText('BattlEye RCON')).toBeInTheDocument();

    // List items
    expect(screen.getByText(/2302 UDP for Game traffic/)).toBeInTheDocument();
  });

  it('filters content by searchQuery and renders only matching sections', () => {
    render(<MarkdownViewer content={sampleMarkdown} searchQuery="Persistence" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Persistence Guidance' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Always run/)).toBeInTheDocument();

    // Non-matching section is excluded
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Network Ports' }),
    ).not.toBeInTheDocument();
  });

  it('renders EmptyState when searchQuery matches zero sections', () => {
    render(<MarkdownViewer content={sampleMarkdown} searchQuery="unknown-needle-xyz" />);

    expect(screen.queryByTestId('markdown-viewer')).not.toBeInTheDocument();
    expect(screen.getByText('No documentation matches your search')).toBeInTheDocument();
    expect(
      screen.getByText(/No sections matching "unknown-needle-xyz" were found\./),
    ).toBeInTheDocument();
  });

  it('sanitizes malicious script and onerror vectors from rendered content', () => {
    const maliciousMarkdown = `
# Security Test

<script>window.__malicious = true;</script>
<img src="x" onerror="window.__xss = true;" />
<a href="javascript:alert('pwned')">Click for free</a>
`;

    render(<MarkdownViewer content={maliciousMarkdown} />);

    const viewer = screen.getByTestId('markdown-viewer');
    expect(viewer.innerHTML).not.toContain('<script');
    expect(viewer.innerHTML).not.toContain('onerror');
    expect(viewer.innerHTML).not.toContain('javascript:');
    expect(viewer.innerHTML).toContain('Security Test');
    expect(viewer.innerHTML).toContain('Click for free');
  });

  it('renders empty string when content is empty without matching error', () => {
    render(<MarkdownViewer content="" />);

    const viewer = screen.getByTestId('markdown-viewer');
    expect(viewer).toBeInTheDocument();
    expect(viewer.innerHTML).toBe('');
  });
});
