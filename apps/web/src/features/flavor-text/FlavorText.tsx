import type { FlavorTextItem } from './flavor-text.data';
import { useFlavorText } from './use-flavor-text';

import styles from './FlavorText.module.css';

export interface FlavorTextProps {
  variant?: 'compact' | 'hero';
  item?: FlavorTextItem;
  interval?: number;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function FlavorText({
  variant = 'compact',
  item: controlledItem,
  interval,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
}: FlavorTextProps) {
  const { flavorText: activeFlavorText } = useFlavorText({
    interval: controlledItem ? 0 : (interval ?? 60_000),
  });
  const current = controlledItem ?? activeFlavorText;

  if (variant === 'hero') {
    return (
      <div
        key={current.id}
        className={`${styles.fadeIn} flex flex-col text-left gap-1 select-none ${className}`}
      >
        <h1
          className={`text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.2] ${titleClassName}`}
        >
          {current.title}
        </h1>
        <p
          className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-light text-white/90 tracking-tight leading-snug ${subtitleClassName}`}
        >
          {current.subTitle}
        </p>
      </div>
    );
  }

  return (
    <div
      key={current.id}
      className={`${styles.fadeIn} flex flex-col text-left gap-0.5 select-none ${className}`}
    >
      <span
        className={`text-sm font-semibold text-[var(--color-text-main)] tracking-tight ${titleClassName}`}
      >
        {current.title}
      </span>
      <span
        className={`text-[11px] text-[var(--color-text-muted)] leading-tight ${subtitleClassName}`}
      >
        {current.subTitle}
      </span>
    </div>
  );
}
