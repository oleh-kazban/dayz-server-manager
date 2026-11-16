import { Suspense } from 'react';

import { Outlet } from '@tanstack/react-router';

import { RealtimeProvider, UnsavedChangesProvider } from '@aegis/web/core';

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
    <RealtimeProvider>
      <UnsavedChangesProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </UnsavedChangesProvider>
    </RealtimeProvider>
  );
}
