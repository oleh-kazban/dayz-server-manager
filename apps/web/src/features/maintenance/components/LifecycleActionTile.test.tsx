import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LifecycleActionTile } from './LifecycleActionTile';

describe('LifecycleActionTile', () => {
  it('puts the hint above the control, so controls line up across tiles', () => {
    render(
      <LifecycleActionTile
        title="Stop server"
        description="Shut down through RCON."
        hint="The server is not running."
        hintId="stop-hint"
        action={<button aria-describedby="stop-hint">Stop server</button>}
      />,
    );

    const hint = screen.getByText('The server is not running.');
    const control = screen.getByRole('button', { name: 'Stop server' });
    expect(hint.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(control.parentElement?.nextElementSibling).toBeNull();
    expect(control).toHaveAccessibleDescription('The server is not running.');
  });

  it('renders no hint when the action is available', () => {
    const { container } = render(
      <LifecycleActionTile
        title="Start server"
        description="Launch."
        action={<button>Go</button>}
      />,
    );
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
