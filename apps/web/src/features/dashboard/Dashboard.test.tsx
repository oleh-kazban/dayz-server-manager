import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dashboard } from './Dashboard';

describe('Dashboard Component', () => {
  it('renders all sections and metrics of server overview', () => {
    render(<Dashboard />);

    expect(screen.getByRole('heading', { name: /server overview/i })).toBeInTheDocument();
    expect(screen.getByText('Chernarus Survival')).toBeInTheDocument();
    expect(screen.getByText('Players online')).toBeInTheDocument();
    expect(screen.getByText('Average latency')).toBeInTheDocument();
    expect(screen.getByText('Server FPS')).toBeInTheDocument();
    expect(screen.getAllByText('Unique players').length).toBeGreaterThan(0);
    expect(screen.getByText('Player activity')).toBeInTheDocument();
    expect(screen.getByText('Players by region')).toBeInTheDocument();
    expect(screen.getByText('Server performance')).toBeInTheDocument();
    expect(screen.getByText('Recent events')).toBeInTheDocument();
    expect(screen.getByText('Server logs')).toBeInTheDocument();
  });
});
