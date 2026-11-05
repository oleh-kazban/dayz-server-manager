import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { Toaster } from '@dsm/ui';
import { RootErrorFallback } from '@dsm/web/components';

import { AuthProvider, useAuth } from './features/auth';
import { ThemeProvider } from './features/theme';
import { FeatureFlagsProvider, queryClient, useFeatureFlags } from './core';
import { router } from './router';

import './core/i18n';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error caught by AppErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      return <RootErrorFallback error={this.state.error} reset={this.handleReset} />;
    }
    return this.props.children;
  }
}

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
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Toaster />
          <AuthProvider>
            <FeatureFlagsProvider>
              <InnerApp />
            </FeatureFlagsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
