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

    act(() => {
      fireEvent.mouseLeave(button);
      vi.advanceTimersByTime(100);
    });
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

  it('hides tooltip and stops event propagation when Escape key is pressed while visible', () => {
    const parentKeyDown = vi.fn();

    render(
      <div onKeyDown={parentKeyDown}>
        <Tooltip content="Escapable tooltip">
          <button type="button">Trigger</button>
        </Tooltip>
      </div>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it('allows Escape key event to bubble normally when tooltip is not visible', () => {
    const parentKeyDown = vi.fn();

    render(
      <div onKeyDown={parentKeyDown}>
        <Tooltip content="Escapable tooltip">
          <button type="button">Trigger</button>
        </Tooltip>
      </div>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(parentKeyDown).toHaveBeenCalledTimes(1);
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

  it('preserves and appends to existing aria-describedby', () => {
    render(
      <Tooltip content="Helper info">
        <button type="button" aria-describedby="existing-error">
          Trigger
        </button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });
    expect(button).toHaveAttribute('aria-describedby', 'existing-error');

    fireEvent.focus(button);
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).toContain('existing-error');
    expect(describedBy).toMatch(/^existing-error\s+\S+$/);
  });

  it('suppresses open tooltip when disabled prop changes dynamically', () => {
    const { rerender } = render(
      <Tooltip content="Dynamic disabled" disabled={false}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: /trigger/i });
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    rerender(
      <Tooltip content="Dynamic disabled" disabled={true}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keeps tooltip open when pointer moves from trigger to tooltip', () => {
    render(
      <Tooltip content="Hoverable content" delay={0}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const wrapper = screen.getByTestId('tooltip-trigger-wrapper');
    act(() => {
      fireEvent.mouseEnter(wrapper);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Mouse leaves trigger but enters tooltip
    act(() => {
      fireEvent.mouseLeave(wrapper);
    });
    const portal = screen.getByTestId('tooltip-portal');
    act(() => {
      fireEvent.mouseEnter(portal);
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Mouse leaves tooltip
    act(() => {
      fireEvent.mouseLeave(portal);
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('preserves child element ref when wrapped in Tooltip', () => {
    const triggerRef = createRef<HTMLButtonElement>();

    render(
      <Tooltip content="Ref tooltip">
        <button ref={triggerRef} type="button">
          Trigger
        </button>
      </Tooltip>,
    );

    expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement);
  });
});
