import { Plus, Server } from 'lucide-react';

import { Button } from '@dsm/ui';

export interface EmptyServersStateProps {
  onAddServer: () => void;
  className?: string;
}

export function EmptyServersState({ onAddServer, className = '' }: EmptyServersStateProps) {
  return (
    <div
      data-testid="zero-state-banner"
      className={`p-8 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-4 ${className}`}
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
        <Server className="w-6 h-6" />
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-text-main)]">
          No DayZ Servers Registered
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Your DayZ Server Manager control plane is initialized with zero servers. Register your
          first DayZ Dedicated Server instance to manage missions, ports, mods, and supervise
          execution.
        </p>
      </div>
      <div className="pt-2">
        <Button variant="primary" leftIcon={Plus} onClick={onAddServer}>
          Add DayZ Server
        </Button>
      </div>
    </div>
  );
}
