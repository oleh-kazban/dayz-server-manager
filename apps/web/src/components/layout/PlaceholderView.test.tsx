import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlaceholderView } from './PlaceholderView';

describe('PlaceholderView', () => {
  it('renders title, description and default badge', () => {
    render(
      <PlaceholderView title="Test Feature" description="This is a test feature placeholder." />,
    );

    expect(screen.getByRole('heading', { name: /test feature/i })).toBeInTheDocument();
    expect(screen.getByText(/this is a test feature placeholder/i)).toBeInTheDocument();
    expect(screen.getByText(/planned feature/i)).toBeInTheDocument();
  });

  it('renders custom badge when provided', () => {
    render(
      <PlaceholderView title="Custom Feature" description="Custom desc" badge="In Development" />,
    );

    expect(screen.getByText(/in development/i)).toBeInTheDocument();
  });
});
