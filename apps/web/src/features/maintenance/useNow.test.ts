import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks every interval while enabled', () => {
    const { result } = renderHook(() => useNow(true, 1_000));
    expect(result.current).toBe(10_000);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(11_000);
  });

  it('does not tick while disabled, and stops ticking when disabled again', () => {
    const { result, rerender } = renderHook(({ enabled }) => useNow(enabled), {
      initialProps: { enabled: false },
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe(10_000);

    rerender({ enabled: true });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(15_000);

    rerender({ enabled: false });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe(15_000);
  });
});
