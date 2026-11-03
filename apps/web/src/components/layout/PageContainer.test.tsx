import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders default container with children and footer', () => {
    render(
      <PageContainer>
        <div data-testid="page-content">Server Dashboard</div>
      </PageContainer>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('flex-1');
  });

  it('renders full-bleed container for map views without standard padding', () => {
    render(
      <PageContainer fullBleed>
        <div data-testid="tactical-map">Tactical Map</div>
      </PageContainer>,
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('overflow-hidden');
    expect(screen.getByTestId('tactical-map')).toBeInTheDocument();
  });
});
