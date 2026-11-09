import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders default application version and flavor text branding without logo', () => {
    const { container } = render(<Footer />);

    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    // REQ-01: Logo must not be rendered in the footer
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders custom version string when provided via prop without logo', () => {
    const { container } = render(<Footer version="v2.0.0-rc.1" />);

    expect(screen.getByText('v2.0.0-rc.1')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('preserves footer layout invariants and allows custom className', () => {
    const { container } = render(<Footer className="custom-footer-class" />);

    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass(
      'flex',
      'flex-col',
      'sm:flex-row',
      'items-center',
      'justify-between',
      'custom-footer-class',
    );
    expect(container.querySelector('svg')).toBeNull();
  });
});
