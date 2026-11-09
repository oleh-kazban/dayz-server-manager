import { FlavorText } from '@aegis/web/features/flavor-text';

import { APP_VERSION } from '../../core/config/app-version';

export interface FooterProps {
  className?: string;
  version?: string;
}

export function Footer({ className = '', version = APP_VERSION }: FooterProps) {
  return (
    <footer
      className={`flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--color-text-muted)] pt-4 pb-0 border-t border-[var(--color-border-subtle)] gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <FlavorText />
      </div>
      <div className="font-mono text-[11px] text-[var(--color-text-muted)] tracking-wider">
        {version}
      </div>
    </footer>
  );
}
