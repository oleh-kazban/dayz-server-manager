import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Footer } from './Footer';

export interface PageContainerProps extends ComponentPropsWithoutRef<'main'> {
  children: ReactNode;
  /** Set to true if a view needs full-bleed geometry (e.g. 2D Tactical Map) */
  fullBleed?: boolean;
}

export function PageContainer({
  children,
  fullBleed = false,
  className = '',
  ...props
}: PageContainerProps) {
  if (fullBleed) {
    return (
      <main className={`flex-1 w-full overflow-hidden ${className}`} {...props}>
        {children}
      </main>
    );
  }

  return (
    <main className={`flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full space-y-5 ${className}`} {...props}>
      {children}
      <Footer />
    </main>
  );
}
