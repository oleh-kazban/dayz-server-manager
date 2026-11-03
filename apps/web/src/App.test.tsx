import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App Root Component', () => {
  it('renders root app with providers and router', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
