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
    expect(svg).toHaveClass('w-12', 'h-12');
  });
});
