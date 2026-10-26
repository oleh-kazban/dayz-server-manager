import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { generateSparklinePath } from './kpi-card.utils';
import {
  KpiCard,
  KpiCardBody,
  KpiCardDelta,
  KpiCardHeader,
  KpiCardLabel,
  KpiCardSparkline,
  KpiCardValue,
} from './KpiCard';

describe('generateSparklinePath', () => {
  it('returns empty string for empty data', () => {
    expect(generateSparklinePath([])).toBe('');
  });

  it('returns horizontal line for single data point', () => {
    expect(generateSparklinePath([50], 94, 35)).toBe('M 0 17.5 L 94 17.5');
  });

  it('generates smooth cubic bezier path for multiple points', () => {
    const path = generateSparklinePath([10, 20, 30], 94, 35);
    expect(path).toContain('M 0');
    expect(path).toContain('C');
    expect(path).toContain('94 3');
  });
});

describe('KpiCard Component', () => {
  it('renders label, icon, value, unit, and delta correctly via props', () => {
    render(
      <KpiCard
        label="Players online"
        icon={<span data-testid="icon">ICON</span>}
        value={48}
        unit="/ 60"
        delta="↗ 12 players from yesterday"
        trend="positive"
        sparkline={[10, 20, 30, 40]}
        data-testid="kpi"
      />,
    );

    expect(screen.getByText('Players online')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('/ 60')).toBeInTheDocument();
    expect(screen.getByText('↗ 12 players from yesterday')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-sparkline')).toBeInTheDocument();
  });

  it('applies semantic trend text color classes', () => {
    const { rerender } = render(
      <KpiCard label="Latency" value={38} delta="Drop" trend="positive" />,
    );
    expect(screen.getByText('Drop')).toHaveClass('text-[var(--color-status-success)]');

    rerender(<KpiCard label="Latency" value={38} delta="Spike" trend="negative" />);
    expect(screen.getByText('Spike')).toHaveClass('text-[var(--color-status-danger)]');

    rerender(<KpiCard label="Latency" value={38} delta="Warn" trend="warning" />);
    expect(screen.getByText('Warn')).toHaveClass('text-[var(--color-status-warning)]');

    rerender(<KpiCard label="Latency" value={38} delta="Neutral" trend="neutral" />);
    expect(screen.getByText('Neutral')).toHaveClass('text-[var(--color-text-muted)]');
  });

  it('renders custom sparkline ReactNode when provided', () => {
    render(
      <KpiCard
        label="Metric"
        value={100}
        sparkline={<div data-testid="custom-sparkline">CUSTOM</div>}
      />,
    );

    expect(screen.getByTestId('custom-sparkline')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true and hides metrics', () => {
    render(<KpiCard label="Hidden Label" value="Hidden Value" delta="Hidden Delta" isLoading />);

    expect(screen.getByTestId('kpi-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Label')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden Value')).not.toBeInTheDocument();
  });

  it('renders slot-based compound components properly', () => {
    render(
      <KpiCard data-testid="kpi">
        <KpiCard.Header data-testid="kpi-header">
          <KpiCard.Label>Server FPS</KpiCard.Label>
          <span data-testid="kpi-icon">ACTIVITY</span>
        </KpiCard.Header>
        <KpiCard.Body data-testid="kpi-body">
          <div>
            <KpiCard.Value unit="/ 60">59.8</KpiCard.Value>
            <KpiCard.Delta trend="positive">Stable · Optimal</KpiCard.Delta>
          </div>
          <KpiCard.Sparkline data={[50, 55, 60]} />
        </KpiCard.Body>
      </KpiCard>,
    );

    expect(screen.getByTestId('kpi-header')).toBeInTheDocument();
    expect(screen.getByText('Server FPS')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-body')).toBeInTheDocument();
    expect(screen.getByText('59.8')).toBeInTheDocument();
    expect(screen.getByText('/ 60')).toBeInTheDocument();
    expect(screen.getByText('Stable · Optimal')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-sparkline')).toBeInTheDocument();
  });

  it('renders named subcomponents identically', () => {
    render(
      <KpiCard>
        <KpiCardHeader>
          <KpiCardLabel>Memory</KpiCardLabel>
        </KpiCardHeader>
        <KpiCardBody>
          <KpiCardValue unit="GB">6.2</KpiCardValue>
          <KpiCardDelta trend="warning">Elevated</KpiCardDelta>
          <KpiCardSparkline data={[4, 5, 6]} />
        </KpiCardBody>
      </KpiCard>,
    );

    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('6.2')).toBeInTheDocument();
    expect(screen.getByText('GB')).toBeInTheDocument();
    expect(screen.getByText('Elevated')).toBeInTheDocument();
  });

  it('forwards refs correctly', () => {
    const cardRef = createRef<HTMLDivElement>();
    const valueRef = createRef<HTMLDivElement>();

    render(
      <KpiCard ref={cardRef}>
        <KpiCard.Value ref={valueRef}>42</KpiCard.Value>
      </KpiCard>,
    );

    expect(cardRef.current).toBeInstanceOf(HTMLDivElement);
    expect(valueRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
