import type { TooltipPlacement } from './Tooltip.types';

export interface TooltipCoordinates {
  top: number;
  left: number;
  placement: TooltipPlacement;
}

export interface TooltipPositionOptions {
  gap?: number;
  padding?: number;
  windowWidth?: number;
  windowHeight?: number;
}

export const TOOLTIP_GAP = 6;
export const TOOLTIP_VIEWPORT_PADDING = 8;

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface Dimensions {
  width: number;
  height: number;
}

interface ViewportContext {
  gap: number;
  padding: number;
  width: number;
  height: number;
}

function resolveVerticalPlacement(
  trigger: Rect,
  height: number,
  preferred: 'top' | 'bottom',
  ctx: ViewportContext,
): TooltipPlacement {
  const { gap, padding, height: viewHeight } = ctx;
  if (preferred === 'top' && trigger.top - height - gap < padding) {
    return trigger.bottom + height + gap <= viewHeight - padding ? 'bottom' : 'top';
  }
  if (preferred === 'bottom' && trigger.bottom + height + gap > viewHeight - padding) {
    return trigger.top - height - gap >= padding ? 'top' : 'bottom';
  }
  return preferred;
}

function resolveHorizontalPlacement(
  trigger: Rect,
  width: number,
  preferred: 'left' | 'right',
  ctx: ViewportContext,
): TooltipPlacement {
  const { gap, padding, width: viewWidth } = ctx;
  if (preferred === 'left' && trigger.left - width - gap < padding) {
    return trigger.right + width + gap <= viewWidth - padding ? 'right' : 'left';
  }
  if (preferred === 'right' && trigger.right + width + gap > viewWidth - padding) {
    return trigger.left - width - gap >= padding ? 'left' : 'right';
  }
  return preferred;
}

function resolvePlacement(
  trigger: Rect,
  tooltip: Dimensions,
  preferred: TooltipPlacement,
  ctx: ViewportContext,
): TooltipPlacement {
  if (preferred === 'top' || preferred === 'bottom') {
    return resolveVerticalPlacement(trigger, tooltip.height, preferred, ctx);
  }
  return resolveHorizontalPlacement(trigger, tooltip.width, preferred, ctx);
}

function computeOffsets(
  trigger: Rect,
  tooltip: Dimensions,
  placement: TooltipPlacement,
  gap: number,
): { top: number; left: number } {
  switch (placement) {
    case 'top':
      return {
        top: trigger.top - tooltip.height - gap,
        left: trigger.left + trigger.width / 2 - tooltip.width / 2,
      };
    case 'bottom':
      return {
        top: trigger.bottom + gap,
        left: trigger.left + trigger.width / 2 - tooltip.width / 2,
      };
    case 'left':
      return {
        top: trigger.top + trigger.height / 2 - tooltip.height / 2,
        left: trigger.left - tooltip.width - gap,
      };
    case 'right':
      return {
        top: trigger.top + trigger.height / 2 - tooltip.height / 2,
        left: trigger.right + gap,
      };
  }
}

export function calculateTooltipPosition(
  triggerRect: Rect,
  tooltipRect: Dimensions,
  preferredPlacement: TooltipPlacement = 'top',
  options: TooltipPositionOptions = {},
): TooltipCoordinates {
  const gap = options.gap ?? TOOLTIP_GAP;
  const padding = options.padding ?? TOOLTIP_VIEWPORT_PADDING;
  const windowWidth =
    options.windowWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const windowHeight =
    options.windowHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 768);

  const placement = resolvePlacement(triggerRect, tooltipRect, preferredPlacement, {
    gap,
    padding,
    width: windowWidth,
    height: windowHeight,
  });

  const raw = computeOffsets(triggerRect, tooltipRect, placement, gap);

  const left = Math.max(padding, Math.min(raw.left, windowWidth - tooltipRect.width - padding));
  const top = Math.max(padding, Math.min(raw.top, windowHeight - tooltipRect.height - padding));

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
  };
}
