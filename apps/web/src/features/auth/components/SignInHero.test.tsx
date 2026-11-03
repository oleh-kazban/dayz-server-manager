import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SignInHero } from './SignInHero';

describe('SignInHero', () => {
  it('renders decorative hero branding, motto, and security banner', () => {
    render(<SignInHero />);

    expect(screen.getByText('YOUR SERVER. YOUR WORLD.')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Keep your community connected. Manage your servers, players, and everything in between./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('A secure home for your community')).toBeInTheDocument();
    expect(screen.getByText('Access managed by your workspace administrator')).toBeInTheDocument();
  });
});
