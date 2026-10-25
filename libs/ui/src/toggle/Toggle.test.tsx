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
      <Toggle defaultChecked onChange={handleChange} ariaLabel="Maintenance Mode" />,
    );
    const toggle = screen.getByRole('switch', { name: /maintenance mode/i });

    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(1);

    rerender(<Toggle checked={true} onChange={handleChange} ariaLabel="Maintenance Mode" />);
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
      <Toggle checked color="success" ariaLabel="Success Toggle" />,
    );
    expect(
      container.querySelector('.bg-\\[var\\(--color-status-success\\)\\]'),
    ).toBeInTheDocument();

    rerender(<Toggle checked color="danger" ariaLabel="Danger Toggle" />);
    expect(container.querySelector('.bg-\\[var\\(--color-status-danger\\)\\]')).toBeInTheDocument();
  });

  it('supports disabled state and prevents user interactions', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Toggle disabled onChange={handleChange} ariaLabel="Disabled Switch" />);

    const toggle = screen.getByRole('switch', { name: /disabled switch/i });
    expect(toggle).toBeDisabled();

    await user.click(toggle);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('forwards React 19 ref directly to native input switch', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle ref={ref} ariaLabel="Ref Toggle" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });
});
