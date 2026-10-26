import type { KpiTrend } from './KpiCard.types';

export function getTrendColorClass(trend?: KpiTrend): string {
  switch (trend) {
    case 'positive':
      return 'text-[var(--color-status-success)]';
    case 'negative':
      return 'text-[var(--color-status-danger)]';
    case 'warning':
      return 'text-[var(--color-status-warning)]';
    case 'neutral':
    default:
      return 'text-[var(--color-text-muted)]';
  }
}

export function getDefaultSparklineStroke(trend?: KpiTrend, customColor?: string): string {
  if (customColor) return customColor;
  switch (trend) {
    case 'positive':
      return 'var(--color-status-success, #27a88c)';
    case 'negative':
      return 'var(--color-status-danger, #ef4444)';
    case 'warning':
      return 'var(--color-status-warning, #f59e0b)';
    case 'neutral':
    default:
      return 'var(--color-chart-teal, #27a88c)';
  }
}

export function generateSparklinePath(data: number[], width = 94, height = 35, pad = 3): string {
  if (!data || data.length === 0) return '';
  if (data.length === 1) {
    const midY = height / 2;
    return `M 0 ${midY} L ${width} ${midY}`;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const usableHeight = height - pad * 2;
  const stepX = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = range === 0 ? height / 2 : height - pad - ((val - min) / range) * usableHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = Number(((p0.x + p1.x) / 2).toFixed(1));
    path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
}
