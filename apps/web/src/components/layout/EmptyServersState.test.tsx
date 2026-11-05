import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyServersState } from './EmptyServersState';

describe('EmptyServersState', () => {
  it('renders zero-state iconography, copy, and action button', () => {
    const handleAdd = vi.fn();
    render(<EmptyServersState onAddServer={handleAdd} />);

    expect(screen.getByTestId('zero-state-banner')).toBeInTheDocument();
    expect(screen.getByText('No DayZ Servers Registered')).toBeInTheDocument();
    expect(
      screen.getByText(/Your DayZ Server Manager control plane is initialized with zero servers/i),
    ).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Add DayZ Server/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
