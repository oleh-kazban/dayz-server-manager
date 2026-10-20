import type { ReactNode } from 'react';

import { Header } from './Header';
import { Sidebar } from './Sidebar';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-main)] flex flex-col lg:flex-row antialiased">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        {children}
      </div>
    </div>
  );
}
