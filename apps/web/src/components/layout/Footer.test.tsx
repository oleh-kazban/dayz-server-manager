import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders default application version and flavor text branding with logo', () => {
    const { container } = render(<Footer />);

    expect(screen.getByText('v1.4.0')).toBeInTheDocument();
    const logoSvg = container.querySelector('svg');
    expect(logoSvg).toBeInTheDocument();
    expect(logoSvg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders custom version string when provided via prop', () => {
    render(<Footer version="v2.0.0-rc.1" />);

    expect(screen.getByText('v2.0.0-rc.1')).toBeInTheDocument();
  });
});
