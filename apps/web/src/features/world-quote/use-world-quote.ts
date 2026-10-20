import { useEffect, useState } from 'react';

import { WORLD_QUOTES, type WorldQuoteItem } from './world-quote.data';

export interface UseWorldQuoteOptions {
  interval?: number;
}

export function useWorldQuote({ interval = 60_000 }: UseWorldQuoteOptions = {}): {
  quote: WorldQuoteItem;
} {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (interval <= 0 || WORLD_QUOTES.length <= 1) return;

    const timerId = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % WORLD_QUOTES.length);
    }, interval);

    return () => clearInterval(timerId);
  }, [interval]);

  return { quote: WORLD_QUOTES[activeIndex] };
}
