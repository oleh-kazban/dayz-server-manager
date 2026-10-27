import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with role="progressbar" and default ARIA bounds', () => {
    render(<ProgressBar value={40} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '40');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuetext', '40%');

    const fillIndicator = progressbar.firstElementChild as HTMLElement;
    expect(fillIndicator).toHaveStyle({ width: '40%' });
  });

  it('clamps values exceeding max or below min', () => {
    const { rerender } = render(<ProgressBar value={150} max={100} />);
    let progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(progressbar.firstElementChild).toHaveStyle({ width: '100%' });

    rerender(<ProgressBar value={-20} min={0} />);
    progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar.firstElementChild).toHaveStyle({ width: '0%' });
  });

  it('supports custom min and max scaling', () => {
    render(<ProgressBar value={150} min={100} max={200} showValue />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '150');
    expect(progressbar).toHaveAttribute('aria-valuemin', '100');
    expect(progressbar).toHaveAttribute('aria-valuemax', '200');
    expect(progressbar.firstElementChild).toHaveStyle({ width: '50%' });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders indeterminate state without numeric ARIA values', () => {
    render(<ProgressBar indeterminate label="Syncing..." />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).not.toHaveAttribute('aria-valuenow');
    expect(progressbar).not.toHaveAttribute('aria-valuemin');
    expect(progressbar).not.toHaveAttribute('aria-valuemax');

    const fillIndicator = progressbar.firstElementChild as HTMLElement;
    expect(fillIndicator).toHaveClass('animate-progress-indeterminate');
  });

  it('connects label via aria-labelledby', () => {
    render(<ProgressBar label="Task Progress" value={60} />);

    const label = screen.getByText('Task Progress');
    const progressbar = screen.getByRole('progressbar');

    expect(progressbar).toHaveAttribute('aria-labelledby', label.id);
  });

  it('renders custom valueLabel overriding default percentage', () => {
    render(<ProgressBar value={3} max={10} valueLabel="3 of 10 completed" />);

    expect(screen.getByText('3 of 10 completed')).toBeInTheDocument();
    expect(screen.queryByText('30%')).not.toBeInTheDocument();
  });

  it('renders helperText when provided', () => {
    render(<ProgressBar value={25} helperText="Probing remote nodes for block verification" />);

    expect(screen.getByText('Probing remote nodes for block verification')).toBeInTheDocument();
  });

  it('applies dimensional sizes correctly to the track', () => {
    const { rerender } = render(<ProgressBar size="sm" value={30} />);
    let progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('h-1');

    rerender(<ProgressBar size="md" value={30} />);
    progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('h-2');

    rerender(<ProgressBar size="lg" value={30} />);
    progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('h-3');
  });

  it('applies variant color classes to the active bar indicator', () => {
    const { rerender } = render(<ProgressBar variant="warning" value={50} />);
    let fill = screen.getByRole('progressbar').firstElementChild;
    expect(fill).toHaveClass('bg-[var(--color-status-warning)]');

    rerender(<ProgressBar variant="danger" value={50} />);
    fill = screen.getByRole('progressbar').firstElementChild;
    expect(fill).toHaveClass('bg-[var(--color-status-danger)]');

    rerender(<ProgressBar variant="success" value={50} />);
    fill = screen.getByRole('progressbar').firstElementChild;
    expect(fill).toHaveClass('bg-[var(--color-status-success)]');
  });

  it('forwards ref to root container', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ProgressBar ref={ref} value={50} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });
});
