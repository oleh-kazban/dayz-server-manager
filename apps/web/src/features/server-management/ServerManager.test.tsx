import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ServerManager } from './ServerManager';

describe('ServerManager Component', () => {
  it('renders Server management workbench', () => {
    render(<ServerManager />);

    expect(screen.getByRole('heading', { name: /server management/i })).toBeInTheDocument();
    expect(
      screen.getByText(/a healthy world\. a connected community\. everything under control\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chernarus Survival' })).toBeInTheDocument();
  });
});
