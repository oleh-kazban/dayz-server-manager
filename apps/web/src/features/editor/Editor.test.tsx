import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Editor } from './Editor';

describe('Editor Component', () => {
  it('renders Types.xml Editor workbench', () => {
    render(<Editor />);

    expect(screen.getByRole('heading', { name: /types\.xml editor/i })).toBeInTheDocument();
    expect(
      screen.getByText(/fine-tune your loot economy\. every item, every spawn, under control\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
