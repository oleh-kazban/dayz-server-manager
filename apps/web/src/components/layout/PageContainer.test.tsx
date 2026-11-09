import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageContainer, type PageContainerMaxWidth } from './PageContainer';

describe('PageContainer', () => {
  it('renders default container with children, footer, and full max-width (w-full)', () => {
    render(
      <PageContainer>
        <div data-testid="page-content">Server Dashboard</div>
      </PageContainer>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1', 'flex-col');
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();

    const contentWrapper = screen.getByTestId('page-content').parentElement;
    expect(contentWrapper).toHaveClass('w-full');
  });

  it.each([
    { maxWidth: '5xl' as PageContainerMaxWidth, expectedClass: 'max-w-5xl' },
    { maxWidth: '7xl' as PageContainerMaxWidth, expectedClass: 'max-w-7xl' },
    { maxWidth: 'full' as PageContainerMaxWidth, expectedClass: 'w-full' },
    { maxWidth: 'wide' as PageContainerMaxWidth, expectedClass: 'max-w-[1440px]' },
    {
      maxWidth: 'unrecognized' as unknown as PageContainerMaxWidth,
      expectedClass: 'w-full',
    },
  ])(
    'applies resolved class $expectedClass for maxWidth="$maxWidth"',
    ({ maxWidth, expectedClass }) => {
      render(
        <PageContainer maxWidth={maxWidth}>
          <div data-testid={`content-${maxWidth}`}>Content</div>
        </PageContainer>,
      );

      const contentWrapper = screen.getByTestId(`content-${maxWidth}`).parentElement;
      expect(contentWrapper).toHaveClass(expectedClass);
    },
  );

  it('renders full-bleed container for map views without standard padding or footer', () => {
    render(
      <PageContainer fullBleed className="custom-map-bleed">
        <div data-testid="tactical-map">Tactical Map</div>
      </PageContainer>,
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('overflow-hidden', 'custom-map-bleed');
    expect(screen.getByTestId('tactical-map')).toBeInTheDocument();
    expect(screen.queryByText('v0.1.0')).not.toBeInTheDocument();
  });
});
