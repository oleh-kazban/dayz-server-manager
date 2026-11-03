import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FlavorText } from './FlavorText';

describe('FlavorText', () => {
  it('renders default compact variant with title and subtitle', () => {
    render(<FlavorText />);

    const titles = screen.getAllByText(/.+/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders hero variant with h1 element', () => {
    const customItem = {
      id: 999,
      title: 'Chernarus Apocalypse',
      subTitle: 'Survival is not guaranteed',
    };

    render(<FlavorText variant="hero" item={customItem} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chernarus Apocalypse');
    expect(screen.getByText('Survival is not guaranteed')).toBeInTheDocument();
  });
});
