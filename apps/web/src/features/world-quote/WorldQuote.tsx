import { useWorldQuote } from './use-world-quote';
import type { WorldQuoteItem } from './world-quote.data';

import styles from './WorldQuote.module.css';

export interface WorldQuoteProps {
  quote?: WorldQuoteItem;
  className?: string;
}

export function WorldQuote({ quote: controlledQuote, className = '' }: WorldQuoteProps) {
  const { quote: activeQuote } = useWorldQuote({
    interval: controlledQuote ? 0 : 60_000,
  });
  const quote = controlledQuote ?? activeQuote;

  return (
    <div
      key={quote.id}
      className={`${styles.fadeIn} flex flex-col text-left gap-0.5 select-none ${className}`}
    >
      <span className="text-sm font-semibold text-[var(--color-text-main)] tracking-tight">
        {quote.title}
      </span>
      <span className="text-[11px] text-[var(--color-text-muted)] leading-tight">
        {quote.subTitle}
      </span>
    </div>
  );
}
