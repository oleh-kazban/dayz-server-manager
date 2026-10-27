import { createRef } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip';
import { calculateTooltipPosition } from './tooltip.utils';

describe('calculateTooltipPosition', () => {
  const triggerRect = {
    top: 100,
    bottom: 136,
    left: 200,
    right: 236,
    width: 36,
    height: 36,
  };
  const tooltipRect = { width: 80, height: 24 };

  it('calculates top placement correctly', () => {
    const pos = calculateTooltipPosition(triggerRect, tooltipRect, 'top', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(pos.placement).toBe('top');
    expect(pos.top).toBe(100 - 24 - 6); // 70
    expect(pos.left).toBe(200 + 18 - 40); // 178
  });

  it('calculates bottom placement correctly', () => {
    const pos = calculateTooltipPosition(triggerRect, tooltipRect, 'bottom', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBe(136 + 6); // 142
    expect(pos.left).toBe(178);
  });

  it('calculates left and right placements correctly', () => {
    const leftPos = calculateTooltipPosition(triggerRect, tooltipRect, 'left', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(leftPos.placement).toBe('left');
    expect(leftPos.left).toBe(200 - 80 - 6); // 114

    const rightPos = calculateTooltipPosition(triggerRect, tooltipRect, 'right', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(rightPos.placement).toBe('right');
    expect(rightPos.left).toBe(236 + 6); // 242
  });

  it('auto-flips to bottom when top exceeds viewport top padding', () => {
    const nearTopTrigger = { ...triggerRect, top: 10, bottom: 46 };
    const pos = calculateTooltipPosition(nearTopTrigger, tooltipRect, 'top', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(pos.placement).toBe('bottom');
  });

  it('clamps left position within viewport boundaries', () => {
    const nearEdgeTrigger = { ...triggerRect, left: 2, right: 38 };
    const pos = calculateTooltipPosition(nearEdgeTrigger, tooltipRect, 'top', {
      gap: 6,
      padding: 8,
      windowWidth: 1000,
      windowHeight: 800,
    });
    expect(pos.left).toBeGreaterThanOrEqual(8);
  });
});

describe('Tooltip Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not display tooltip initially', () => {
    render(
      <Tooltip content="Tooltip microcopy">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover after intent delay and hides on leave', () => {
    render(
      <Tooltip content="Tooltip microcopy" delay={200}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.mouseEnter(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Tooltip microcopy');
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('shows tooltip immediately on keyboard focus and closes on blur', () => {
    render(
      <Tooltip content="Focused tooltip">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides tooltip when Escape key is pressed', () => {
    render(
      <Tooltip content="Escapable tooltip">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show when disabled is true', () => {
    render(
      <Tooltip content="Disabled tooltip" disabled>
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.focus(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('forwards refs to trigger and tooltip element', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const tooltipRef = createRef<HTMLDivElement>();

    render(
      <Tooltip content="Ref tooltip" ref={tooltipRef}>
        <button ref={triggerRef} type="button">
          Trigger
        </button>
      </Tooltip>,
    );

    expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement);

    const button = screen.getByRole('button', { name: /trigger/i });
    fireEvent.focus(button);

    expect(tooltipRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
