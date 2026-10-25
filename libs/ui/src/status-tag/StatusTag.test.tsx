import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { Activity, ShieldCheck } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('renders default domain status labels when no children are provided', () => {
    const { rerender } = render(<StatusTag status="online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();

    rerender(<StatusTag status="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();

    rerender(<StatusTag status="restarting" />);
    expect(screen.getByText('Restarting')).toBeInTheDocument();

    rerender(<StatusTag status="stopped" />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('renders custom children and role status', () => {
    render(<StatusTag status="success">Running (32/60)</StatusTag>);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Running (32/60)');
  });

  it('automatically applies pulsating radar ping for restarting and supports explicit ping override', () => {
    const { container, rerender } = render(<StatusTag status="restarting" />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();

    rerender(<StatusTag status="restarting" ping={false} />);
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();

    rerender(<StatusTag status="online" ping={true} />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('supports solid and outline variants across statuses', () => {
    const { rerender } = render(<StatusTag status="danger" variant="solid" />);
    let badge = screen.getByRole('status');
    expect(badge.className).toContain('bg-[var(--color-status-danger)]');

    rerender(<StatusTag status="warning" variant="outline" />);
    badge = screen.getByRole('status');
    expect(badge.className).toContain('border-[var(--color-status-warning)]');
    expect(badge.className).toContain('bg-transparent');
  });

  it('renders trailing icons as element and component', () => {
    const { rerender } = render(
      <StatusTag status="online" rightIcon={ShieldCheck}>
        Secured
      </StatusTag>,
    );
    expect(screen.getByText('Secured')).toBeInTheDocument();

    rerender(
      <StatusTag status="info" rightIcon={<Activity data-testid="activity-icon" />}>
        Active
      </StatusTag>,
    );
    expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
  });

  it('forwards React 19 ref to root badge element', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<StatusTag ref={ref} status="online" />);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
