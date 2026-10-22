import { useEffect, useState } from 'react';

import { FLAVOR_TEXTS, type FlavorTextItem } from './flavor-text.data';

export interface UseFlavorTextOptions {
  interval?: number;
}

export function useFlavorText({ interval = 60_000 }: UseFlavorTextOptions = {}): {
  flavorText: FlavorTextItem;
  activeIndex: number;
} {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (interval <= 0 || FLAVOR_TEXTS.length <= 1) return;

    const timerId = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % FLAVOR_TEXTS.length);
    }, interval);

    return () => clearInterval(timerId);
  }, [interval]);

  return { flavorText: FLAVOR_TEXTS[activeIndex], activeIndex };
}
