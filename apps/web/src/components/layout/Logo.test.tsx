import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo } from './Logo';

describe('Logo', () => {
  it('renders SVG with custom colors and accessible attributes', () => {
    const { container } = render(
      <Logo mainColor="#ff0000" secondaryColor="#00ff00" className="w-12 h-12" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('aegis-logo', 'w-12', 'h-12');
    expect(container.querySelector('.aegis-logo__tent')).toBeInTheDocument();
    expect(container.querySelector('.aegis-logo__bridge')).toBeInTheDocument();
  });

  it('applies is-loading class when isLoading prop is true', () => {
    const { container } = render(<Logo isLoading />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('aegis-logo', 'is-loading');
  });
});
