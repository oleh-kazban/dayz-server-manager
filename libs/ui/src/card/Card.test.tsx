import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders projected content within default div container', () => {
    render(<Card>Card Body Content</Card>);

    expect(screen.getByText('Card Body Content')).toBeInTheDocument();
  });

  it('renders header elements with configurable semantic heading level', () => {
    const { rerender } = render(
      <Card
        title="Server Health"
        subtitle="Real-time telemetry and resource usage"
        titleLevel="h2"
        actions={<button type="button">Refresh</button>}
      >
        Metrics chart
      </Card>,
    );

    const heading = screen.getByRole('heading', { level: 2, name: /server health/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Real-time telemetry and resource usage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();

    rerender(<Card title="Default H3" titleLevel="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: /default h3/i })).toBeInTheDocument();
  });

  it('supports custom semantic HTML tag via "as" prop', () => {
    const { container } = render(
      <Card as="article" title="News Article">
        Article body
      </Card>,
    );

    const articleElement = container.querySelector('article');
    expect(articleElement).toBeInTheDocument();
  });

  it('renders footer slot with top border', () => {
    render(<Card footer={<span>Last updated 2 mins ago</span>}>Main body</Card>);

    expect(screen.getByText('Last updated 2 mins ago')).toBeInTheDocument();
  });

  it('forwards React 19 ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
