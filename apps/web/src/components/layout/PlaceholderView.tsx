import { Construction } from 'lucide-react';

import { PageContainer } from './PageContainer';

export interface PlaceholderViewProps {
  title: string;
  description: string;
  badge?: string;
}

export function PlaceholderView({
  title,
  description,
  badge = 'Planned Feature',
}: PlaceholderViewProps) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[420px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center space-y-4">
        <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-primary)]">
          <Construction className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-main)] tracking-tight">
              {title}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)] uppercase tracking-wider">
              {badge}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</p>
        </div>
      </div>
    </PageContainer>
  );
}
