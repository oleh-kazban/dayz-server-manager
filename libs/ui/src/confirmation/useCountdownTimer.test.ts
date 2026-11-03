import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdownTimer } from './useCountdownTimer';

describe('useCountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with remainingTime: 0 and isCountingDown: false when timerValue is 0', () => {
    const { result } = renderHook(() => useCountdownTimer(0));
    expect(result.current.remainingTime).toBe(0);
    expect(result.current.isCountingDown).toBe(false);
  });

  it('counts down from timerValue to 0 in 1-second intervals', () => {
    const { result } = renderHook(() => useCountdownTimer(3));
    expect(result.current.remainingTime).toBe(3);
    expect(result.current.isCountingDown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingTime).toBe(2);
    expect(result.current.isCountingDown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingTime).toBe(1);
    expect(result.current.isCountingDown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingTime).toBe(0);
    expect(result.current.isCountingDown).toBe(false);
  });

  it('cleans up interval on unmount without leaking', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useCountdownTimer(3));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('resets remainingTime when timerValue updates', () => {
    const { result, rerender } = renderHook(({ timerValue }) => useCountdownTimer(timerValue), {
      initialProps: { timerValue: 3 },
    });

    expect(result.current.remainingTime).toBe(3);

    rerender({ timerValue: 5 });
    expect(result.current.remainingTime).toBe(5);
    expect(result.current.isCountingDown).toBe(true);
  });
});
