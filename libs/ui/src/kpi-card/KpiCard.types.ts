import type { HTMLAttributes, ReactNode, Ref } from 'react';

export type KpiTrend = 'positive' | 'negative' | 'neutral' | 'warning';

export interface KpiCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Metric label string or node (e.g. "Players online", "Average latency").
   */
  label?: ReactNode;

  /**
   * Primary metric numerical or text value (e.g. 48, 59.8, "1,284").
   */
  value?: ReactNode;

  /**
   * Optional unit or capacity indicator (e.g. "/ 60", "ms", "%").
   */
  unit?: ReactNode;

  /**
   * Top-right contextual icon.
   */
  icon?: ReactNode;

  /**
   * Delta text or trend context (e.g. "↗ 12 players from yesterday").
   */
  delta?: ReactNode;

  /**
   * Semantic trend direction used to color the delta text and default sparkline.
   * @default 'neutral'
   */
  trend?: KpiTrend;

  /**
   * Sparkline graphic: an array of numeric values for an auto-generated SVG curve,
   * or a custom ReactNode.
   */
  sparkline?: number[] | ReactNode;

  /**
   * Custom stroke color for the auto-generated sparkline curve.
   * Defaults to the semantic trend color or `--color-chart-teal`.
   */
  sparklineColor?: string;

  /**
   * Displays a layout-stable skeleton shimmer state while data is loading.
   * @default false
   */
  isLoading?: boolean;

  /**
   * Forwarded React 19 ref for the card container.
   */
  ref?: Ref<HTMLDivElement>;

  /**
   * Custom children for slot-based composition.
   */
  children?: ReactNode;
}

export interface KpiCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface KpiCardLabelProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  children?: ReactNode;
}

export interface KpiCardBodyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface KpiCardValueProps extends HTMLAttributes<HTMLDivElement> {
  unit?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface KpiCardDeltaProps extends HTMLAttributes<HTMLDivElement> {
  trend?: KpiTrend;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface KpiCardSparklineProps extends HTMLAttributes<SVGSVGElement> {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
  ref?: Ref<SVGSVGElement>;
  children?: ReactNode;
}
