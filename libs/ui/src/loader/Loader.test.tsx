import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loader } from './Loader';

describe('Loader', () => {
  it('renders with default spinner variant and accessible screen-reader announcement', () => {
    render(<Loader />);

    const statusContainer = screen.getByRole('status');
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading...')).toHaveClass('sr-only');
  });

  it('renders visible label when showLabel is true', () => {
    render(<Loader label="Syncing mods..." showLabel />);

    const labels = screen.getAllByText('Syncing mods...');
    expect(labels).toHaveLength(2); // One sr-only, one visible
  });

  it('renders dots and pulse animation variants across sizes', () => {
    const { rerender, container } = render(<Loader variant="dots" size="sm" />);
    expect(container.querySelector('.animate-loader-bounce')).toBeInTheDocument();

    rerender(<Loader variant="pulse" size="lg" />);
    expect(container.querySelector('.animate-loader-pulse')).toBeInTheDocument();
  });

  it('forwards React 19 ref to the root container', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Loader ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
