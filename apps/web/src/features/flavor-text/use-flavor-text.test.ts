import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLAVOR_TEXTS } from './flavor-text.data';
import { useFlavorText } from './use-flavor-text';

describe('useFlavorText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with the first flavor text item', () => {
    const { result } = renderHook(() => useFlavorText());

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.flavorText).toEqual(FLAVOR_TEXTS[0]);
  });

  it('cycles to the next flavor text item after interval elapses', () => {
    const { result } = renderHook(() => useFlavorText({ interval: 5000 }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.flavorText).toEqual(FLAVOR_TEXTS[1]);
  });

  it('does not cycle when interval is zero or negative', () => {
    const { result } = renderHook(() => useFlavorText({ interval: 0 }));

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.activeIndex).toBe(0);
  });
});
