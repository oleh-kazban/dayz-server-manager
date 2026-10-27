import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders timezone metadata and flavor text', () => {
    render(<Footer />);

    expect(screen.getByText(/EU-CENTRAL-1 \/ UTC \+02:00/i)).toBeInTheDocument();
  });
});
