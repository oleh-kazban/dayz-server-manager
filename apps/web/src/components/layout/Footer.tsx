import { WorldQuote } from '@dsm/features/world-quote';

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--color-text-muted)] py-4 border-t border-[var(--color-border-subtle)] gap-2">
      <WorldQuote />
      <div className="font-mono text-[11px]">EU-CENTRAL-1 / UTC +02:00</div>
    </footer>
  );
}
