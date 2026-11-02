import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton Component', () => {
  it('renders default text skeleton with role="status" and aria-label', () => {
    render(<Skeleton />);

    const skeleton = screen.getByRole('status', { name: /loading/i });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded-sm');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies variant shape classes properly', () => {
    const { rerender } = render(<Skeleton variant="circular" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('rounded-full');

    rerender(<Skeleton variant="rectangular" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('rounded-none');

    rerender(<Skeleton variant="rounded" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('rounded-xl');

    rerender(<Skeleton variant="text" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('rounded-sm');
  });

  it('applies animation styles properly', () => {
    const { rerender } = render(<Skeleton animation="pulse" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('animate-pulse');

    rerender(<Skeleton animation="wave" data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveClass('overflow-hidden');

    rerender(<Skeleton animation="none" data-testid="sk" />);
    expect(screen.getByTestId('sk')).not.toHaveClass('animate-pulse');
    expect(screen.getByTestId('sk')).not.toHaveClass('overflow-hidden');
  });

  it('applies numeric and string dimensions to inline styles', () => {
    render(<Skeleton width={120} height="2rem" data-testid="sk" />);

    const el = screen.getByTestId('sk');
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('2rem');
  });

  it('renders multiple lines when lines > 1 and variant is text', () => {
    render(<Skeleton variant="text" lines={3} />);

    const container = screen.getByRole('status', { name: /loading/i });
    expect(container).toBeInTheDocument();

    const lines = screen.getAllByTestId('skeleton-line');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveStyle({ width: '100%' });
    expect(lines[1]).toHaveStyle({ width: '100%' });
    expect(lines[2]).toHaveStyle({ width: '75%' });
  });

  it('applies width and custom style to multiline container', () => {
    render(<Skeleton variant="text" lines={2} width={300} style={{ opacity: 0.8 }} />);

    const container = screen.getByRole('status', { name: /loading/i });
    expect(container.style.width).toBe('300px');
    expect(container.style.opacity).toBe('0.8');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('omits role and aria-label and sets aria-hidden="true" when aria-hidden is true or "true"', () => {
    const { rerender } = render(<Skeleton aria-hidden={true} data-testid="hidden-sk" />);

    let skeleton = screen.getByTestId('hidden-sk');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).not.toHaveAttribute('role');
    expect(skeleton).not.toHaveAttribute('aria-label');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<Skeleton aria-hidden="true" data-testid="hidden-sk" />);
    skeleton = screen.getByTestId('hidden-sk');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).not.toHaveAttribute('role');
    expect(skeleton).not.toHaveAttribute('aria-label');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
