import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RootErrorFallback, RootLoader } from './RootFallback';

describe('RootFallback Components', () => {
  it('renders RootLoader with accessible testid and animation', () => {
    render(<RootLoader />);
    expect(screen.getByTestId('root-loader')).toBeInTheDocument();
  });

  it('renders RootErrorFallback with Error object message and handles retry reset', () => {
    const handleReset = vi.fn();
    const testError = new Error('Database connection timeout');

    render(<RootErrorFallback error={testError} reset={handleReset} />);

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('Database connection timeout')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders RootErrorFallback with string error and handles console reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });

    render(<RootErrorFallback error="Fatal runtime boot failure" />);

    expect(screen.getByText('Fatal runtime boot failure')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();

    const reloadBtn = screen.getByRole('button', { name: /Reload Console/i });
    fireEvent.click(reloadBtn);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('renders default message when error is undefined or null', () => {
    render(<RootErrorFallback error={null as never} />);
    expect(screen.getByText('An unexpected routing error occurred.')).toBeInTheDocument();
  });
});
