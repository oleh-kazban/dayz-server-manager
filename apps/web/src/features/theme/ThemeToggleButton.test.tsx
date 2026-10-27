import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from './ThemeProvider';
import { ThemeToggleButton } from './ThemeToggleButton';

describe('ThemeToggleButton', () => {
  it('renders toggle button and switches theme on click', () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: /Switch to dark theme/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByRole('button', { name: /Switch to light theme/i })).toBeInTheDocument();
  });
});
