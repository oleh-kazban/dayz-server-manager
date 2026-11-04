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
    <main
      className={`flex-1 flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-6 w-full ${className}`}
      {...props}
    >
      <div className="flex-1 space-y-6">{children}</div>
      <Footer className="mt-auto" />
    </main>
  );
}
