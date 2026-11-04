import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { FeatureFlagsProvider, queryClient, useFeatureFlags } from './core';
import { AuthProvider, ThemeProvider, useAuth } from './features';
import { router } from './router';

function InnerApp() {
  const auth = useAuth();
  const features = useFeatureFlags();
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
