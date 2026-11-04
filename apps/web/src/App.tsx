import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { AuthProvider, useAuth } from './features/auth';
import { ThemeProvider } from './features/theme';
import { FeatureFlagsProvider, queryClient, useFeatureFlags } from './core';
import { router } from './router';

function InnerApp() {
  const auth = useAuth();
  const features = useFeatureFlags();

  useEffect(() => {
    router.invalidate();
  }, [auth.isAuthenticated, auth.user]);

  return <RouterProvider router={router} context={{ auth, features }} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <FeatureFlagsProvider>
            <InnerApp />
          </FeatureFlagsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
