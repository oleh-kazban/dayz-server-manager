import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo } from './Logo';

describe('Logo', () => {
  it('renders SVG with custom colors, accessible attributes, and default classes', () => {
    const { container } = render(
      <Logo mainColor="#ff0000" secondaryColor="#00ff00" className="w-12 h-12" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('aegis-logo', 'w-12', 'h-12');
    expect(svg).not.toHaveClass('is-loading');
    expect(svg).not.toHaveClass('animate-on-hover');
    expect(container.querySelector('.aegis-logo__tent')).toBeInTheDocument();
    expect(container.querySelector('.aegis-logo__bridge')).toBeInTheDocument();
  });

  it('applies is-loading class when isLoading prop is true and omits animate-on-hover', () => {
    const { container } = render(<Logo isLoading />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('aegis-logo', 'is-loading');
    expect(svg).not.toHaveClass('animate-on-hover');
  });

  it('applies animate-on-hover class when animateOnHover prop is true and omits is-loading', () => {
    const { container } = render(<Logo animateOnHover />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('aegis-logo', 'animate-on-hover');
    expect(svg).not.toHaveClass('is-loading');
  });

  it('composes both is-loading and animate-on-hover when both props are true', () => {
    const { container } = render(<Logo isLoading animateOnHover className="shrink-0" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('aegis-logo', 'is-loading', 'animate-on-hover', 'shrink-0');
  });
});
