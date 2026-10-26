import type { ReactNode } from 'react';

import {
  generateSparklinePath,
  getDefaultSparklineStroke,
  getTrendColorClass,
} from './kpi-card.utils';
import type {
  KpiCardBodyProps,
  KpiCardDeltaProps,
  KpiCardHeaderProps,
  KpiCardLabelProps,
  KpiCardProps,
  KpiCardSparklineProps,
  KpiCardValueProps,
} from './KpiCard.types';

export function KpiCardHeader({ ref, className = '', children, ...props }: KpiCardHeaderProps) {
  return (
    <div
      ref={ref}
      className={`flex items-center justify-between text-xs text-[var(--color-text-secondary)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function KpiCardLabel({ ref, className = '', children, ...props }: KpiCardLabelProps) {
  return (
    <span ref={ref} className={`truncate font-medium ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

export function KpiCardBody({ ref, className = '', children, ...props }: KpiCardBodyProps) {
  return (
    <div
      ref={ref}
      className={`flex items-end justify-between mt-2 gap-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function KpiCardValue({ ref, unit, className = '', children, ...props }: KpiCardValueProps) {
  return (
    <div ref={ref} className={`flex items-baseline gap-1 ${className}`.trim()} {...props}>
      <span className="text-2xl sm:text-[27px] font-semibold text-[var(--color-text-main)] leading-none tracking-tight">
        {children}
      </span>
      {unit && <span className="text-xs text-[var(--color-text-muted)] font-normal">{unit}</span>}
    </div>
  );
}

export function KpiCardDelta({
  ref,
  trend = 'neutral',
  className = '',
  children,
  ...props
}: KpiCardDeltaProps) {
  return (
    <div
      ref={ref}
      className={`text-[11px] font-medium mt-1.5 flex items-center gap-0.5 ${getTrendColorClass(trend)} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function KpiCardSparkline({
  ref,
  data,
  color,
  width = 94,
  height = 35,
  className = '',
  children,
  ...props
}: KpiCardSparklineProps) {
  if (children) {
    return (
      <svg
        ref={ref}
        data-testid="kpi-sparkline"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`shrink-0 overflow-visible ${className}`.trim()}
        fill="none"
        {...props}
      >
        {children}
      </svg>
    );
  }

  if (!data || data.length === 0) return null;

  const stroke = color ?? 'var(--color-chart-teal, #27a88c)';
  const d = generateSparklinePath(data, width, height);

  return (
    <svg
      ref={ref}
      data-testid="kpi-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`.trim()}
      fill="none"
      {...props}
    >
      <path d={d} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({
  ref,
  label,
  value,
  unit,
  icon,
  delta,
  trend = 'neutral',
  sparkline,
  sparklineColor,
  isLoading = false,
  className = '',
  children,
  ...props
}: KpiCardProps) {
  const resolvedSparklineColor = getDefaultSparklineStroke(trend, sparklineColor);

  const renderSparkline = (): ReactNode => {
    if (!sparkline) return null;
    if (Array.isArray(sparkline)) {
      return <KpiCardSparkline data={sparkline} color={resolvedSparklineColor} />;
    }
    return sparkline;
  };

  return (
    <div
      ref={ref}
      className={`ui-card p-4 flex flex-col justify-between min-h-[114px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all ${className}`.trim()}
      {...props}
    >
      {isLoading ? (
        <div data-testid="kpi-skeleton" className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 rounded bg-[var(--color-surface-subtle)]" />
            <div className="h-4 w-4 rounded bg-[var(--color-surface-subtle)]" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="space-y-1.5">
              <div className="h-7 w-20 rounded bg-[var(--color-surface-subtle)]" />
              <div className="h-3 w-28 rounded bg-[var(--color-surface-subtle)]" />
            </div>
            <div className="h-8 w-20 rounded bg-[var(--color-surface-subtle)]" />
          </div>
        </div>
      ) : (
        (children ?? (
          <>
            <KpiCardHeader>
              <KpiCardLabel>{label}</KpiCardLabel>
              {icon && <span className="text-[var(--color-text-muted)] shrink-0">{icon}</span>}
            </KpiCardHeader>

            <KpiCardBody>
              <div>
                <KpiCardValue unit={unit}>{value}</KpiCardValue>
                {delta && <KpiCardDelta trend={trend}>{delta}</KpiCardDelta>}
              </div>
              {renderSparkline()}
            </KpiCardBody>
          </>
        ))
      )}
    </div>
  );
}

KpiCard.Header = KpiCardHeader;
KpiCard.Label = KpiCardLabel;
KpiCard.Body = KpiCardBody;
KpiCard.Value = KpiCardValue;
KpiCard.Delta = KpiCardDelta;
KpiCard.Sparkline = KpiCardSparkline;
