import { Suspense } from 'react';

import { Outlet } from '@tanstack/react-router';

import { AppShell } from './AppShell';
import { RootLoader } from './RootFallback';

export function RootLayout() {
  return (
    <Suspense fallback={<RootLoader />}>
      <Outlet />
    </Suspense>
  );
}

export function AuthedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
