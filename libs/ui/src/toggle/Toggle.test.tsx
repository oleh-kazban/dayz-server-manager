import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders switch input with accessible label and description', () => {
    render(
      <Toggle
        id="auto-update"
        label="Auto-Update Mods"
        description="Checks Steam Workshop on schedule"
      />,
    );

    const toggle = screen.getByRole('switch', { name: /auto-update mods/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Checks Steam Workshop on schedule')).toBeInTheDocument();
  });

  it('handles controlled and uncontrolled toggle state changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <Toggle defaultChecked onChange={handleChange} aria-label="Maintenance Mode" />,
    );
    const toggle = screen.getByRole('switch', { name: /maintenance mode/i });

    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(1);

    rerender(<Toggle checked={true} onChange={handleChange} aria-label="Maintenance Mode" />);
    expect(toggle).toBeChecked();
  });

  it('supports label positioning on left and right', () => {
    const { rerender } = render(<Toggle label="Left Label" labelPosition="left" />);
    expect(screen.getByText('Left Label')).toBeInTheDocument();

    rerender(<Toggle label="Right Label" labelPosition="right" />);
    expect(screen.getByText('Right Label')).toBeInTheDocument();
  });

  it('supports color variants: success and danger', () => {
    const { rerender, container } = render(
      <Toggle checked color="success" aria-label="Success Toggle" />,
    );
    expect(
      container.querySelector('.bg-\\[var\\(--color-status-success\\)\\]'),
    ).toBeInTheDocument();

    rerender(<Toggle checked color="danger" aria-label="Danger Toggle" />);
    expect(container.querySelector('.bg-\\[var\\(--color-status-danger\\)\\]')).toBeInTheDocument();
  });

  it('supports disabled state and prevents user interactions', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Toggle disabled onChange={handleChange} aria-label="Disabled Switch" />);

    const toggle = screen.getByRole('switch', { name: /disabled switch/i });
    expect(toggle).toBeDisabled();

    await user.click(toggle);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('forwards React 19 ref directly to native input switch', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle ref={ref} aria-label="Ref Toggle" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('merges external aria-describedby with internal description id or preserves single source', () => {
    const { rerender } = render(
      <Toggle
        id="backup-toggle"
        label="Backups"
        description="Automatic daily backups"
        aria-describedby="external-hint"
      />,
    );

    const toggle = screen.getByRole('switch', { name: /backups/i });
    expect(toggle).toHaveAttribute('aria-describedby', 'external-hint backup-toggle-desc');

    rerender(<Toggle id="backup-toggle" label="Backups" aria-describedby="external-hint" />);
    expect(toggle).toHaveAttribute('aria-describedby', 'external-hint');

    rerender(<Toggle id="backup-toggle" label="Backups" description="Automatic daily backups" />);
    expect(toggle).toHaveAttribute('aria-describedby', 'backup-toggle-desc');

    rerender(<Toggle id="backup-toggle" label="Backups" />);
    expect(toggle).not.toHaveAttribute('aria-describedby');
  });

  it('toggles switch state and invokes onChange when pressing Space key', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Toggle onChange={handleChange} aria-label="Keyboard Toggle" />);
    const toggle = screen.getByRole('switch', { name: /keyboard toggle/i });

    expect(toggle).not.toBeChecked();

    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard(' ');
    expect(toggle).toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(toggle).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(2);
  });
});
